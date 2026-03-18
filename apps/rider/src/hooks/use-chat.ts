import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Conversation, Message } from "@delivio/types";

export function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => api.chat.listConversations(),
  });
}

export function useMessages(conversationId: string) {
  return useQuery<Message[]>({
    queryKey: ["messages", conversationId],
    queryFn: () => api.chat.getMessages(conversationId),
    enabled: !!conversationId,
    refetchInterval: 5_000,
  });
}
