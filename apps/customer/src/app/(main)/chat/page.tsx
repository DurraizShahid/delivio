"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, ChevronRight, ArrowLeft } from "lucide-react";
import { Skeleton } from "@delivio/ui";
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
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8 lg:px-8">
        <Skeleton className="h-8 w-40" />
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex size-10 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-2xl font-bold">Messages</h1>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : !conversations || conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-muted">
            <MessageCircle className="size-10 text-muted-foreground" />
          </div>
          <h3 className="mt-5 text-lg font-semibold">No conversations</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Start a chat from an active order
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/chat/${conv.id}`}
              className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-4 transition-all hover:border-border hover:shadow-md"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <MessageCircle className="size-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-semibold">
                  {conv.type === "customer_vendor" ? "Restaurant" : "Rider"}
                </span>
                <p className="text-xs text-muted-foreground">
                  Order #{conv.orderId.slice(0, 8)}
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
