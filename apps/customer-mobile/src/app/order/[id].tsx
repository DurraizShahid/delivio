import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { api, wsClient } from "@/lib/api";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";
import type { Order, OrderItem, OrderStatus } from "@delivio/types";

const ORDER_STEPS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: "pending", label: "Placed", icon: "receipt-outline" },
  { status: "accepted_by_vendor", label: "Accepted", icon: "checkmark-circle-outline" },
  { status: "preparing", label: "Preparing", icon: "restaurant-outline" },
  { status: "ready", label: "Ready", icon: "bag-check-outline" },
  { status: "picked_up", label: "Picked Up", icon: "bicycle-outline" },
  { status: "delivered", label: "Delivered", icon: "home-outline" },
];

function getStepIndex(status: OrderStatus) {
  if (status === "cancelled") return -1;
  if (status === "scheduled") return 0;
  return ORDER_STEPS.findIndex((s) => s.status === status);
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [liveStatus, setLiveStatus] = useState<OrderStatus | null>(null);

  const { data: order, isLoading } = useQuery<Order & { items: OrderItem[] }>({
    queryKey: ["order", id],
    queryFn: () => api.orders.get(id!),
    enabled: !!id,
  });

  useEffect(() => {
    wsClient.connect();
    const unsub = wsClient.subscribe("order:status_changed", (event) => {
      if (event.orderId === id) {
        setLiveStatus(event.status);
        queryClient.invalidateQueries({ queryKey: ["order", id] });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      }
    });
    return () => {
      unsub();
    };
  }, [id]);

  const currentStatus = liveStatus || order?.status;
  const stepIndex = currentStatus ? getStepIndex(currentStatus) : -1;
  const isCancelled = currentStatus === "cancelled";

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
          {isCancelled ? (
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
});
