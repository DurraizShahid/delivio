import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth-store";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";

export default function AccountScreen() {
  const router = useRouter();
  const customer = useAuthStore((s) => s.customer);
  const logout = useAuthStore((s) => s.logout);

  function handleLogout() {
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
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color={colors.mutedForeground} />
          </View>
          <Text style={styles.name}>{customer?.name || "Customer"}</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons
              name="call-outline"
              size={20}
              color={colors.mutedForeground}
            />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>
                {customer?.phone || "Not set"}
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRow}>
            <Ionicons
              name="mail-outline"
              size={20}
              color={colors.mutedForeground}
            />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>
                {customer?.email || "Not set"}
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRow}>
            <Ionicons
              name="calendar-outline"
              size={20}
              color={colors.mutedForeground}
            />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Member since</Text>
              <Text style={styles.infoValue}>
                {customer?.createdAt
                  ? new Date(customer.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                    })
                  : "—"}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color={colors.destructive}
          />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.muted,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.foreground,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: spacing.xxl,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: fontSize.base,
    color: colors.foreground,
    fontWeight: "500",
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 52,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.destructive,
  },
  logoutText: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.destructive,
  },
});
