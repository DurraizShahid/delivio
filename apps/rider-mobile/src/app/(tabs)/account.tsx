import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";

export default function AccountScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const { data: tipsData } = useQuery({
    queryKey: ["tips", "rider", user?.id],
    queryFn: () => api.tips.getByRider(user!.id),
    enabled: !!user?.id,
  });

  const { data: ratingsData } = useQuery({
    queryKey: ["ratings", "user", user?.id],
    queryFn: () => api.ratings.getByUser(user!.id),
    enabled: !!user?.id,
  });

  const totalTipsCents =
    (tipsData as { totalCents?: number })?.totalCents ??
    (tipsData as { total?: number })?.total ??
    0;
  const totalTipsFormatted = `$${(totalTipsCents / 100).toFixed(2)}`;
  const avgRating = ratingsData?.average ?? null;
  const ratingDisplay = avgRating != null ? `${avgRating.toFixed(1)} ★` : "No ratings yet";

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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.heading}>Account</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.email?.charAt(0).toUpperCase() ?? "R"}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{user?.email ?? "Rider"}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role ?? "rider"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.earningsTitle}>Earnings</Text>
        <InfoRow label="Total tips earned" value={totalTipsFormatted} />
        <InfoRow label="Average rating" value={ratingDisplay} last />
      </View>

      <View style={styles.card}>
        <InfoRow label="Email" value={user?.email ?? "—"} />
        <InfoRow label="Role" value={user?.role ?? "—"} />
        <InfoRow
          label="Member since"
          value={
            user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : "—"
          }
          last
        />
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heading: {
    fontSize: fontSize["2xl"],
    fontWeight: "700",
    color: colors.foreground,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: colors.primaryForeground,
    fontSize: fontSize.xl,
    fontWeight: "700",
  },
  profileInfo: { flex: 1, gap: spacing.xs },
  name: { fontSize: fontSize.lg, fontWeight: "600", color: colors.foreground },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  roleText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.foreground,
    textTransform: "capitalize",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  earningsTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: fontSize.sm, color: colors.mutedForeground },
  rowValue: { fontSize: fontSize.sm, fontWeight: "500", color: colors.foreground },
  logoutButton: {
    backgroundColor: colors.destructive,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
    marginTop: "auto",
    marginBottom: spacing.xl,
  },
  logoutText: { color: "#fff", fontSize: fontSize.base, fontWeight: "600" },
});
