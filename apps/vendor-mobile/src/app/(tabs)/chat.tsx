import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Conversation } from "@delivio/types";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";
import { api } from "@/lib/api";

const TYPE_LABELS: Record<string, string> = {
  customer_vendor: "Customer",
  vendor_rider: "Rider",
};

export default function ChatListScreen() {
  const router = useRouter();

  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ["vendor-conversations"],
    queryFn: () => api.chat.listConversations() as Promise<Conversation[]>,
    refetchInterval: 10_000,
  });

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.convCard}
      onPress={() => router.push(`/conversation/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name={item.type === "vendor_rider" ? "bicycle-outline" : "person-outline"}
          size={22}
          color={colors.primary}
        />
      </View>
      <View style={styles.convInfo}>
        <Text style={styles.convType}>{TYPE_LABELS[item.type] ?? item.type}</Text>
        <Text style={styles.convOrder} numberOfLines={1}>
          Order #{item.orderId.slice(0, 8)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
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
      <Text style={styles.screenTitle}>Chat</Text>
      <FlatList
        data={conversations}
        keyExtractor={(c) => c.id}
        renderItem={renderConversation}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubble-outline" size={48} color={colors.border} />
            <Text style={styles.emptyText}>No conversations</Text>
            <Text style={styles.emptySubtext}>
              Chats with customers and riders will appear here
            </Text>
          </View>
        }
      />
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  convCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.muted,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  convInfo: { flex: 1 },
  convType: { fontSize: fontSize.base, fontWeight: "600", color: colors.foreground, marginBottom: 2 },
  convOrder: { fontSize: fontSize.sm, color: colors.mutedForeground },
  empty: { alignItems: "center", paddingTop: 80, gap: spacing.sm },
  emptyText: { fontSize: fontSize.lg, fontWeight: "600", color: colors.foreground },
  emptySubtext: { fontSize: fontSize.sm, color: colors.mutedForeground, textAlign: "center", paddingHorizontal: spacing.xl },
});
