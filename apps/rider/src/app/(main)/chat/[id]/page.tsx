"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2, MessageCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Input,
  Skeleton,
  Avatar,
  AvatarFallback,
} from "@delivio/ui";
import { cn } from "@delivio/ui";
import { useMessages } from "@/hooks/use-chat";
import { useAuthStore } from "@/stores/auth-store";
import { useWSEvent, useWS } from "@/providers/ws-provider";
import { api } from "@/lib/api";

export default function ChatPage() {
  const { id: conversationId } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const ws = useWS();
  const { data: messages, isLoading } = useMessages(conversationId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useWSEvent("chat:message", (event) => {
    if (event.conversationId === conversationId) {
      queryClient.invalidateQueries({
        queryKey: ["messages", conversationId],
      });
    }
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api.chat.sendMessage(conversationId, text.trim());
      setText("");
      queryClient.invalidateQueries({
        queryKey: ["messages", conversationId],
      });
    } catch {
      // handled
    } finally {
      setSending(false);
    }
  }

  function handleTyping() {
    ws?.send({
      type: "chat:typing",
      conversationId,
      userId: user?.id,
      isTyping: true,
    });
  }

  return (
    <div className="flex h-[calc(100vh-5.5rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border/80 px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-1 rounded-lg px-2"
        >
          <ArrowLeft className="size-4" /> Back
        </Button>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessageCircle className="size-3.5" />
          Live chat
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-muted/25 px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-2/3 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {messages?.map((msg) => {
              const isMe = msg.senderId === user?.id;
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex items-end gap-2",
                    isMe ? "justify-end" : "justify-start"
                  )}
                >
                  {!isMe && (
                    <Avatar className="size-7">
                      <AvatarFallback className="text-xs">
                        {msg.senderRole?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-3 py-2.5 text-sm shadow-sm",
                      isMe
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm border border-border/70 bg-background"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-border/80 bg-background px-4 py-3"
      >
        <Input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleTyping();
          }}
          placeholder="Type a message..."
          className="h-10 flex-1 rounded-lg"
          autoFocus
        />
        <Button size="icon" className="rounded-lg" disabled={!text.trim() || sending}>
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
