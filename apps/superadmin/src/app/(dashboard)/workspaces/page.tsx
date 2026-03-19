"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Pencil, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Skeleton, EmptyState, Input,
} from "@delivio/ui";
import type { Workspace } from "@delivio/types";
import { api } from "@/lib/api";

export default function WorkspacesPage() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ projectRef: "", name: "", description: "", address: "", phone: "" });

  const { data, isLoading } = useQuery<{ workspaces: Workspace[] }>({
    queryKey: ["sa-workspaces"],
    queryFn: () => api.superadmin.workspaces.list(),
  });
  const workspaces = data?.workspaces ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        return api.superadmin.workspaces.update(editingId, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
        });
      }
      return api.superadmin.workspaces.create({
        projectRef: form.projectRef.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success(editingId ? "Workspace updated" : "Workspace created");
      setEditingId(null);
      setForm({ projectRef: "", name: "", description: "", address: "", phone: "" });
      qc.invalidateQueries({ queryKey: ["sa-workspaces"] });
    },
    onError: (err: any) => toast.error(err?.body?.error || err?.message || "Failed to save"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.superadmin.workspaces.delete(id),
    onSuccess: () => {
      toast.success("Workspace deleted");
      qc.invalidateQueries({ queryKey: ["sa-workspaces"] });
      qc.invalidateQueries({ queryKey: ["superadmin-stats"] });
      // Workspace deletion impacts multiple resources across the dashboard.
      qc.invalidateQueries({ queryKey: ["sa-shops"] });
      qc.invalidateQueries({ queryKey: ["sa-users"] });
      qc.invalidateQueries({ queryKey: ["sa-customers"] });
      qc.invalidateQueries({ queryKey: ["sa-orders"] });
    },
    onError: (err: any) => toast.error(err?.body?.error || err?.message || "Failed to delete"),
  });

  function startEdit(w: Workspace) {
    setEditingId(w.id);
    setForm({ projectRef: w.projectRef, name: w.name, description: w.description ?? "", address: w.address ?? "", phone: w.phone ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workspaces</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage vendor brands and workspaces</p>
        </div>
        <div className="flex gap-2">
          {editingId && <Button variant="outline" onClick={() => { setEditingId(null); setForm({ projectRef: "", name: "", description: "", address: "", phone: "" }); }}>Cancel</Button>}
          <Button className="gap-2" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name.trim() || (!editingId && !form.projectRef.trim())}>
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save" : "Create Workspace"}
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-4"><CardTitle className="text-base font-semibold">{editingId ? "Edit Workspace" : "New Workspace"}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {!editingId && <Input placeholder="Project ref (slug)" value={form.projectRef} onChange={(e) => setForm((f) => ({ ...f, projectRef: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} />}
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={editingId ? "md:col-span-2" : ""} />
          <Input placeholder="Address (optional)" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          <Input placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <Input className="md:col-span-2" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : workspaces.length === 0 ? (
        <EmptyState icon={<Building2 />} title="No workspaces" description="Create a workspace to onboard a new vendor" />
      ) : (
        <div className="space-y-3">
          {workspaces.map((w) => (
            <Card key={w.id} className="shadow-sm border-border/60">
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{w.name}</h3>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{w.projectRef}</span>
                  </div>
                  {w.description && <p className="mt-0.5 text-xs text-muted-foreground truncate">{w.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => startEdit(w)} aria-label="Edit" disabled={deleteMutation.isPending}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive"
                    onClick={() => {
                      if (deleteMutation.isPending) return;
                      if (confirm(`Delete workspace "${w.name}"?`)) {
                        if (editingId === w.id) {
                          setEditingId(null);
                          setForm({ projectRef: "", name: "", description: "", address: "", phone: "" });
                        }
                        deleteMutation.mutate(w.id);
                      }
                    }}
                    aria-label="Delete workspace"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
