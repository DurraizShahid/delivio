import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Message, Conversation, WSEvent } from "@delivio/types";
import { api, wsClient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";

export default function ConversationScreen() {
  const { id, type } = useLocalSearchParams<{
    id: string;
    type?: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [text, setText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setCreating(true);
      try {
        const convos = await api.chat.listConversations();
        const existing = convos.find(
          (c) =>
            c.orderId === id &&
            (type ? c.type === type : true),
        );
        if (existing) {
          setConversationId(existing.id);
        } else {
          const created = await api.chat.createConversation({
            orderId: id,
            type: (type as "customer_vendor" | "vendor_rider") ?? "vendor_rider",
          });
          setConversationId(created.id);
        }
      } catch {}
      setCreating(false);
    })();
  }, [id, type]);

  const {
    data: messages,
    isLoading,
    refetch,
  } = useQuery<Message[]>({
    queryKey: ["messages", conversationId],
    queryFn: () => api.chat.getMessages(conversationId!),
    enabled: !!conversationId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!conversationId) return;
    wsClient.connect();
    const unsub = wsClient.subscribe("chat:message", (event: WSEvent) => {
      if (
        event.type === "chat:message" &&
        event.message.conversationId === conversationId
      ) {
        queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      }
    });
    api.chat.markRead(conversationId).catch(() => {});
    return () => {
      unsub();
    };
  }, [conversationId, queryClient]);

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      api.chat.sendMessage(conversationId!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      setText("");
    },
  });

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !conversationId) return;
    sendMutation.mutate(trimmed);
  };

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isMe = item.senderId === user?.id;
      return (
        <View
          style={[
            styles.bubble,
            isMe ? styles.bubbleMe : styles.bubbleThem,
          ]}
        >
          {!isMe && (
            <Text style={styles.senderRole}>{item.senderRole}</Text>
          )}
          <Text
            style={[
              styles.bubbleText,
              isMe ? styles.bubbleTextMe : styles.bubbleTextThem,
            ]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.timestamp,
              isMe ? styles.timestampMe : styles.timestampThem,
            ]}
          >
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      );
    },
    [user?.id],
  );

  if (creating) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conversation</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={[...(messages ?? [])].reverse()}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            inverted
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>
                  Send a message to start the conversation
                </Text>
              </View>
            }
          />
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={colors.mutedForeground}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!text.trim() || sendMutation.isPending) &&
                styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!text.trim() || sendMutation.isPending}
            activeOpacity={0.8}
          >
            {sendMutation.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} size="small" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backText: { fontSize: fontSize.base, color: colors.primary, fontWeight: "600" },
  headerTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.foreground },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  messageList: { padding: spacing.lg, gap: spacing.sm },

  bubble: {
    maxWidth: "78%",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  bubbleMe: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
  },
  bubbleThem: {
    alignSelf: "flex-start",
    backgroundColor: colors.muted,
  },
  senderRole: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
    textTransform: "capitalize",
  },
  bubbleText: { fontSize: fontSize.base, lineHeight: 22 },
  bubbleTextMe: { color: colors.primaryForeground },
  bubbleTextThem: { color: colors.foreground },
  timestamp: { fontSize: 10, marginTop: spacing.xs },
  timestampMe: { color: colors.primaryForeground, opacity: 0.7, textAlign: "right" },
  timestampThem: { color: colors.mutedForeground, textAlign: "left" },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    transform: [{ scaleY: -1 }],
  },
  emptyText: { fontSize: fontSize.lg, fontWeight: "600", color: colors.foreground },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.foreground,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: { opacity: 0.4 },
  sendButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
});
