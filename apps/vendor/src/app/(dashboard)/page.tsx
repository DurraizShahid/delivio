"use client";

import Link from "next/link";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Skeleton,
  EmptyState,
  OrderStatusBadge,
  PriceDisplay,
} from "@delivio/ui";
import { useOrders } from "@/hooks/use-orders";
import { useWSEvent } from "@/providers/ws-provider";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function DashboardHomePage() {
  const queryClient = useQueryClient();
  const { data: orders, isLoading } = useOrders();

  useWSEvent("order:status_changed", (event) => {
    toast.info(`Order #${event.orderId.slice(0, 8)} → ${event.status.replace(/_/g, " ")}`);
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayOrders = orders?.filter(
    (o) => new Date(o.createdAt) >= todayStart
  ) ?? [];
  const pendingOrders = orders?.filter((o) => o.status === "placed") ?? [];
  const preparingOrders = orders?.filter((o) => o.status === "preparing") ?? [];
  const completedToday = todayOrders.filter((o) => o.status === "completed");

  const stats = [
    {
      label: "Today's Orders",
      value: todayOrders.length,
      icon: ClipboardList,
      iconBg: "bg-blue-50 text-blue-600",
    },
    {
      label: "Needs Action",
      value: pendingOrders.length,
      icon: AlertCircle,
      iconBg: "bg-amber-50 text-amber-600",
    },
    {
      label: "Preparing",
      value: preparingOrders.length,
      icon: Clock,
      iconBg: "bg-violet-50 text-violet-600",
    },
    {
      label: "Completed",
      value: completedToday.length,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Good to see you</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with your orders today.
        </p>
      </div>

      {/* Stats grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[100px] w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="shadow-sm border-border/60">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${stat.iconBg}`}>
                  <stat.icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-semibold tabular-nums tracking-tight">{stat.value}</p>
                  <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pending orders needing attention */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base font-semibold">Pending Orders</CardTitle>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View all <ArrowRight className="size-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : pendingOrders.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 />}
              title="All clear"
              description="No orders need your attention right now"
              className="py-10"
            />
          ) : (
            <div className="space-y-2">
              {pendingOrders.slice(0, 5).map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between rounded-xl border border-border/60 p-4 transition-all hover:bg-muted/50 hover:shadow-sm"
                >
                  <div className="space-y-1">
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
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/60" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent orders */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : !todayOrders.length ? (
            <EmptyState
              icon={<ClipboardList />}
              title="No orders today"
              description="Orders will appear here as they come in"
              className="py-10"
            />
          ) : (
            <div className="space-y-2">
              {todayOrders.slice(0, 10).map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between rounded-xl border border-border/60 p-4 transition-all hover:bg-muted/50 hover:shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-medium">
                        #{order.id.slice(0, 8)}
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
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/60" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
