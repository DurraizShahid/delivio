"use client";

import Link from "next/link";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
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
      color: "text-blue-600",
    },
    {
      label: "Needs Action",
      value: pendingOrders.length,
      icon: AlertCircle,
      color: "text-orange-600",
    },
    {
      label: "Preparing",
      value: preparingOrders.length,
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      label: "Completed",
      value: completedToday.length,
      icon: CheckCircle2,
      color: "text-green-600",
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of today&apos;s activity
        </p>
      </div>

      {/* Stats grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`rounded-lg bg-muted p-2.5 ${stat.color}`}>
                  <stat.icon className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pending orders needing attention */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Pending Orders</CardTitle>
          <Link
            href="/orders"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : pendingOrders.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 />}
              title="All clear"
              description="No orders need your attention right now"
              className="py-8"
            />
          ) : (
            <div className="space-y-2">
              {pendingOrders.slice(0, 5).map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
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
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent orders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : !todayOrders.length ? (
            <EmptyState
              icon={<ClipboardList />}
              title="No orders today"
              description="Orders will appear here as they come in"
              className="py-8"
            />
          ) : (
            <div className="space-y-2">
              {todayOrders.slice(0, 10).map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
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
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
