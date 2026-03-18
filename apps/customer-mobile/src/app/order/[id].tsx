import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { api, wsClient } from "@/lib/api";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";
import type { Order, OrderItem, OrderStatus } from "@delivio/types";

const ORDER_STEPS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: "placed", label: "Placed", icon: "receipt-outline" },
  { status: "accepted", label: "Accepted", icon: "checkmark-circle-outline" },
  { status: "preparing", label: "Preparing", icon: "restaurant-outline" },
  { status: "ready", label: "Ready", icon: "bag-check-outline" },
  { status: "assigned", label: "Assigned", icon: "person-outline" },
  { status: "picked_up", label: "Picked Up", icon: "bicycle-outline" },
  { status: "arrived", label: "Arrived", icon: "location-outline" },
  { status: "completed", label: "Completed", icon: "home-outline" },
];

function getStepIndex(status: OrderStatus) {
  if (status === "cancelled") return -1;
  if (status === "rejected") return -1;
  if (status === "scheduled") return 0;
  return ORDER_STEPS.findIndex((s) => s.status === status);
}

function formatPrice(cents: number) {
  return `£${(cents / 100).toFixed(2)}`;
}

function formatTimeLeft(deadline: string): string {
  const now = new Date().getTime();
  const end = new Date(deadline).getTime();
  const diff = Math.max(0, end - now);
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [liveStatus, setLiveStatus] = useState<OrderStatus | null>(null);
  const [rejectedReasonFromWs, setRejectedReasonFromWs] = useState<string | null>(null);
  const [slaCountdown, setSlaCountdown] = useState<string>("");
  const [vendorRating, setVendorRating] = useState(0);
  const [riderRating, setRiderRating] = useState(0);
  const [comment, setComment] = useState("");
  const [tipAmount, setTipAmount] = useState<number | null>(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const { data: order, isLoading } = useQuery<Order & { items: OrderItem[] }>({
    queryKey: ["order", id],
    queryFn: () => api.orders.get(id!),
    enabled: !!id,
  });

  useEffect(() => {
    wsClient.connect();
    const unsubStatus = wsClient.subscribe("order:status_changed", (event: any) => {
      if (event.orderId === id) {
        setLiveStatus(event.status);
        queryClient.invalidateQueries({ queryKey: ["order", id] });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      }
    });
    const unsubRejected = wsClient.subscribe("order:rejected", (event: any) => {
      if (event.orderId === id) {
        setLiveStatus("rejected");
        setRejectedReasonFromWs(event.reason || null);
        queryClient.invalidateQueries({ queryKey: ["order", id] });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        Alert.alert("Order Rejected", event.reason || "Your order was rejected by the vendor.");
      }
    });
    const unsubDelayed = wsClient.subscribe("order:delayed", (event: any) => {
      if (event.orderId === id) {
        queryClient.invalidateQueries({ queryKey: ["order", id] });
        Alert.alert("Order Delayed", "Your order has been delayed. We'll keep you updated.");
      }
    });
    return () => {
      unsubStatus();
      unsubRejected();
      unsubDelayed();
    };
  }, [id, queryClient]);

  const currentStatus = liveStatus || order?.status;

  useEffect(() => {
    if (!order?.slaDeadline || !currentStatus) return;
    const inCountdown =
      currentStatus === "accepted" || currentStatus === "preparing";
    if (!inCountdown) return;
    const tick = () => setSlaCountdown(formatTimeLeft(order.slaDeadline!));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [order?.slaDeadline, currentStatus]);

  const stepIndex = currentStatus ? getStepIndex(currentStatus) : -1;
  const isCancelled = currentStatus === "cancelled";
  const isRejected = currentStatus === "rejected";
  const isCompleted = currentStatus === "completed";
  const showSla =
    order?.slaDeadline &&
    (currentStatus === "accepted" || currentStatus === "preparing");

  const handleSubmitRating = async () => {
    if (!order) return;
    const vendorId = order.vendorId;
    const riderId = order.delivery?.riderId;
    if (!vendorId && !riderId) return;
    if ((vendorId && vendorRating === 0) || (riderId && riderRating === 0)) {
      Alert.alert("Rating required", "Please rate both food and delivery.");
      return;
    }
    setRatingSubmitting(true);
    try {
      if (vendorId && vendorRating > 0) {
        await api.ratings.create({
          orderId: order.id,
          toUserId: vendorId,
          toRole: "vendor",
          rating: vendorRating,
          comment: comment.trim() || undefined,
        });
      }
      if (riderId && riderRating > 0) {
        await api.ratings.create({
          orderId: order.id,
          toUserId: riderId,
          toRole: "rider",
          rating: riderRating,
          comment: comment.trim() || undefined,
        });
      }
      if (riderId && tipAmount && tipAmount > 0) {
        await api.tips.create({
          orderId: order.id,
          toRiderId: riderId,
          amountCents: tipAmount * 100,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      router.replace("/(tabs)/orders");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit rating");
    } finally {
      setRatingSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: order ? `#${order.id.slice(-8).toUpperCase()}` : "Order",
          headerBackTitle: "Back",
        }}
      />

      {isLoading || !order ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {!isRejected && !isCancelled && (order as any).slaBreached &&
            !["completed", "cancelled", "rejected"].includes(currentStatus ?? "") && (
            <View style={styles.lateBanner}>
              <Ionicons name="warning-outline" size={20} color="#C2410C" />
              <View style={{ flex: 1 }}>
                <Text style={styles.lateBannerTitle}>Order is later than expected</Text>
                <Text style={styles.lateBannerSub}>The restaurant has been notified. Your order will be with you soon.</Text>
              </View>
            </View>
          )}

          {isRejected ? (
            <View style={styles.rejectedBanner}>
              <Ionicons name="close-circle" size={24} color={colors.destructive} />
              <Text style={styles.rejectedText}>Order Rejected</Text>
              {(order.rejectionReason || rejectedReasonFromWs) && (
                <Text style={styles.rejectedReason}>
                  {order.rejectionReason || rejectedReasonFromWs}
                </Text>
              )}
            </View>
          ) : isCancelled ? (
            <View style={styles.cancelledBanner}>
              <Ionicons name="close-circle" size={24} color={colors.destructive} />
              <Text style={styles.cancelledText}>Order Cancelled</Text>
              {order.cancellationReason && (
                <Text style={styles.cancelledReason}>
                  {order.cancellationReason}
                </Text>
              )}
            </View>
          ) : (
            <>
              {showSla && (
                <View style={styles.slaBanner}>
                  <Ionicons name="time-outline" size={20} color={colors.primary} />
                  <Text style={styles.slaText}>
                    Ready in: {slaCountdown}
                  </Text>
                </View>
              )}
              <View style={styles.stepper}>
                {ORDER_STEPS.map((step, i) => {
                  const isCompleted = i <= stepIndex;
                  const isCurrent = i === stepIndex;
                  return (
                    <View key={step.status} style={styles.stepRow}>
                      <View style={styles.stepIndicator}>
                        <View
                          style={[
                            styles.stepDot,
                            isCompleted && styles.stepDotActive,
                            isCurrent && styles.stepDotCurrent,
                          ]}
                        >
                          {isCompleted && (
                            <Ionicons
                              name={
                                isCurrent
                                  ? (step.icon as any)
                                  : "checkmark"
                              }
                              size={isCurrent ? 16 : 14}
                              color={colors.primaryForeground}
                            />
                          )}
                        </View>
                        {i < ORDER_STEPS.length - 1 && (
                          <View
                            style={[
                              styles.stepLine,
                              isCompleted && i < stepIndex && styles.stepLineActive,
                            ]}
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.stepLabel,
                          isCompleted && styles.stepLabelActive,
                          isCurrent && styles.stepLabelCurrent,
                        ]}
                      >
                        {step.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {(currentStatus === "ready" || (currentStatus === "assigned" && !order.delivery?.riderId)) && (
            <View style={styles.searchingBanner}>
              <View style={styles.pulsingDot} />
              <Text style={styles.searchingText}>Searching for a rider near you...</Text>
            </View>
          )}

          {order.delivery?.isExternal && (
            <View style={styles.externalRiderCard}>
              <Text style={styles.externalRiderName}>
                Your rider: {order.delivery.externalRiderName}
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${order.delivery?.externalRiderPhone}`)}
                activeOpacity={0.7}
              >
                <Text style={styles.externalRiderPhone}>
                  Call: {order.delivery.externalRiderPhone}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items</Text>
            {order.items?.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemQty}>{item.quantity}x</Text>
                  <Text style={styles.itemName}>{item.name}</Text>
                </View>
                <Text style={styles.itemPrice}>
                  {formatPrice(item.unitPriceCents * item.quantity)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.totalCard}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatPrice(order.totalCents)}
              </Text>
            </View>
          </View>

          {!isRejected && !isCancelled && (
            <View style={styles.chatSection}>
              <TouchableOpacity
                style={styles.chatBtn}
                onPress={() => router.push(`/rate/${order.id}`)}
                activeOpacity={0.7}
              >
                <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                <Text style={styles.chatBtnText}>Chat with Restaurant</Text>
              </TouchableOpacity>
              {order.delivery?.riderId && (
                <TouchableOpacity
                  style={styles.chatBtn}
                  onPress={() => router.push(`/rate/${order.id}`)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call-outline" size={18} color={colors.primary} />
                  <Text style={styles.chatBtnText}>Chat with Rider</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {isCompleted && (
            <View style={styles.ratingSection}>
              <Text style={styles.ratingTitle}>Rate Your Experience</Text>

              <Text style={styles.ratingSubtitle}>Food / Vendor</Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setVendorRating(n)}
                    style={styles.starButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={n <= vendorRating ? "star" : "star-outline"}
                      size={28}
                      color={n <= vendorRating ? colors.warning : colors.mutedForeground}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.ratingSubtitle}>Delivery / Rider</Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setRiderRating(n)}
                    style={styles.starButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={n <= riderRating ? "star" : "star-outline"}
                      size={28}
                      color={n <= riderRating ? colors.warning : colors.mutedForeground}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.ratingSubtitle}>Comment (optional)</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="How was your order?"
                placeholderTextColor={colors.mutedForeground}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.ratingSubtitle}>Tip for rider (optional)</Text>
              <View style={styles.tipRow}>
                {[1, 2, 5].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={[
                      styles.tipButton,
                      tipAmount === amount && styles.tipButtonActive,
                    ]}
                    onPress={() => setTipAmount(tipAmount === amount ? null : amount)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tipText, tipAmount === amount && styles.tipTextActive]}>
                      £{amount}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.submitButton, ratingSubmitting && styles.buttonDisabled]}
                onPress={handleSubmitRating}
                disabled={ratingSubmitting}
                activeOpacity={0.8}
              >
                {ratingSubmitting ? (
                  <ActivityIndicator color={colors.primaryForeground} size="small" />
                ) : (
                  <Text style={styles.submitText}>Submit</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rateLink}
                onPress={() => router.push(`/rate/${order.id}`)}
                activeOpacity={0.7}
              >
                <Text style={styles.rateLinkText}>
                  Want to add a custom tip? Rate in full screen
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  rejectedBanner: {
    backgroundColor: colors.destructive + "15",
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.destructive + "40",
  },
  rejectedText: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.destructive,
  },
  rejectedReason: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  cancelledBanner: {
    backgroundColor: colors.destructive + "10",
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  cancelledText: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.destructive,
  },
  cancelledReason: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  slaBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary + "12",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  slaText: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.primary,
  },
  stepper: {
    marginBottom: spacing.xl,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stepIndicator: {
    alignItems: "center",
    width: 32,
    marginRight: spacing.md,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.muted,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepDotCurrent: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    transform: [{ scale: 1.1 }],
  },
  stepLine: {
    width: 2,
    height: 24,
    backgroundColor: colors.border,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  stepLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    paddingTop: spacing.xs,
    fontWeight: "500",
  },
  stepLabelActive: {
    color: colors.foreground,
  },
  stepLabelCurrent: {
    color: colors.foreground,
    fontWeight: "700",
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
  },
  itemQty: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.mutedForeground,
    width: 28,
  },
  itemName: {
    fontSize: fontSize.base,
    color: colors.foreground,
    flex: 1,
  },
  itemPrice: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  totalCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.foreground,
  },
  totalValue: {
    fontSize: fontSize.xl,
    fontWeight: "800",
    color: colors.foreground,
  },
  ratingSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ratingTitle: {
    fontSize: fontSize.xl,
    fontWeight: "800",
    color: colors.foreground,
    marginBottom: spacing.lg,
  },
  ratingSubtitle: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  starRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  starButton: {
    padding: spacing.xs,
  },
  commentInput: {
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.foreground,
    minHeight: 80,
    textAlignVertical: "top",
  },
  tipRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  tipButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
  },
  tipButtonActive: {
    backgroundColor: colors.primary,
  },
  tipText: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  tipTextActive: {
    color: colors.primaryForeground,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: "700",
  },
  rateLink: {
    marginTop: spacing.md,
    alignItems: "center",
  },
  rateLinkText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: "600",
  },
  searchingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "#EFF6FF",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  pulsingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3B82F6",
    opacity: 0.8,
  },
  searchingText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: "#1D4ED8",
    flex: 1,
  },
  externalRiderCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  externalRiderName: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  externalRiderPhone: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: "500",
  },
  lateBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "#FFF7ED",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: "#FDBA74",
  },
  lateBannerTitle: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: "#9A3412",
  },
  lateBannerSub: {
    fontSize: fontSize.xs,
    color: "#C2410C",
    marginTop: 2,
  },
  chatSection: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
  },
  chatBtnText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primary,
  },
});
