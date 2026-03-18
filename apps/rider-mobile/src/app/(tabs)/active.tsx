import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import type { Delivery, DeliveryStatus } from "@delivio/types";
import { api } from "@/lib/api";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";

const STATUS_STEPS: DeliveryStatus[] = ["assigned", "picked_up", "delivered"];
const STATUS_LABELS: Record<DeliveryStatus, string> = {
  assigned: "Assigned",
  picked_up: "Picked Up",
  delivered: "Delivered",
};

export default function ActiveScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const locationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);

  const { data: deliveries, isLoading } = useQuery<Delivery[]>({
    queryKey: ["deliveries", "active"],
    queryFn: () => api.deliveries.list({ status: "assigned" }),
    refetchInterval: 10000,
  });

  const active = deliveries?.find(
    (d) => d.status === "assigned" || d.status === "picked_up",
  );

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.deliveries.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      Alert.alert("Updated", "Delivery status updated.");
    },
    onError: (err: any) =>
      Alert.alert("Error", err.message || "Could not update status."),
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(status === "granted");
    })();
  }, []);

  useEffect(() => {
    if (!active || !locationGranted) return;

    const sendLocation = async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        await api.deliveries.updateLocation(active.id, {
          lat: loc.coords.latitude,
          lon: loc.coords.longitude,
          heading: loc.coords.heading ?? undefined,
          speed: loc.coords.speed ?? undefined,
        });
      } catch {}
    };

    sendLocation();
    locationInterval.current = setInterval(sendLocation, 5000);
    return () => {
      if (locationInterval.current) clearInterval(locationInterval.current);
    };
  }, [active?.id, locationGranted]);

  const getNextStatus = (current: DeliveryStatus): DeliveryStatus | null => {
    const idx = STATUS_STEPS.indexOf(current);
    return idx < STATUS_STEPS.length - 1 ? STATUS_STEPS[idx + 1] : null;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!active) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Text style={styles.heading}>Active Delivery</Text>
        <View style={styles.center}>
          <Text style={styles.emptyText}>No active delivery</Text>
          <Text style={styles.emptySubtext}>
            Claim a delivery from the Available tab
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const nextStatus = getNextStatus(active.status);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Active Delivery</Text>

        {/* Status stepper */}
        <View style={styles.stepper}>
          {STATUS_STEPS.map((step, i) => {
            const currentIdx = STATUS_STEPS.indexOf(active.status);
            const done = i <= currentIdx;
            return (
              <View key={step} style={styles.stepRow}>
                <View
                  style={[styles.stepDot, done && styles.stepDotActive]}
                />
                <Text
                  style={[styles.stepLabel, done && styles.stepLabelActive]}
                >
                  {STATUS_LABELS[step]}
                </Text>
                {i < STATUS_STEPS.length - 1 && (
                  <View
                    style={[styles.stepLine, done && styles.stepLineActive]}
                  />
                )}
              </View>
            );
          })}
        </View>

        {/* Map placeholder */}
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapText}>Map view — rider position</Text>
          {!locationGranted && (
            <Text style={styles.mapSubtext}>Location permission required</Text>
          )}
        </View>

        {/* Delivery info card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Details</Text>
          <Row label="Order" value={`#${active.orderId.slice(0, 8)}`} />
          <Row label="Status" value={STATUS_LABELS[active.status]} />
          {active.zoneId && <Row label="Zone" value={active.zoneId} />}
          {active.etaMinutes != null && (
            <Row label="ETA" value={`${active.etaMinutes} min`} />
          )}
          {active.claimedAt && (
            <Row
              label="Claimed"
              value={new Date(active.claimedAt).toLocaleTimeString()}
            />
          )}
        </View>

        {/* Action buttons */}
        {nextStatus && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              statusMutation.isPending && styles.actionButtonDisabled,
            ]}
            onPress={() =>
              statusMutation.mutate({ id: active.id, status: nextStatus })
            }
            disabled={statusMutation.isPending}
            activeOpacity={0.8}
          >
            {statusMutation.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} size="small" />
            ) : (
              <Text style={styles.actionButtonText}>
                Mark as {STATUS_LABELS[nextStatus]}
              </Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.detailButton}
          onPress={() => router.push(`/delivery/${active.id}`)}
          activeOpacity={0.7}
        >
          <Text style={styles.detailButtonText}>View Full Details</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  heading: {
    fontSize: fontSize["2xl"],
    fontWeight: "700",
    color: colors.foreground,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80 },
  emptyText: { fontSize: fontSize.lg, fontWeight: "600", color: colors.foreground },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
    textAlign: "center",
  },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  stepRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  stepDotActive: { backgroundColor: colors.success },
  stepLabel: { fontSize: fontSize.xs, color: colors.mutedForeground },
  stepLabelActive: { color: colors.foreground, fontWeight: "600" },
  stepLine: {
    width: 24,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  stepLineActive: { backgroundColor: colors.success },

  mapPlaceholder: {
    height: 180,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  mapText: { fontSize: fontSize.base, fontWeight: "600", color: colors.mutedForeground },
  mapSubtext: { fontSize: fontSize.xs, color: colors.destructive, marginTop: spacing.xs },

  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: fontSize.sm, color: colors.mutedForeground },
  rowValue: { fontSize: fontSize.sm, fontWeight: "500", color: colors.foreground },

  actionButton: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
  },
  actionButtonDisabled: { opacity: 0.6 },
  actionButtonText: {
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: "600",
  },
  detailButton: {
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailButtonText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
});
