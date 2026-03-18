"use client";

import Link from "next/link";
import { MessageCircle, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  Skeleton,
  EmptyState,
} from "@delivio/ui";
import { useConversations } from "@/hooks/use-chat";

export default function ChatListPage() {
  const { data: conversations, isLoading } = useConversations();

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground">
          Chat with customers and riders
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : !conversations || conversations.length === 0 ? (
        <EmptyState
          icon={<MessageCircle />}
          title="No conversations"
          description="Conversations will appear here when customers or riders message you"
        />
      ) : (
        <div className="space-y-3">
          {conversations.map((conv) => (
            <Link key={conv.id} href={`/chat/${conv.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium">
                      {conv.type === "customer_vendor"
                        ? "Customer"
                        : "Rider"}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Order #{conv.orderId.slice(0, 8)}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
