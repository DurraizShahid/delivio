import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";
import type { Shop } from "@delivio/types";

const DEMO_REFS = ["demo"];

export default function HomeScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data: shops, isLoading } = useQuery<Shop[]>({
    queryKey: ["all-shops"],
    queryFn: async () => {
      const results = await Promise.allSettled(
        DEMO_REFS.map((ref) => api.public.shops(ref))
      );
      return results
        .filter(
          (r): r is PromiseFulfilledResult<Shop[]> =>
            r.status === "fulfilled"
        )
        .flatMap((r) => r.value);
    },
  });

  const filtered = shops?.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase()) ||
      s.address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.heading}>What are you craving?</Text>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={20}
            color={colors.mutedForeground}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search shops..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !filtered?.length ? (
        <View style={styles.center}>
          <Ionicons
            name="restaurant-outline"
            size={48}
            color={colors.mutedForeground}
          />
          <Text style={styles.emptyText}>No shops found</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() =>
                router.push(`/restaurant/${item.projectRef}?shopId=${item.id}`)
              }
            >
              {item.bannerUrl ? (
                <Image
                  source={{ uri: item.bannerUrl }}
                  style={styles.cardImage}
                />
              ) : (
                <View style={styles.cardImagePlaceholder}>
                  <Ionicons
                    name="restaurant-outline"
                    size={32}
                    color={colors.mutedForeground}
                  />
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.description && (
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
                {item.address && (
                  <View style={styles.addressRow}>
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color={colors.mutedForeground}
                    />
                    <Text style={styles.addressText} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
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
  heading: {
    fontSize: fontSize["2xl"],
    fontWeight: "800",
    color: colors.foreground,
    marginBottom: spacing.lg,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
  },
  list: {
    padding: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImage: {
    width: "100%",
    height: 140,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  cardImagePlaceholder: {
    width: "100%",
    height: 140,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    padding: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  addressText: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
});
