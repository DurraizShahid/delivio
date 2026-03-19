"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  CardContent,
  Skeleton,
  EmptyState,
  OrderStatusBadge,
  PriceDisplay,
  cn,
} from "@delivio/ui";
import type { Order } from "@delivio/types";
import { useOrders } from "@/hooks/use-orders";
import { useWSEvent } from "@/providers/ws-provider";
import { api } from "@/lib/api";

const STATUS_TABS: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Placed", value: "placed" },
  { label: "Accepted", value: "accepted" },
  { label: "Preparing", value: "preparing" },
  { label: "Ready", value: "ready" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

function ActionButtons({
  order,
  onMutate,
}: {
  order: Order;
  onMutate: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(
    action: () => Promise<unknown>,
    label: string
  ) {
    setLoading(label);
    try {
      await action();
      toast.success(`Order ${label.toLowerCase()}`);
      onMutate();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : `Failed to ${label.toLowerCase()}`;
      toast.error(message);
    } finally {
      setLoading(null);
    }
  }

  const btn = (label: string, action: () => Promise<unknown>, variant: "default" | "destructive" | "outline" = "default") => (
    <Button
      size="sm"
      variant={variant}
      disabled={!!loading}
      onClick={(e) => {
        e.preventDefault();
        handleAction(action, label);
      }}
    >
      {loading === label ? <Loader2 className="size-3 animate-spin" /> : label}
    </Button>
  );

  switch (order.status) {
    case "placed":
      return (
        <div className="flex gap-2">
          {btn("Accept", () => api.orders.accept(order.id))}
          {btn("Reject", () => api.orders.reject(order.id), "destructive")}
        </div>
      );
    case "accepted":
      return btn("Start Preparing", () => api.orders.updateStatus(order.id, "preparing"));
    case "preparing":
      return btn("Mark Ready", () => api.orders.updateStatus(order.id, "ready"));
    default:
      return null;
  }
}

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState("all");
  const queryClient = useQueryClient();
  const { data: orders, isLoading } = useOrders();

  useWSEvent("order:status_changed", (event) => {
    toast.info(`Order #${event.orderId.slice(0, 8)} → ${event.status.replace(/_/g, " ")}`);
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["orders"] });

  const filteredOrders =
    activeTab === "all"
      ? orders
      : orders?.filter((o) => o.status === activeTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage incoming and active orders
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition-all",
              activeTab === tab.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Order list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : !filteredOrders || filteredOrders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title="No orders"
          description={
            activeTab === "all"
              ? "Orders will appear here as they come in"
              : `No ${activeTab} orders right now`
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card className="shadow-sm border-border/60 transition-all hover:shadow-md hover:border-border">
                <CardContent className="flex items-center justify-between p-4 sm:p-5">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-medium">
                        Order #{order.id.slice(0, 8)}
                      </span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <PriceDisplay cents={order.totalCents} />
                      <span>
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {order.items && (
                        <span>
                          {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ActionButtons order={order} onMutate={invalidate} />
                    <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
