import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { DeliveryMode, VendorSettings } from "@delivio/types";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useShopStore } from "@/stores/shop-store";

const DELIVERY_MODES: { value: DeliveryMode; label: string }[] = [
  { value: "third_party", label: "Third Party" },
  { value: "vendor_rider", label: "Vendor Rider" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const activeShop = useShopStore((s) => s.activeShop);

  const [autoAccept, setAutoAccept] = useState(false);
  const [defaultPrepTime, setDefaultPrepTime] = useState("15");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("third_party");
  const [deliveryRadius, setDeliveryRadius] = useState("5");
  const [autoDispatchDelay, setAutoDispatchDelay] = useState("0");

  const { data: settings, isLoading } = useQuery<VendorSettings>({
    queryKey: ["vendor-settings", activeShop?.id],
    queryFn: () => api.vendorSettings.get(activeShop?.id),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.vendorSettings.update({
        autoAccept,
        defaultPrepTimeMinutes: parseInt(defaultPrepTime, 10) || 15,
        deliveryMode,
        deliveryRadiusKm: parseFloat(deliveryRadius) || 5,
        autoDispatchDelayMinutes: parseInt(autoDispatchDelay, 10) || 0,
      }, activeShop?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-settings", activeShop?.id] });
      Alert.alert("Saved", "Settings updated successfully.");
    },
    onError: () => Alert.alert("Error", "Failed to save settings."),
  });

  useEffect(() => {
    if (settings) {
      setAutoAccept(settings.autoAccept);
      setDefaultPrepTime(String(settings.defaultPrepTimeMinutes));
      setDeliveryMode(settings.deliveryMode);
      setDeliveryRadius(String(settings.deliveryRadiusKm));
      setAutoDispatchDelay(String((settings as any).autoDispatchDelayMinutes ?? 0));
    }
  }, [settings]);

  const handleSave = () => {
    const prep = parseInt(defaultPrepTime, 10);
    const radius = parseFloat(deliveryRadius);
    if (Number.isNaN(prep) || prep < 1 || prep > 120) {
      Alert.alert("Invalid", "Prep time must be between 1 and 120 minutes.");
      return;
    }
    if (Number.isNaN(radius) || radius < 0 || radius > 100) {
      Alert.alert("Invalid", "Delivery radius must be between 0 and 100 km.");
      return;
    }
    updateMutation.mutate();
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  if (isLoading && !settings) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.screenTitle}>Settings</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={28} color={colors.primaryForeground} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.email ?? "Vendor"}</Text>
          <Text style={styles.profileRole}>{user?.role ?? "vendor"}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vendor Settings</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Auto-accept orders</Text>
          <Switch
            value={autoAccept}
            onValueChange={setAutoAccept}
            trackColor={{ false: colors.border, true: colors.primary + "60" }}
            thumbColor={autoAccept ? colors.primary : colors.mutedForeground}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Default prep time (minutes)</Text>
          <TextInput
            style={styles.rowInput}
            value={defaultPrepTime}
            onChangeText={setDefaultPrepTime}
            keyboardType="number-pad"
            placeholder="15"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        <View style={[styles.row, { flexDirection: "column", alignItems: "stretch" }]}>
          <Text style={[styles.rowLabel, { marginBottom: spacing.sm }]}>Delivery mode</Text>
          <View style={styles.modeButtons}>
            {DELIVERY_MODES.map((mode) => (
              <TouchableOpacity
                key={mode.value}
                style={[
                  styles.modeBtn,
                  deliveryMode === mode.value && styles.modeBtnActive,
                ]}
                onPress={() => setDeliveryMode(mode.value)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.modeBtnText,
                    deliveryMode === mode.value && styles.modeBtnTextActive,
                  ]}
                >
                  {mode.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Delivery radius (km)</Text>
          <TextInput
            style={styles.rowInput}
            value={deliveryRadius}
            onChangeText={setDeliveryRadius}
            keyboardType="decimal-pad"
            placeholder="5"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Auto-dispatch delay (min)</Text>
          <TextInput
            style={styles.rowInput}
            value={autoDispatchDelay}
            onChangeText={setAutoDispatchDelay}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={updateMutation.isPending}
          activeOpacity={0.8}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save Settings</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Email</Text>
          <Text style={styles.rowValue}>{user?.email ?? "—"}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Role</Text>
          <Text style={styles.rowValue}>{user?.role ?? "—"}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Workspace</Text>
          <Text style={styles.rowValue}>{user?.projectRef ?? "—"}</Text>
        </View>

        <View style={[styles.row, { borderBottomWidth: 0 }]}>
          <Text style={styles.rowLabel}>2FA</Text>
          <Text style={styles.rowValue}>{user?.totpEnabled ? "Enabled" : "Disabled"}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  centered: { justifyContent: "center", alignItems: "center" },
  screenTitle: {
    fontSize: fontSize["2xl"],
    fontWeight: "700",
    color: colors.foreground,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.lg,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: fontSize.lg, fontWeight: "600", color: colors.foreground },
  profileRole: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textTransform: "capitalize",
    marginTop: 2,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: fontSize.sm, color: colors.mutedForeground, flex: 1 },
  rowValue: { fontSize: fontSize.sm, fontWeight: "500", color: colors.foreground },
  rowInput: {
    width: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    fontSize: fontSize.sm,
    color: colors.foreground,
  },
  modeButtons: { flexDirection: "row", gap: spacing.sm },
  modeBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeBtnText: { fontSize: fontSize.sm, color: colors.foreground },
  modeBtnTextActive: { color: colors.primaryForeground, fontWeight: "600" },
  saveBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
  },
  saveBtnText: { color: colors.primaryForeground, fontWeight: "600", fontSize: fontSize.base },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.destructive + "0F",
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    gap: spacing.sm,
  },
  logoutText: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.destructive,
  },
});
