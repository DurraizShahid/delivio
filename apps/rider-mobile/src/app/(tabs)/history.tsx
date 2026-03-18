import { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import type { Delivery, DeliveryStatus } from "@delivio/types";
import { api } from "@/lib/api";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";

const STATUS_COLORS: Record<DeliveryStatus, string> = {
  assigned: colors.warning,
  picked_up: colors.primary,
  delivered: colors.success,
};

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  assigned: "Assigned",
  picked_up: "Picked Up",
  delivered: "Delivered",
};

export default function HistoryScreen() {
  const router = useRouter();

  const {
    data: deliveries,
    isLoading,
    refetch,
  } = useQuery<Delivery[]>({
    queryKey: ["deliveries", "history"],
    queryFn: () => api.deliveries.list({ status: "delivered" }),
  });

  const renderItem = useCallback(
    ({ item }: { item: Delivery }) => (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/delivery/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>Order #{item.orderId.slice(0, 8)}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: STATUS_COLORS[item.status] + "18" },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: STATUS_COLORS[item.status] },
              ]}
            >
              {STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>

        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>

        <View style={styles.earningsRow}>
          <Text style={styles.earningsLabel}>Earnings</Text>
          <Text style={styles.earningsValue}>—</Text>
        </View>
      </TouchableOpacity>
    ),
    [router],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.heading}>Delivery History</Text>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={deliveries}
          keyExtractor={(d) => d.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No deliveries yet</Text>
              <Text style={styles.emptySubtext}>
                Completed deliveries will appear here
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  heading: {
    fontSize: fontSize["2xl"],
    fontWeight: "700",
    color: colors.foreground,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  orderId: { fontSize: fontSize.base, fontWeight: "600", color: colors.foreground },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: { fontSize: fontSize.xs, fontWeight: "600" },
  date: { fontSize: fontSize.sm, color: colors.mutedForeground, marginBottom: spacing.sm },
  earningsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  earningsLabel: { fontSize: fontSize.sm, color: colors.mutedForeground },
  earningsValue: { fontSize: fontSize.sm, fontWeight: "600", color: colors.foreground },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80 },
  emptyText: { fontSize: fontSize.lg, fontWeight: "600", color: colors.foreground },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
    textAlign: "center",
  },
});
