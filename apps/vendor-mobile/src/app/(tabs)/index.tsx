import { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
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

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatSlaCountdown(slaDeadline: string): string {
  const diff = new Date(slaDeadline).getTime() - Date.now();
  if (diff <= 0) return "Overdue";
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs >= 1) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
}

export default function OrdersDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [acceptOrderId, setAcceptOrderId] = useState<string | null>(null);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState("15");

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["vendor-orders"],
    queryFn: () => api.orders.list({ limit: 50 }) as Promise<Order[]>,
    refetchInterval: 15_000,
  });

  const acceptMutation = useMutation({
    mutationFn: ({ id, prepTime }: { id: string; prepTime: number }) =>
      api.orders.accept(id, prepTime),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
      setAcceptOrderId(null);
    },
    onError: () => Alert.alert("Error", "Failed to accept order."),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.orders.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
      setRejectOrderId(null);
      setRejectReason("");
    },
    onError: () => Alert.alert("Error", "Failed to reject order."),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.orders.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendor-orders"] }),
    onError: () => Alert.alert("Error", "Failed to update order status."),
  });

  useEffect(() => {
    wsClient.connect();
    const unsub = wsClient.subscribe("order:status_changed", () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
    });
    return () => {
      unsub();
    };
  }, [queryClient]);

  const handleAccept = useCallback(
    (id: string) => {
      setAcceptOrderId(id);
      setPrepTimeMinutes("15");
    },
    [],
  );

  const handleAcceptConfirm = useCallback(() => {
    if (!acceptOrderId) return;
    const prep = parseInt(prepTimeMinutes, 10);
    const validPrep = Number.isNaN(prep) || prep < 1 ? 15 : Math.min(prep, 120);
    acceptMutation.mutate({ id: acceptOrderId, prepTime: validPrep });
  }, [acceptOrderId, prepTimeMinutes, acceptMutation]);

  const handleReject = useCallback((id: string) => {
    setRejectOrderId(id);
    setRejectReason("");
  }, []);

  const handleRejectConfirm = useCallback(() => {
    if (!rejectOrderId) return;
    rejectMutation.mutate({ id: rejectOrderId, reason: rejectReason || "Rejected by vendor" });
  }, [rejectOrderId, rejectReason, rejectMutation]);

  const handleStartPreparing = useCallback(
    (id: string) => statusMutation.mutate({ id, status: "preparing" }),
    [statusMutation],
  );

  const handleMarkReady = useCallback(
    (id: string) => statusMutation.mutate({ id, status: "ready" }),
    [statusMutation],
  );

  const renderOrder = ({ item }: { item: Order }) => {
    const isPlaced = item.status === "placed";
    const isAccepted = item.status === "accepted";
    const isPreparing = item.status === "preparing";
    const showSla = item.slaDeadline && ["accepted", "preparing"].includes(item.status);

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => router.push(`/order/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>#{item.id.slice(0, 8)}</Text>
          <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] + "1A" }]}>
            <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] }]}>
              {STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>

        <View style={styles.orderMeta}>
          <Text style={styles.metaText}>{formatCents(item.totalCents)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{item.items?.length ?? 0} items</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{timeAgo(item.createdAt)}</Text>
        </View>

        {showSla && item.slaDeadline && (
          <View style={styles.slaRow}>
            <Text style={styles.slaLabel}>SLA:</Text>
            <Text
              style={[
                styles.slaValue,
                item.slaBreached ? { color: colors.destructive } : undefined,
              ]}
            >
              {formatSlaCountdown(item.slaDeadline)}
            </Text>
          </View>
        )}

        {isPlaced && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => handleAccept(item.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.acceptBtnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => handleReject(item.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {isAccepted && (
          <TouchableOpacity
            style={styles.readyBtn}
            onPress={() => handleStartPreparing(item.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.readyBtnText}>Start Preparing</Text>
          </TouchableOpacity>
        )}

        {isPreparing && (
          <TouchableOpacity
            style={styles.readyBtn}
            onPress={() => handleMarkReady(item.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.readyBtnText}>Mark Ready</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Text style={styles.screenTitle}>Orders</Text>
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(o) => o.id}
            renderItem={renderOrder}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No orders yet</Text>
                <Text style={styles.emptySubtext}>New orders will appear here in real time</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>

      {/* Accept modal - prep time input */}
      <Modal
        visible={!!acceptOrderId}
        transparent
        animationType="fade"
        onRequestClose={() => setAcceptOrderId(null)}
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
                onPress={() => setAcceptOrderId(null)}
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

      {/* Reject modal - reason input */}
      <Modal
        visible={!!rejectOrderId}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectOrderId(null)}
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
                  setRejectOrderId(null);
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
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  screenTitle: {
    fontSize: fontSize["2xl"],
    fontWeight: "700",
    color: colors.foreground,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  orderCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  orderId: { fontSize: fontSize.base, fontWeight: "600", color: colors.foreground },
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeText: { fontSize: fontSize.xs, fontWeight: "600" },
  orderMeta: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
  metaText: { fontSize: fontSize.sm, color: colors.mutedForeground },
  metaDot: { fontSize: fontSize.sm, color: colors.mutedForeground, marginHorizontal: spacing.xs },
  slaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  slaLabel: { fontSize: fontSize.xs, color: colors.mutedForeground },
  slaValue: { fontSize: fontSize.sm, fontWeight: "600", color: colors.warning },
  actions: { flexDirection: "row", gap: spacing.sm },
  acceptBtn: {
    flex: 1,
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
  },
  acceptBtnText: { color: "#FFF", fontWeight: "600", fontSize: fontSize.sm },
  rejectBtn: {
    flex: 1,
    backgroundColor: colors.destructive + "14",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
  },
  rejectBtnText: { color: colors.destructive, fontWeight: "600", fontSize: fontSize.sm },
  readyBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
  },
  readyBtnText: { color: colors.primaryForeground, fontWeight: "600", fontSize: fontSize.sm },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyText: { fontSize: fontSize.lg, fontWeight: "600", color: colors.foreground, marginBottom: spacing.xs },
  emptySubtext: { fontSize: fontSize.sm, color: colors.mutedForeground },
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
