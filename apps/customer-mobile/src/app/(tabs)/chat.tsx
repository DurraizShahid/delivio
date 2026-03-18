import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";
import type { Conversation } from "@delivio/types";

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ChatListScreen() {
  const router = useRouter();

  const {
    data: conversations,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => api.chat.listConversations(),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.title}>Chat</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
      </View>

      {!conversations?.length ? (
        <View style={styles.center}>
          <Ionicons
            name="chatbubbles-outline"
            size={48}
            color={colors.mutedForeground}
          />
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>
            Chats with restaurants will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          renderItem={({ item }) => {
            const label =
              item.type === "customer_vendor" ? "Restaurant" : "Rider";
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => router.push(`/conversation/${item.id}`)}
              >
                <View style={styles.iconBox}>
                  <Ionicons
                    name={
                      item.type === "customer_vendor"
                        ? "storefront-outline"
                        : "bicycle-outline"
                    }
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardLabel}>{label}</Text>
                    <Text style={styles.cardDate}>
                      {formatDate(item.updatedAt)}
                    </Text>
                  </View>
                  <Text style={styles.cardOrderId} numberOfLines={1}>
                    Order #{item.orderId.slice(-8).toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
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
  title: {
    fontSize: fontSize["2xl"],
    fontWeight: "800",
    color: colors.foreground,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.foreground,
    marginTop: spacing.sm,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  list: {
    padding: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.muted,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  cardLabel: {
    fontSize: fontSize.base,
    fontWeight: "700",
    color: colors.foreground,
  },
  cardDate: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  cardOrderId: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
});
