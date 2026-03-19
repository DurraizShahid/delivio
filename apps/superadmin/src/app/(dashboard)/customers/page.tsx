"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserCircle } from "lucide-react";
import { Card, CardContent, Skeleton, EmptyState } from "@delivio/ui";
import type { Customer, Workspace } from "@delivio/types";
import { api } from "@/lib/api";

export default function CustomersPage() {
  const [filterRef, setFilterRef] = useState("");

  const { data: wsData } = useQuery<{ workspaces: Workspace[] }>({
    queryKey: ["sa-workspaces"],
    queryFn: () => api.superadmin.workspaces.list(),
  });

  const { data, isLoading } = useQuery<{ customers: Customer[] }>({
    queryKey: ["sa-customers", filterRef],
    queryFn: () => api.superadmin.customers.list({ projectRef: filterRef || undefined, limit: 200 }),
  });
  const customers = data?.customers ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">View customers across all workspaces</p>
      </div>

      <div className="flex gap-2">
        <select className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={filterRef} onChange={(e) => setFilterRef(e.target.value)}>
          <option value="">All workspaces</option>
          {(wsData?.workspaces ?? []).map((w) => <option key={w.projectRef} value={w.projectRef}>{w.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : customers.length === 0 ? (
        <EmptyState icon={<UserCircle />} title="No customers" description="Customers will appear here once they sign up" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Workspace</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{c.phone}</td>
                  <td className="px-4 py-3">{c.name || "---"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email || "---"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{c.projectRef}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
