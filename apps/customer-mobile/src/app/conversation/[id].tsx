import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { api, wsClient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";
import type { Message } from "@delivio/types";

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customer = useAuthStore((s) => s.customer);
  const queryClient = useQueryClient();

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const flatListRef = useRef<FlatList>(null);

  const { data: fetchedMessages, isLoading } = useQuery<Message[]>({
    queryKey: ["messages", id],
    queryFn: () => api.chat.getMessages(id!),
    enabled: !!id,
  });

  const messages = [...(fetchedMessages || []), ...localMessages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  useEffect(() => {
    if (!id) return;
    api.chat.markRead(id).catch(() => {});
  }, [id]);

  useEffect(() => {
    wsClient.connect();
    const unsub = wsClient.subscribe("chat:message", (event) => {
      if (event.conversationId === id) {
        const msg = event.message;
        if (msg.senderId !== customer?.id) {
          setLocalMessages((prev) => [...prev, msg]);
        }
        queryClient.invalidateQueries({ queryKey: ["messages", id] });
      }
    });
    return () => {
      unsub();
    };
  }, [id, customer?.id]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const msg = await api.chat.sendMessage(id!, trimmed);
      setLocalMessages((prev) => [...prev, msg]);
      setText("");
      queryClient.invalidateQueries({ queryKey: ["messages", id] });
    } catch {
      // Silently fail for now
    } finally {
      setSending(false);
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const isMyMessage = (msg: Message) => msg.senderId === customer?.id;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Chat",
          headerBackTitle: "Back",
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.center}>
            <Ionicons
              name="chatbubbles-outline"
              size={48}
              color={colors.mutedForeground}
            />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>
              Send a message to start the conversation
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            inverted
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const mine = isMyMessage(item);
              return (
                <View
                  style={[
                    styles.messageBubbleRow,
                    mine ? styles.myRow : styles.theirRow,
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      mine ? styles.myBubble : styles.theirBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        mine ? styles.myBubbleText : styles.theirBubbleText,
                      ]}
                    >
                      {item.content}
                    </Text>
                    <Text
                      style={[
                        styles.timeText,
                        mine ? styles.myTimeText : styles.theirTimeText,
                      ]}
                    >
                      {formatTime(item.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
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
              (!text.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={colors.primaryForeground}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  messageList: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  messageBubbleRow: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  myRow: {
    justifyContent: "flex-end",
  },
  theirRow: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "78%",
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  myBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: spacing.xs,
  },
  theirBubble: {
    backgroundColor: colors.muted,
    borderBottomLeftRadius: spacing.xs,
  },
  bubbleText: {
    fontSize: fontSize.base,
    lineHeight: 22,
  },
  myBubbleText: {
    color: colors.primaryForeground,
  },
  theirBubbleText: {
    color: colors.foreground,
  },
  timeText: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  myTimeText: {
    color: colors.primaryForeground + "99",
    textAlign: "right",
  },
  theirTimeText: {
    color: colors.mutedForeground,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
