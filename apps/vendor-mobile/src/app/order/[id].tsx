import { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Order, OrderStatus } from "@delivio/types";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";
import { api, wsClient } from "@/lib/api";

const STATUS_COLORS: Record<OrderStatus, string> = {
  placed: colors.warning,
  accepted: "#3B82F6",
  rejected: colors.destructive,
  preparing: "#8B5CF6",
  ready: colors.success,
  assigned: "#06B6D4",
  picked_up: "#06B6D4",
  arrived: "#06B6D4",
  completed: colors.mutedForeground,
  cancelled: colors.destructive,
  scheduled: "#F59E0B",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Placed",
  accepted: "Accepted",
  rejected: "Rejected",
  preparing: "Preparing",
  ready: "Ready",
  assigned: "Assigned",
  picked_up: "Picked Up",
  arrived: "Arrived",
  completed: "Completed",
  cancelled: "Cancelled",
  scheduled: "Scheduled",
};

function formatCents(cents: number) {
  return `£${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSlaCountdown(slaDeadline: string): string {
  const diff = new Date(slaDeadline).getTime() - Date.now();
  if (diff <= 0) return "Overdue";
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs >= 1) return `${hrs}h ${mins % 60}m left`;
  return `${mins}m left`;
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState("15");
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState("15");
  const [externalName, setExternalName] = useState("");
  const [externalPhone, setExternalPhone] = useState("");
  const [showExternalModal, setShowExternalModal] = useState(false);

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ["vendor-order", id],
    queryFn: () => api.orders.get(id!) as Promise<Order>,
    enabled: !!id,
  });

  const acceptMutation = useMutation({
    mutationFn: (prepTime: number) => api.orders.accept(id!, prepTime),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-order", id] });
      queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
      setShowAcceptModal(false);
    },
    onError: () => Alert.alert("Error", "Failed to accept order."),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => api.orders.reject(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-order", id] });
      queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
      setShowRejectModal(false);
      setRejectReason("");
    },
    onError: () => Alert.alert("Error", "Failed to reject order."),
  });

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => api.orders.updateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-order", id] });
      queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
    },
    onError: () => Alert.alert("Error", "Failed to update order status."),
  });

  const extendSlaMutation = useMutation({
    mutationFn: (minutes: number) => api.orders.extendSla(id!, minutes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-order", id] });
      setShowExtendModal(false);
      setExtendMinutes("15");
    },
    onError: () => Alert.alert("Error", "Failed to extend SLA."),
  });

  const reassignMutation = useMutation({
    mutationFn: (deliveryId: string) => api.deliveries.reassign(deliveryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-order", id] });
    },
    onError: () => Alert.alert("Error", "Failed to reassign rider."),
  });

  const assignExternalMutation = useMutation({
    mutationFn: (params: { deliveryId: string; name: string; phone: string }) =>
      api.deliveries.assignExternal(params.deliveryId, { name: params.name, phone: params.phone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-order", id] });
      setShowExternalModal(false);
      setExternalName("");
      setExternalPhone("");
    },
    onError: () => Alert.alert("Error", "Failed to assign external rider."),
  });

  useEffect(() => {
    wsClient.connect();
    const unsub = wsClient.subscribe("order:status_changed", (e) => {
      if (e.orderId === id) {
        queryClient.invalidateQueries({ queryKey: ["vendor-order", id] });
      }
    });
    return () => {
      unsub();
    };
  }, [id, queryClient]);

  const handleAcceptConfirm = useCallback(() => {
    const prep = parseInt(prepTimeMinutes, 10);
    const validPrep = Number.isNaN(prep) || prep < 1 ? 15 : Math.min(prep, 120);
    acceptMutation.mutate(validPrep);
  }, [prepTimeMinutes, acceptMutation]);

  const handleRejectConfirm = useCallback(() => {
    rejectMutation.mutate(rejectReason || "Rejected by vendor");
  }, [rejectReason, rejectMutation]);

  if (isLoading || !order) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const isPlaced = order.status === "placed";
  const isAccepted = order.status === "accepted";
  const isPreparing = order.status === "preparing";
  const showSla = order.slaDeadline && ["accepted", "preparing"].includes(order.status);
  const delivery = order.delivery;
  const hasDelivery = !!delivery;

  return (
    <>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order #{order.id.slice(0, 8)}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.statusRow}>
            <View style={[styles.badge, { backgroundColor: STATUS_COLORS[order.status] + "1A" }]}>
              <Text style={[styles.badgeText, { color: STATUS_COLORS[order.status] }]}>
                {STATUS_LABELS[order.status]}
              </Text>
            </View>
            <Text style={styles.dateText}>{formatDate(order.createdAt)}</Text>
          </View>

          {showSla && order.slaDeadline && (
            <View style={[styles.card, styles.slaCard]}>
              <Text style={styles.slaLabel}>SLA Deadline</Text>
              <Text
                style={[
                  styles.slaValue,
                  order.slaBreached ? { color: colors.destructive } : undefined,
                ]}
              >
                {formatSlaCountdown(order.slaDeadline)}
              </Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Items</Text>
            {order.items && order.items.length > 0 ? (
              order.items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>
                      {item.quantity}× {item.name}
                    </Text>
                  </View>
                  <Text style={styles.itemPrice}>
                    {formatCents(item.unitPriceCents * item.quantity)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noItems}>No item details available</Text>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCents(order.totalCents)}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Customer</Text>
              <Text style={styles.detailValue}>{order.customerId.slice(0, 12)}…</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment</Text>
              <Text style={styles.detailValue}>{order.paymentStatus}</Text>
            </View>
            {order.scheduledFor && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Scheduled</Text>
                <Text style={styles.detailValue}>{formatDate(order.scheduledFor)}</Text>
              </View>
            )}
          </View>

          {hasDelivery && delivery && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Delivery</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={styles.detailValue}>{delivery.status}</Text>
              </View>
              {delivery.riderId && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Rider</Text>
                  <Text style={styles.detailValue}>{delivery.riderId.slice(0, 12)}…</Text>
                </View>
              )}
              {delivery.id && (order.deliveryMode === "vendor_rider" || !delivery.riderId) && (
                <TouchableOpacity
                  style={styles.assignRiderBtn}
                  onPress={() => router.push(`/assign-rider/${delivery.id}`)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.assignRiderBtnText}>Assign Rider</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {isPlaced && (
            <>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setShowAcceptModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>Accept Order</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dangerBtn}
                onPress={() => setShowRejectModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.dangerBtnText}>Reject Order</Text>
              </TouchableOpacity>
            </>
          )}

          {isAccepted && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => statusMutation.mutate("preparing")}
              disabled={statusMutation.isPending}
              activeOpacity={0.8}
            >
              {statusMutation.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.primaryBtnText}>Start Preparing</Text>
              )}
            </TouchableOpacity>
          )}

          {isPreparing && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => statusMutation.mutate("ready")}
              disabled={statusMutation.isPending}
              activeOpacity={0.8}
            >
              {statusMutation.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.primaryBtnText}>Mark Ready</Text>
              )}
            </TouchableOpacity>
          )}

          {(isAccepted || isPreparing) && order.slaDeadline && (
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => setShowExtendModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="timer-outline" size={18} color={colors.primary} />
              <Text style={styles.outlineBtnText}>Extend Time</Text>
            </TouchableOpacity>
          )}

          {delivery?.riderId && (delivery.status === "assigned" || delivery.status === "picked_up") && (
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => {
                Alert.alert("Reassign Rider", "Are you sure you want to reassign this delivery?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Reassign", onPress: () => reassignMutation.mutate(delivery.id) },
                ]);
              }}
              disabled={reassignMutation.isPending}
              activeOpacity={0.8}
            >
              {reassignMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="swap-horizontal-outline" size={18} color={colors.primary} />
                  <Text style={styles.outlineBtnText}>Reassign Rider</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {order.deliveryMode === "vendor_rider" && delivery && (
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => setShowExternalModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add-outline" size={18} color={colors.primary} />
              <Text style={styles.outlineBtnText}>Assign External Rider</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Accept modal */}
      <Modal
        visible={showAcceptModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAcceptModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalContent}
          >
            <Text style={styles.modalTitle}>Accept Order</Text>
            <Text style={styles.modalLabel}>Prep time (minutes)</Text>
            <TextInput
              style={styles.input}
              value={prepTimeMinutes}
              onChangeText={setPrepTimeMinutes}
              keyboardType="number-pad"
              placeholder="15"
              placeholderTextColor={colors.mutedForeground}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAcceptModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleAcceptConfirm}
                disabled={acceptMutation.isPending}
                activeOpacity={0.8}
              >
                {acceptMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Accept</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Reject modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalContent}
          >
            <Text style={styles.modalTitle}>Reject Order</Text>
            <Text style={styles.modalLabel}>Reason (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g. Out of stock, closed"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: colors.destructive }]}
                onPress={handleRejectConfirm}
                disabled={rejectMutation.isPending}
                activeOpacity={0.8}
              >
                {rejectMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Extend SLA modal */}
      <Modal
        visible={showExtendModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExtendModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalContent}
          >
            <Text style={styles.modalTitle}>Extend Prep Time</Text>
            <Text style={styles.modalLabel}>Additional minutes</Text>
            <TextInput
              style={styles.input}
              value={extendMinutes}
              onChangeText={setExtendMinutes}
              keyboardType="number-pad"
              placeholder="15"
              placeholderTextColor={colors.mutedForeground}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowExtendModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => {
                  const mins = parseInt(extendMinutes, 10);
                  extendSlaMutation.mutate(Number.isNaN(mins) || mins < 1 ? 15 : mins);
                }}
                disabled={extendSlaMutation.isPending}
                activeOpacity={0.8}
              >
                {extendSlaMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Extend</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Assign External Rider modal */}
      <Modal
        visible={showExternalModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExternalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalContent}
          >
            <Text style={styles.modalTitle}>Assign External Rider</Text>
            <Text style={styles.modalLabel}>Rider name</Text>
            <TextInput
              style={styles.input}
              value={externalName}
              onChangeText={setExternalName}
              placeholder="e.g. John"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={styles.modalLabel}>Rider phone</Text>
            <TextInput
              style={styles.input}
              value={externalPhone}
              onChangeText={setExternalPhone}
              placeholder="e.g. +44 7700 900000"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowExternalModal(false);
                  setExternalName("");
                  setExternalPhone("");
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  (!externalName.trim() || !externalPhone.trim()) && { opacity: 0.5 },
                ]}
                onPress={() => {
                  if (!order?.delivery) return;
                  assignExternalMutation.mutate({
                    deliveryId: order.delivery.id,
                    name: externalName.trim(),
                    phone: externalPhone.trim(),
                  });
                }}
                disabled={assignExternalMutation.isPending || !externalName.trim() || !externalPhone.trim()}
                activeOpacity={0.8}
              >
                {assignExternalMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Assign</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: fontSize.lg, fontWeight: "600", color: colors.foreground },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  badge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.full },
  badgeText: { fontSize: fontSize.sm, fontWeight: "600" },
  dateText: { fontSize: fontSize.sm, color: colors.mutedForeground },
  slaCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  slaLabel: { fontSize: fontSize.sm, color: colors.mutedForeground },
  slaValue: { fontSize: fontSize.sm, fontWeight: "600", color: colors.warning },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: fontSize.base, color: colors.foreground },
  itemPrice: { fontSize: fontSize.sm, fontWeight: "600", color: colors.foreground },
  noItems: { fontSize: fontSize.sm, color: colors.mutedForeground, fontStyle: "italic" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  totalLabel: { fontSize: fontSize.base, fontWeight: "700", color: colors.foreground },
  totalValue: { fontSize: fontSize.lg, fontWeight: "700", color: colors.foreground },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { fontSize: fontSize.sm, color: colors.mutedForeground },
  detailValue: { fontSize: fontSize.sm, fontWeight: "500", color: colors.foreground, textTransform: "capitalize" },
  assignRiderBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  assignRiderBtnText: { color: colors.primaryForeground, fontWeight: "600", fontSize: fontSize.sm },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  primaryBtnText: { color: colors.primaryForeground, fontSize: fontSize.base, fontWeight: "600" },
  dangerBtn: {
    backgroundColor: colors.destructive + "0F",
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
  },
  dangerBtnText: { color: colors.destructive, fontSize: fontSize.base, fontWeight: "600" },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  outlineBtnText: { color: colors.primary, fontSize: fontSize.base, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 340,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: "600", color: colors.foreground, marginBottom: spacing.lg },
  modalLabel: { fontSize: fontSize.sm, color: colors.mutedForeground, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.base,
    color: colors.foreground,
    marginBottom: spacing.lg,
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: spacing.sm },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: { fontSize: fontSize.base, color: colors.foreground },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderRadius: borderRadius.md,
  },
  modalConfirmText: { color: "#FFF", fontSize: fontSize.base, fontWeight: "600" },
});
