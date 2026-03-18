import { useMemo } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { useCartStore } from "@/stores/cart-store";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";
import type { Product, Workspace } from "@delivio/types";

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function RestaurantScreen() {
  const { ref } = useLocalSearchParams<{ ref: string }>();

  const addItem = useCartStore((s) => s.addItem);
  const projectRef = useCartStore((s) => s.projectRef);
  const setProjectRef = useCartStore((s) => s.setProjectRef);
  const clear = useCartStore((s) => s.clear);

  const { data: workspace, isLoading: loadingWorkspace } = useQuery<Workspace>({
    queryKey: ["workspace", ref],
    queryFn: () => api.public.workspace(ref!),
    enabled: !!ref,
  });

  const { data: products, isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["products", ref],
    queryFn: () => api.public.products(ref!),
    enabled: !!ref,
  });

  const sections = useMemo(() => {
    if (!products) return [];
    const grouped: Record<string, Product[]> = {};
    for (const p of products) {
      if (!p.available) continue;
      const cat = p.category || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    }
    return Object.entries(grouped).map(([title, data]) => ({ title, data }));
  }, [products]);

  function handleAddToCart(product: Product) {
    if (projectRef && projectRef !== ref) {
      Alert.alert(
        "Different restaurant",
        "Your cart has items from another restaurant. Clear cart and add this item?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear & Add",
            style: "destructive",
            onPress: () => {
              clear();
              setProjectRef(ref!);
              addItem({
                id: `local-${Date.now()}`,
                sessionId: "",
                productId: product.id,
                name: product.name,
                quantity: 1,
                unitPriceCents: product.priceCents,
                createdAt: new Date().toISOString(),
              });
            },
          },
        ]
      );
      return;
    }

    if (!projectRef) setProjectRef(ref!);
    addItem({
      id: `local-${Date.now()}`,
      sessionId: "",
      productId: product.id,
      name: product.name,
      quantity: 1,
      unitPriceCents: product.priceCents,
      createdAt: new Date().toISOString(),
    });
  }

  const isLoading = loadingWorkspace || loadingProducts;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: workspace?.name || "Restaurant",
          headerBackTitle: "Back",
        }}
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            workspace?.description ? (
              <View style={styles.descriptionBox}>
                <Text style={styles.description}>{workspace.description}</Text>
                {workspace.address && (
                  <View style={styles.addressRow}>
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color={colors.mutedForeground}
                    />
                    <Text style={styles.addressText}>{workspace.address}</Text>
                  </View>
                )}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons
                name="fast-food-outline"
                size={48}
                color={colors.mutedForeground}
              />
              <Text style={styles.emptyText}>No products available</Text>
            </View>
          }
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionTitle}>{title}</Text>
          )}
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.productDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
                <Text style={styles.productPrice}>
                  {formatPrice(item.priceCents)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => handleAddToCart(item)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="add"
                  size={22}
                  color={colors.primaryForeground}
                />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
  },
  list: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  descriptionBox: {
    marginBottom: spacing.xl,
  },
  description: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  addressText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  productInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  productName: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  productDesc: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  productPrice: {
    fontSize: fontSize.base,
    fontWeight: "700",
    color: colors.foreground,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
});
