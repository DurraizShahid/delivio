import { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Order, OrderStatus } from "@delivio/types";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";
import { api, wsClient } from "@/lib/api";

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: colors.warning,
  accepted_by_vendor: "#3B82F6",
  preparing: "#8B5CF6",
  ready: colors.success,
  picked_up: "#06B6D4",
  delivered: colors.mutedForeground,
  cancelled: colors.destructive,
  scheduled: "#F59E0B",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  accepted_by_vendor: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  picked_up: "Picked Up",
  delivered: "Delivered",
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

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "accepted_by_vendor",
  accepted_by_vendor: "preparing",
  preparing: "ready",
};

const NEXT_LABELS: Partial<Record<OrderStatus, string>> = {
  pending: "Accept Order",
  accepted_by_vendor: "Start Preparing",
  preparing: "Mark Ready",
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ["vendor-order", id],
    queryFn: () => api.orders.get(id!) as Promise<Order>,
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => api.orders.updateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-order", id] });
      queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
    },
    onError: () => Alert.alert("Error", "Failed to update order status."),
  });

  useEffect(() => {
    wsClient.connect();
    const unsub = wsClient.subscribe("order:status_changed", (e) => {
      if (e.orderId === id) {
        queryClient.invalidateQueries({ queryKey: ["vendor-order", id] });
      }
    });
    return () => { unsub(); };
  }, [id, queryClient]);

  if (isLoading || !order) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const nextStatus = NEXT_STATUS[order.status];
  const nextLabel = NEXT_LABELS[order.status];

  return (
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

        {nextStatus && nextLabel && (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => statusMutation.mutate(nextStatus)}
            disabled={statusMutation.isPending}
            activeOpacity={0.8}
          >
            {statusMutation.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.primaryBtnText}>{nextLabel}</Text>
            )}
          </TouchableOpacity>
        )}

        {order.status === "pending" && (
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={() =>
              Alert.alert("Reject Order", "Are you sure?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Reject",
                  style: "destructive",
                  onPress: () =>
                    api.orders
                      .cancel(id!, { reason: "Rejected by vendor" })
                      .then(() => {
                        queryClient.invalidateQueries({ queryKey: ["vendor-order", id] });
                        queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
                      }),
                },
              ])
            }
            activeOpacity={0.8}
          >
            <Text style={styles.dangerBtnText}>Reject Order</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
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
});
