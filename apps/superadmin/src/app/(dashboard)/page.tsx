"use client";

import {
  Building2,
  Store,
  Users,
  UserCircle,
  ClipboardList,
  DollarSign,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, Skeleton } from "@delivio/ui";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["superadmin-stats"],
    queryFn: () => api.superadmin.stats(),
  });

  const stats = data?.stats;

  const cards = [
    { label: "Workspaces", value: stats?.totalWorkspaces, icon: Building2, bg: "bg-blue-50 text-blue-600" },
    { label: "Shops", value: stats?.totalShops, icon: Store, bg: "bg-violet-50 text-violet-600" },
    { label: "Users", value: stats?.totalUsers, icon: Users, bg: "bg-amber-50 text-amber-600" },
    { label: "Customers", value: stats?.totalCustomers, icon: UserCircle, bg: "bg-emerald-50 text-emerald-600" },
    { label: "Orders", value: stats?.totalOrders, icon: ClipboardList, bg: "bg-rose-50 text-rose-600" },
    { label: "Revenue", value: stats ? `£${(stats.totalRevenueCents / 100).toFixed(2)}` : undefined, icon: DollarSign, bg: "bg-cyan-50 text-cyan-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Platform Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor and manage the entire Delivio platform
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-[100px] w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.label} className="shadow-sm border-border/60">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${card.bg}`}>
                  <card.icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-semibold tabular-nums tracking-tight">
                    {card.value ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
