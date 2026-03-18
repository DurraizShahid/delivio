import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import type { Delivery, DeliveryStatus } from "@delivio/types";
import { api } from "@/lib/api";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";
import { normalizeDelivery } from "@/lib/delivery-utils";

const STATUS_STEPS: DeliveryStatus[] = [
  "assigned",
  "picked_up",
  "arrived",
  "delivered",
];
const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: "Pending",
  assigned: "Assigned",
  picked_up: "Picked Up",
  arrived: "Arrived",
  delivered: "Delivered",
};

export default function ActiveScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const locationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);

  const { data: res, isLoading } = useQuery({
    queryKey: ["deliveries", "active"],
    queryFn: async () => {
      const r = await api.deliveries.list({ status: "assigned" });
      const arr = (r as { deliveries?: unknown[] })?.deliveries ?? (Array.isArray(r) ? r : []);
      return arr.map((d) => normalizeDelivery(d));
    },
    refetchInterval: 10000,
  });
  const deliveries = res ?? [];

  const active = deliveries.find(
    (d) =>
      d.status === "assigned" ||
      d.status === "picked_up" ||
      d.status === "arrived",
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

  const arrivedMutation = useMutation({
    mutationFn: (id: string) => api.deliveries.arrived(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      Alert.alert("Updated", "You have arrived.");
    },
    onError: (err: any) =>
      Alert.alert("Error", err.message || "Could not update status."),
  });

  const completeMutation = useMutation({
    mutationFn: (orderId: string) => api.orders.complete(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      Alert.alert("Delivered!", "Order completed successfully.");
      router.push("/(tabs)/history");
    },
    onError: (err: any) =>
      Alert.alert("Error", err.message || "Could not complete delivery."),
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

  const getActionButton = () => {
    if (!active) return null;
    if (active.status === "assigned") {
      return (
        <TouchableOpacity
          style={[
            styles.actionButton,
            statusMutation.isPending && styles.actionButtonDisabled,
          ]}
          onPress={() => statusMutation.mutate({ id: active.id, status: "picked_up" })}
          disabled={statusMutation.isPending}
          activeOpacity={0.8}
        >
          {statusMutation.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Text style={styles.actionButtonText}>Picked Up</Text>
          )}
        </TouchableOpacity>
      );
    }
    if (active.status === "picked_up") {
      return (
        <TouchableOpacity
          style={[
            styles.actionButton,
            arrivedMutation.isPending && styles.actionButtonDisabled,
          ]}
          onPress={() => arrivedMutation.mutate(active.id)}
          disabled={arrivedMutation.isPending}
          activeOpacity={0.8}
        >
          {arrivedMutation.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Text style={styles.actionButtonText}>Arrived Outside</Text>
          )}
        </TouchableOpacity>
      );
    }
    if (active.status === "arrived") {
      return (
        <TouchableOpacity
          style={[
            styles.actionButton,
            completeMutation.isPending && styles.actionButtonDisabled,
          ]}
          onPress={() => completeMutation.mutate(active.orderId)}
          disabled={completeMutation.isPending}
          activeOpacity={0.8}
        >
          {completeMutation.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Text style={styles.actionButtonText}>Complete Delivery</Text>
          )}
        </TouchableOpacity>
      );
    }
    return null;
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

        {/* Addresses */}
        <AddressesSection orderId={active.orderId} deliveryStatus={active.status} />

        {/* Action buttons */}
        {getActionButton()}

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

function openMapsWithAddress(address: string) {
  const encoded = encodeURIComponent(address);
  const url = Platform.select({
    ios: `https://maps.apple.com/?daddr=${encoded}&dirflg=d`,
    android: `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
  });
  Linking.openURL(url || "");
}

function AddressesSection({ orderId, deliveryStatus }: { orderId: string; deliveryStatus?: string }) {
  const { data: orderRes } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const r = await api.orders.get(orderId);
      return (r as { order?: Record<string, unknown> })?.order ?? r;
    },
    enabled: !!orderId,
  });
  const order = orderRes as {
    projectRef?: string;
    project_ref?: string;
    deliveryAddress?: string;
    delivery_address?: string;
    vendorAddress?: string;
    vendor_address?: string;
  } | undefined;
  const projectRef = order?.projectRef ?? order?.project_ref;

  const { data: workspace } = useQuery({
    queryKey: ["workspace", projectRef],
    queryFn: () => api.public.workspace(projectRef!),
    enabled: !!projectRef,
  });

  const restaurantAddr =
    workspace?.address ??
    (order?.vendorAddress ?? order?.vendor_address) ??
    "Restaurant address";
  const customerAddr =
    (order?.deliveryAddress ?? order?.delivery_address) ??
    "Customer delivery address";

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Addresses</Text>
      <View style={styles.addressBlock}>
        <Text style={styles.addressLabel}>Restaurant</Text>
        <Text style={styles.addressValue}>{restaurantAddr}</Text>
      </View>
      {deliveryStatus === "assigned" && (
        <TouchableOpacity
          style={styles.navigateButton}
          onPress={() => openMapsWithAddress(restaurantAddr)}
          activeOpacity={0.8}
        >
          <Text style={styles.navigateButtonText}>Navigate to Pickup</Text>
        </TouchableOpacity>
      )}
      <View style={styles.addressBlock}>
        <Text style={styles.addressLabel}>Customer</Text>
        <Text style={styles.addressValue}>{customerAddr}</Text>
      </View>
      {deliveryStatus === "picked_up" && (
        <TouchableOpacity
          style={styles.navigateButton}
          onPress={() => openMapsWithAddress(customerAddr)}
          activeOpacity={0.8}
        >
          <Text style={styles.navigateButtonText}>Navigate to Customer</Text>
        </TouchableOpacity>
      )}
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

  addressBlock: { marginBottom: spacing.md },
  addressLabel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  addressValue: { fontSize: fontSize.sm, color: colors.mutedForeground },

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
  navigateButton: {
    backgroundColor: "#2563EB",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  navigateButtonText: {
    color: "#FFFFFF",
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
});
