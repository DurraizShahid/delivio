"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Input, Skeleton, Avatar, AvatarFallback, cn } from "@delivio/ui";
import { useMessages } from "@/hooks/use-chat";
import { useAuthStore } from "@/stores/auth-store";
import { useWSEvent, useWS } from "@/providers/ws-provider";
import { api } from "@/lib/api";

export default function ChatPage() {
  const { id: conversationId } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { customer, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const ws = useWS();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, authLoading, router]);

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

  if (authLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8 lg:px-8">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-2/3 rounded-xl" />
        <Skeleton className="h-10 w-3/4 rounded-xl" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

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
      userId: customer?.id,
      isTyping: true,
    });
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3 lg:px-8">
        <button
          onClick={() => router.back()}
          className="flex size-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Go back"
        >
          <ArrowLeft className="size-4" />
        </button>
        <h2 className="font-semibold">Chat</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-8">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-2/3 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {messages?.map((msg) => {
              const isMe = msg.senderId === customer?.id;
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
                      "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      isMe
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-muted"
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

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-border/50 px-4 py-3 lg:px-8"
      >
        <Input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleTyping();
          }}
          placeholder="Type a message..."
          className="flex-1 rounded-xl"
          autoFocus
        />
        <Button
          size="icon"
          disabled={!text.trim() || sending}
          className="rounded-xl"
        >
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
