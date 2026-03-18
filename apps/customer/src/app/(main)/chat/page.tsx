"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  Skeleton,
  EmptyState,
} from "@delivio/ui";
import { useConversations } from "@/hooks/use-chat";
import { useAuthStore } from "@/stores/auth-store";

export default function ChatListPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  const { data: conversations, isLoading } = useConversations();

  if (authLoading) {
    return (
      <div className="mx-auto max-w-md space-y-3 px-4 pt-6">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (!isAuthenticated) return null;

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
          description="Start a chat from an active order"
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
                        ? "Restaurant"
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
