import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Product } from "@delivio/types";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

function formatCents(cents: number) {
  return `£${(cents / 100).toFixed(2)}`;
}

export default function MenuScreen() {
  const user = useAuthStore((s) => s.user);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["vendor-products", user?.projectRef],
    queryFn: () => api.public.products(user!.projectRef) as Promise<Product[]>,
    enabled: !!user?.projectRef,
  });

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        {item.category && <Text style={styles.productCategory}>{item.category}</Text>}
        <Text style={styles.productPrice}>{formatCents(item.priceCents)}</Text>
      </View>
      <View style={styles.productActions}>
        <Switch
          value={item.available}
          onValueChange={() => {}}
          trackColor={{ false: colors.border, true: colors.success + "60" }}
          thumbColor={item.available ? colors.success : colors.mutedForeground}
        />
        <TouchableOpacity style={styles.editBtn} activeOpacity={0.7}>
          <Ionicons name="create-outline" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.screenTitle}>Menu</Text>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        renderItem={renderProduct}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="restaurant-outline" size={48} color={colors.border} />
            <Text style={styles.emptyText}>No products yet</Text>
            <Text style={styles.emptySubtext}>Add menu items to get started</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.primaryForeground} />
      </TouchableOpacity>
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  productCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productInfo: { flex: 1, marginRight: spacing.md },
  productName: { fontSize: fontSize.base, fontWeight: "600", color: colors.foreground, marginBottom: 2 },
  productCategory: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  productPrice: { fontSize: fontSize.sm, fontWeight: "600", color: colors.foreground },
  productActions: { alignItems: "center", gap: spacing.sm },
  editBtn: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.muted,
  },
  fab: {
    position: "absolute",
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  empty: { alignItems: "center", paddingTop: 80, gap: spacing.sm },
  emptyText: { fontSize: fontSize.lg, fontWeight: "600", color: colors.foreground },
  emptySubtext: { fontSize: fontSize.sm, color: colors.mutedForeground },
});
