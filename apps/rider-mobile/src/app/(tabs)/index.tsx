import { useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Delivery, WSEvent } from "@delivio/types";
import { api, wsClient } from "@/lib/api";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";
import { normalizeDelivery } from "@/lib/delivery-utils";

export default function AvailableScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: res,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["deliveries", "available"],
    queryFn: async () => {
      const r = await api.deliveries.list({ status: "pending" });
      const arr = (r as { deliveries?: unknown[] })?.deliveries ?? (Array.isArray(r) ? r : []);
      return arr.map((d) => normalizeDelivery(d));
    },
  });
  const deliveries = res ?? [];

  const claimMutation = useMutation({
    mutationFn: (id: string) => api.deliveries.claim(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      Alert.alert("Claimed!", "Delivery assigned to you.");
      router.replace("/(tabs)/active");
    },
    onError: (err: any) =>
      Alert.alert("Error", err.message || "Could not claim delivery."),
  });

  useEffect(() => {
    wsClient.connect();
    const unsub = wsClient.subscribe(
      "delivery:request",
      (_event: WSEvent) => {
        queryClient.invalidateQueries({ queryKey: ["deliveries", "available"] });
      },
    );
    return () => {
      unsub();
    };
  }, [queryClient]);

  const renderDelivery = useCallback(
    ({ item }: { item: Delivery }) => (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/delivery/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>Order #{item.orderId.slice(0, 8)}</Text>
          <View style={styles.etaBadge}>
            <Text style={styles.etaText}>
              {item.etaMinutes ? `${item.etaMinutes} min` : "N/A"}
            </Text>
          </View>
        </View>

        {item.zoneId && (
          <Text style={styles.zone}>Zone: {item.zoneId}</Text>
        )}

        <Text style={styles.meta}>
          Posted {new Date(item.createdAt).toLocaleTimeString()}
        </Text>

        <TouchableOpacity
          style={[
            styles.claimButton,
            claimMutation.isPending && styles.claimButtonDisabled,
          ]}
          onPress={() => claimMutation.mutate(item.id)}
          disabled={claimMutation.isPending}
          activeOpacity={0.8}
        >
          {claimMutation.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Text style={styles.claimButtonText}>Claim</Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    ),
    [claimMutation, router],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.heading}>Available Deliveries</Text>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={deliveries}
          keyExtractor={(d) => d.id}
          renderItem={renderDelivery}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No deliveries available</Text>
              <Text style={styles.emptySubtext}>
                Pull down to refresh or wait for new orders
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
  orderId: { fontSize: fontSize.lg, fontWeight: "600", color: colors.foreground },
  etaBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  etaText: { fontSize: fontSize.xs, fontWeight: "600", color: colors.foreground },
  zone: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  meta: { fontSize: fontSize.xs, color: colors.mutedForeground, marginBottom: spacing.md },
  claimButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  claimButtonDisabled: { opacity: 0.6 },
  claimButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: "600",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80 },
  emptyText: { fontSize: fontSize.lg, fontWeight: "600", color: colors.foreground },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
    textAlign: "center",
  },
});
