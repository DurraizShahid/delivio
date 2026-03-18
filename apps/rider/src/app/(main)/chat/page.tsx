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
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold">Messages</h1>

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
          description="Conversations with vendors will appear here during active deliveries"
        />
      ) : (
        <div className="space-y-3">
          {conversations.map((conv) => (
            <Link key={conv.id} href={`/chat/${conv.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium">
                      {conv.type === "vendor_rider"
                        ? "Vendor"
                        : "Customer"}
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
