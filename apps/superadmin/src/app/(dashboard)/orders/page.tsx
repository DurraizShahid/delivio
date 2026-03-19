"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { Skeleton, EmptyState, Badge } from "@delivio/ui";
import type { Order, Workspace } from "@delivio/types";
import { api } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  placed: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  preparing: "bg-violet-100 text-violet-800",
  ready: "bg-emerald-100 text-emerald-800",
  assigned: "bg-cyan-100 text-cyan-800",
  picked_up: "bg-cyan-100 text-cyan-800",
  arrived: "bg-cyan-100 text-cyan-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  rejected: "bg-red-100 text-red-800",
  scheduled: "bg-yellow-100 text-yellow-800",
};

export default function OrdersPage() {
  const [filterRef, setFilterRef] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const { data: wsData } = useQuery<{ workspaces: Workspace[] }>({
    queryKey: ["sa-workspaces"],
    queryFn: () => api.superadmin.workspaces.list(),
  });

  const { data, isLoading } = useQuery<{ orders: Order[] }>({
    queryKey: ["sa-orders", filterRef, filterStatus],
    queryFn: () => api.superadmin.orders.list({
      projectRef: filterRef || undefined,
      status: filterStatus || undefined,
      limit: 100,
    }),
  });
  const orders = data?.orders ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">View orders across all workspaces</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={filterRef} onChange={(e) => setFilterRef(e.target.value)}>
          <option value="">All workspaces</option>
          {(wsData?.workspaces ?? []).map((w) => <option key={w.projectRef} value={w.projectRef}>{w.name}</option>)}
        </select>
        <select className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          {["placed", "accepted", "preparing", "ready", "assigned", "picked_up", "arrived", "completed", "cancelled", "rejected"].map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : orders.length === 0 ? (
        <EmptyState icon={<ClipboardList />} title="No orders" description="Orders will appear here as they come in" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order ID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Workspace</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {orders.map((o: any) => (
                <tr key={o.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">#{o.id?.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{o.project_ref || o.projectRef}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[o.status] || "bg-gray-100 text-gray-800"}`}>
                      {o.status?.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    £{((o.total_cents || o.totalCents || 0) / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(o.created_at || o.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
