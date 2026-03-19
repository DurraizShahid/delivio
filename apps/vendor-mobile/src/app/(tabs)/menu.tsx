import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { Product, Category } from "@delivio/types";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useShopStore } from "@/stores/shop-store";

function formatCents(cents: number) {
  return `£${(cents / 100).toFixed(2)}`;
}

export default function MenuScreen() {
  const user = useAuthStore((s) => s.user);
  const activeShop = useShopStore((s) => s.activeShop);
  const qc = useQueryClient();
  const router = useRouter();

  const { data: catRes } = useQuery<{ categories: Category[] }>({
    queryKey: ["catalog", "categories", activeShop?.id],
    queryFn: () => api.catalog.listCategories(activeShop?.id),
    enabled: !!activeShop?.id,
  });

  const { data: res, isLoading } = useQuery<{ products: Product[] }>({
    queryKey: ["vendor-products", activeShop?.id],
    queryFn: () => api.catalog.listProducts(undefined, activeShop?.id),
    enabled: !!activeShop?.id,
  });
  const products = res?.products ?? [];

  const categoryNames = (catRes?.categories ?? []).map((c) => c.name).sort();

  const toggleMutation = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) =>
      api.catalog.updateProduct(id, { available }, activeShop?.id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["vendor-products", activeShop?.id] }),
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
          onValueChange={() =>
            toggleMutation.mutate({ id: item.id, available: !item.available })
          }
          disabled={toggleMutation.isPending}
          trackColor={{ false: colors.border, true: colors.success + "60" }}
          thumbColor={item.available ? colors.success : colors.mutedForeground}
        />
        <TouchableOpacity
          style={styles.editBtn}
          activeOpacity={0.7}
          onPress={() => router.push(`/product/${item.id}`)}
        >
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
      {categoryNames.length > 0 && (
        <View style={styles.categoriesRow}>
          <Text style={styles.categoriesLabel}>Categories:</Text>
          <Text style={styles.categoriesValue} numberOfLines={1}>
            {categoryNames.join(", ")}
          </Text>
        </View>
      )}
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

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => router.push("/product/new")}
      >
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
  categoriesRow: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  categoriesLabel: { fontSize: fontSize.xs, color: colors.mutedForeground, fontWeight: "600" },
  categoriesValue: { flex: 1, fontSize: fontSize.xs, color: colors.mutedForeground },
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
