"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
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
import { useWSEvent } from "@/providers/ws-provider";
import { useWS } from "@/providers/ws-provider";
import { api } from "@/lib/api";

export default function ChatPage() {
  const { id: conversationId } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const customer = useAuthStore((s) => s.customer);
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
      userId: customer?.id,
      isTyping: true,
    });
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="border-b border-border px-4 py-3">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-2/3 rounded-lg" />
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
                      "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
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

      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-border px-4 py-3"
      >
        <Input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleTyping();
          }}
          placeholder="Type a message..."
          className="flex-1"
          autoFocus
        />
        <Button size="icon" disabled={!text.trim() || sending}>
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
