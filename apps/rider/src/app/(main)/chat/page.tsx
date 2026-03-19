"use client";

import Link from "next/link";
import { MessageCircle, ChevronRight, Clock3 } from "lucide-react";
import {
  Card,
  CardContent,
  Skeleton,
  EmptyState,
  Badge,
} from "@delivio/ui";
import { useConversations } from "@/hooks/use-chat";

export default function ChatListPage() {
  const { data: conversations, isLoading } = useConversations();

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
            <p className="text-sm text-muted-foreground">
              Keep communication quick while completing deliveries.
            </p>
          </div>
          <Badge variant="secondary" className="rounded-md px-2 py-1">
            {conversations?.length ?? 0}
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
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
              <Card className="border-border/70 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0 space-y-1">
                    <span className="text-sm font-semibold">
                      {conv.type === "vendor_rider"
                        ? "Vendor"
                        : "Customer"}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Order #{conv.orderId.slice(0, 8)}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="size-3.5" />
                      Updated recently
                    </div>
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
