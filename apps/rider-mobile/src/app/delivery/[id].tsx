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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export default function DeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: res, isLoading } = useQuery({
    queryKey: ["deliveries", "detail", id],
    queryFn: async () => {
      const [mine, pending] = await Promise.all([
        api.deliveries.list(),
        api.deliveries.list({ status: "pending" }),
      ]);
      const extract = (r: unknown) => {
        const arr = (r as { deliveries?: unknown[] })?.deliveries ?? (Array.isArray(r) ? r : []);
        return arr.map((d) => normalizeDelivery(d));
      };
      const all = [...extract(mine), ...extract(pending)];
      return Array.from(new Map(all.map((d) => [d.id, d])).values());
    },
    enabled: !!id,
  });
  const deliveries = res ?? [];
  const delivery = deliveries?.find((d) => d.id === id);

  const statusMutation = useMutation({
    mutationFn: ({ id: deliveryId, status }: { id: string; status: string }) =>
      api.deliveries.updateStatus(deliveryId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      Alert.alert("Updated", "Delivery status updated.");
    },
    onError: (err: any) =>
      Alert.alert("Error", err.message || "Could not update status."),
  });

  const arrivedMutation = useMutation({
    mutationFn: (deliveryId: string) => api.deliveries.arrived(deliveryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      Alert.alert("Arrived", "Customer notified you have arrived.");
    },
    onError: (err: any) =>
      Alert.alert("Error", err.message || "Could not update status."),
  });

  const completeMutation = useMutation({
    mutationFn: (orderId: string) => api.orders.complete(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      Alert.alert("Delivered!", "Order completed successfully.");
      router.back();
    },
    onError: (err: any) =>
      Alert.alert("Error", err.message || "Could not complete delivery."),
  });

  const getActionButton = () => {
    if (!delivery) return null;
    if (delivery.status === "assigned") {
      return (
        <TouchableOpacity
          style={[
            styles.actionButton,
            statusMutation.isPending && styles.disabled,
          ]}
          onPress={() =>
            statusMutation.mutate({ id: delivery.id, status: "picked_up" })
          }
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
    if (delivery.status === "picked_up") {
      return (
        <TouchableOpacity
          style={[
            styles.actionButton,
            arrivedMutation.isPending && styles.disabled,
          ]}
          onPress={() => arrivedMutation.mutate(delivery.id)}
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
    if (delivery.status === "arrived") {
      return (
        <TouchableOpacity
          style={[
            styles.actionButton,
            completeMutation.isPending && styles.disabled,
          ]}
          onPress={() => completeMutation.mutate(delivery.orderId)}
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
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!delivery) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Delivery not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.heading}>Delivery Details</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Status stepper */}
        <View style={styles.stepper}>
          {STATUS_STEPS.map((step, i) => {
            const currentIdx = STATUS_STEPS.indexOf(delivery.status);
            const done = i <= currentIdx;
            return (
              <View key={step} style={styles.stepItem}>
                <View
                  style={[styles.stepDot, done && styles.stepDotActive]}
                />
                <Text
                  style={[styles.stepLabel, done && styles.stepLabelActive]}
                >
                  {STATUS_LABELS[step]}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Information</Text>
          <Row label="Order ID" value={`#${delivery.orderId.slice(0, 8)}`} />
          <Row label="Status" value={STATUS_LABELS[delivery.status]} />
          {delivery.zoneId && <Row label="Zone" value={delivery.zoneId} />}
          {delivery.etaMinutes != null && (
            <Row label="ETA" value={`${delivery.etaMinutes} min`} />
          )}
          {delivery.claimedAt && (
            <Row
              label="Claimed at"
              value={new Date(delivery.claimedAt).toLocaleString()}
            />
          )}
          <Row
            label="Created"
            value={new Date(delivery.createdAt).toLocaleString()}
          />
        </View>

        {/* Addresses */}
        <AddressesSection orderId={delivery.orderId} deliveryStatus={delivery.status} />

        {/* Status action */}
        {getActionButton()}

        {/* Chat buttons */}
        <View style={styles.chatRow}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() =>
              router.push(`/conversation/${delivery.orderId}?type=vendor_rider`)
            }
            activeOpacity={0.7}
          >
            <Text style={styles.chatButtonText}>Chat with Restaurant</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() =>
              router.push(
                `/conversation/${delivery.orderId}?type=customer_vendor`,
              )
            }
            activeOpacity={0.7}
          >
            <Text style={styles.chatButtonText}>Chat with Customer</Text>
          </TouchableOpacity>
        </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backText: { fontSize: fontSize.base, color: colors.primary, fontWeight: "600" },
  heading: { fontSize: fontSize.xl, fontWeight: "700", color: colors.foreground },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80 },
  emptyText: { fontSize: fontSize.lg, fontWeight: "600", color: colors.foreground },

  stepper: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepItem: { alignItems: "center", gap: spacing.xs },
  stepDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.border,
  },
  stepDotActive: { backgroundColor: colors.success },
  stepLabel: { fontSize: fontSize.xs, color: colors.mutedForeground },
  stepLabelActive: { color: colors.foreground, fontWeight: "600" },

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
  disabled: { opacity: 0.6 },
  actionButtonText: { color: "#fff", fontSize: fontSize.base, fontWeight: "600" },

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
  chatRow: { flexDirection: "row", gap: spacing.md },
  chatButton: {
    flex: 1,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  chatButtonText: { fontSize: fontSize.sm, fontWeight: "600", color: colors.foreground },
});
