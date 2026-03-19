"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Skeleton, EmptyState, Input, Badge,
} from "@delivio/ui";
import type { User, Workspace } from "@delivio/types";
import { api } from "@/lib/api";

export default function UsersPage() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", password: "", role: "vendor" as string, projectRef: "" });
  const [filterRole, setFilterRole] = useState("");
  const [filterRef, setFilterRef] = useState("");

  const { data: wsData } = useQuery<{ workspaces: Workspace[] }>({
    queryKey: ["sa-workspaces"],
    queryFn: () => api.superadmin.workspaces.list(),
  });

  const { data, isLoading } = useQuery<{ users: User[] }>({
    queryKey: ["sa-users", filterRole, filterRef],
    queryFn: () => api.superadmin.users.list({
      role: filterRole || undefined,
      projectRef: filterRef || undefined,
      limit: 200,
    }),
  });
  const users = data?.users ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        return api.superadmin.users.update(editingId, {
          email: form.email.trim() || undefined,
          role: form.role || undefined,
          projectRef: form.projectRef.trim() || undefined,
        });
      }
      return api.superadmin.users.create({
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        projectRef: form.projectRef.trim(),
      });
    },
    onSuccess: () => {
      toast.success(editingId ? "User updated" : "User created");
      setEditingId(null);
      setForm({ email: "", password: "", role: "vendor", projectRef: "" });
      qc.invalidateQueries({ queryKey: ["sa-users"] });
    },
    onError: (err: any) => toast.error(err?.body?.error || err?.message || "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.superadmin.users.delete(id),
    onSuccess: () => { toast.success("User deleted"); qc.invalidateQueries({ queryKey: ["sa-users"] }); },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage vendors, admins, and riders across all workspaces</p>
        </div>
        <div className="flex gap-2">
          {editingId && <Button variant="outline" onClick={() => { setEditingId(null); setForm({ email: "", password: "", role: "vendor", projectRef: "" }); }}>Cancel</Button>}
          <Button className="gap-2" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.email.trim() || (!editingId && !form.password) || !form.projectRef.trim()}>
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save" : "Create User"}
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-4"><CardTitle className="text-base font-semibold">{editingId ? "Edit User" : "New User"}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          {!editingId && <Input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />}
          <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            <option value="admin">Admin</option>
            <option value="vendor">Vendor</option>
            <option value="rider">Rider</option>
          </select>
          <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={form.projectRef} onChange={(e) => setForm((f) => ({ ...f, projectRef: e.target.value }))}>
            <option value="">Select workspace...</option>
            {(wsData?.workspaces ?? []).map((w) => <option key={w.projectRef} value={w.projectRef}>{w.name} ({w.projectRef})</option>)}
          </select>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <select className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="vendor">Vendor</option>
          <option value="rider">Rider</option>
        </select>
        <select className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={filterRef} onChange={(e) => setFilterRef(e.target.value)}>
          <option value="">All workspaces</option>
          {(wsData?.workspaces ?? []).map((w) => <option key={w.projectRef} value={w.projectRef}>{w.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : users.length === 0 ? (
        <EmptyState icon={<Users />} title="No users" description="Create a user to get started" />
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u.id} className="shadow-sm border-border/60">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{u.email}</span>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                    <span className="text-[11px] text-muted-foreground">{u.projectRef}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => { setEditingId(u.id); setForm({ email: u.email, password: "", role: u.role, projectRef: u.projectRef }); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Pencil className="size-3.5" /></Button>
                  <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => { if (confirm(`Delete ${u.email}?`)) deleteMutation.mutate(u.id); }}><Trash2 className="size-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
