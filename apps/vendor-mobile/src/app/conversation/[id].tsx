import { useState, useEffect, useRef, useCallback } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Message } from "@delivio/types";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";
import { api, wsClient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export default function ConversationScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ["vendor-messages", conversationId],
    queryFn: () => api.chat.getMessages(conversationId!) as Promise<Message[]>,
    enabled: !!conversationId,
    refetchInterval: 10_000,
  });

  useEffect(() => {
    wsClient.connect();
    const unsub = wsClient.subscribe("chat:message", (e) => {
      if (e.conversationId === conversationId) {
        queryClient.invalidateQueries({ queryKey: ["vendor-messages", conversationId] });
      }
    });
    return () => { unsub(); };
  }, [conversationId, queryClient]);

  useEffect(() => {
    if (conversationId) {
      api.chat.markRead(conversationId).catch(() => {});
    }
  }, [conversationId, messages]);

  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (!content || !conversationId) return;
    setSending(true);
    setText("");
    try {
      await api.chat.sendMessage(conversationId, content);
      queryClient.invalidateQueries({ queryKey: ["vendor-messages", conversationId] });
    } catch {
      setText(content);
    } finally {
      setSending(false);
    }
  }, [text, conversationId, queryClient]);

  const inverted = [...(messages ?? [])].reverse();

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.id;
    return (
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
          {item.content}
        </Text>
        <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
          {new Date(item.createdAt).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conversation</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={flatListRef}
            data={inverted}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            inverted
            contentContainerStyle={styles.messageList}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>No messages yet</Text>
              </View>
            }
          />
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message…"
              placeholderTextColor={colors.mutedForeground}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
              activeOpacity={0.7}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Ionicons name="send" size={18} color={colors.primaryForeground} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: fontSize.lg, fontWeight: "600", color: colors.foreground },
  messageList: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  bubbleMe: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    borderBottomRightRadius: borderRadius.sm,
  },
  bubbleThem: {
    alignSelf: "flex-start",
    backgroundColor: colors.muted,
    borderBottomLeftRadius: borderRadius.sm,
  },
  bubbleText: { fontSize: fontSize.base, lineHeight: 22 },
  bubbleTextMe: { color: colors.primaryForeground },
  bubbleTextThem: { color: colors.foreground },
  bubbleTime: {
    fontSize: fontSize.xs - 1,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
    alignSelf: "flex-end",
  },
  bubbleTimeMe: { color: colors.primaryForeground + "99" },
  emptyChat: { alignItems: "center", paddingVertical: spacing.xxl, transform: [{ scaleY: -1 }] },
  emptyChatText: { fontSize: fontSize.sm, color: colors.mutedForeground },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.base,
    color: colors.foreground,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
});
