import { useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
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

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function OrdersDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["vendor-orders"],
    queryFn: () => api.orders.list({ limit: 50 }) as Promise<Order[]>,
    refetchInterval: 15_000,
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
    (id: string) => statusMutation.mutate({ id, status: "accepted_by_vendor" }),
    [statusMutation],
  );

  const handleReject = useCallback(
    (id: string) => {
      Alert.alert("Reject Order", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => api.orders.cancel(id, { reason: "Rejected by vendor" })
            .then(() => queryClient.invalidateQueries({ queryKey: ["vendor-orders"] })),
        },
      ]);
    },
    [queryClient],
  );

  const handleMarkReady = useCallback(
    (id: string) => statusMutation.mutate({ id, status: "ready" }),
    [statusMutation],
  );

  const renderOrder = ({ item }: { item: Order }) => {
    const isPending = item.status === "pending";
    const isPreparing = item.status === "preparing" || item.status === "accepted_by_vendor";

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

        {isPending && (
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.screenTitle}>Orders</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
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
});
