import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";
import type { Order, OrderStatus } from "@delivio/types";

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: colors.warning },
  accepted_by_vendor: { label: "Accepted", color: "#3B82F6" },
  preparing: { label: "Preparing", color: "#8B5CF6" },
  ready: { label: "Ready", color: "#06B6D4" },
  picked_up: { label: "Picked Up", color: "#3B82F6" },
  delivered: { label: "Delivered", color: colors.success },
  cancelled: { label: "Cancelled", color: colors.destructive },
  scheduled: { label: "Scheduled", color: colors.mutedForeground },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function OrdersScreen() {
  const router = useRouter();

  const {
    data: orders,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => api.orders.list({ limit: 50 }),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.title}>Orders</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
      </View>

      {!orders?.length ? (
        <View style={styles.center}>
          <Ionicons
            name="receipt-outline"
            size={48}
            color={colors.mutedForeground}
          />
          <Text style={styles.emptyText}>No orders yet</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          renderItem={({ item }) => {
            const config = STATUS_CONFIG[item.status];
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => router.push(`/order/${item.id}`)}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.orderId} numberOfLines={1}>
                    #{item.id.slice(-8).toUpperCase()}
                  </Text>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: config.color + "18" },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: config.color }]}>
                      {config.label}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardBottom}>
                  <Text style={styles.price}>
                    {formatPrice(item.totalCents)}
                  </Text>
                  <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize["2xl"],
    fontWeight: "800",
    color: colors.foreground,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
  },
  list: {
    padding: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  orderId: {
    fontSize: fontSize.base,
    fontWeight: "700",
    color: colors.foreground,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  date: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
});
