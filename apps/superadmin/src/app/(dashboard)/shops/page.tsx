"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Store, Plus, Pencil, Loader2, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Skeleton, EmptyState, Input, Badge,
} from "@delivio/ui";
import type { Shop, Workspace } from "@delivio/types";
import { api } from "@/lib/api";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function ShopsPage() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ projectRef: "", name: "", slug: "", description: "", address: "", phone: "" });
  const [filterRef, setFilterRef] = useState("");

  const { data: wsData } = useQuery<{ workspaces: Workspace[] }>({
    queryKey: ["sa-workspaces"],
    queryFn: () => api.superadmin.workspaces.list(),
  });

  const { data, isLoading } = useQuery<{ shops: Shop[] }>({
    queryKey: ["sa-shops", filterRef],
    queryFn: () => api.superadmin.shops.list({ projectRef: filterRef || undefined, limit: 200 }),
  });
  const shops = data?.shops ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        return api.superadmin.shops.update(editingId, {
          name: form.name.trim() || undefined,
          slug: form.slug.trim() || undefined,
          description: form.description.trim() || null,
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
        });
      }
      return api.superadmin.shops.create({
        projectRef: form.projectRef,
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        description: form.description.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success(editingId ? "Shop updated" : "Shop created");
      setEditingId(null);
      setForm({ projectRef: "", name: "", slug: "", description: "", address: "", phone: "" });
      qc.invalidateQueries({ queryKey: ["sa-shops"] });
    },
    onError: (err: any) => toast.error(err?.body?.error || err?.message || "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.superadmin.shops.delete(id),
    onSuccess: () => {
      toast.success("Shop deleted");
      qc.invalidateQueries({ queryKey: ["sa-shops"] });
      qc.invalidateQueries({ queryKey: ["superadmin-stats"] });
    },
    onError: (err: any) => toast.error(err?.body?.error || err?.message || "Failed to delete"),
  });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shops</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage shops across all workspaces</p>
        </div>
        <div className="flex gap-2">
          {editingId && <Button variant="outline" onClick={() => { setEditingId(null); setForm({ projectRef: "", name: "", slug: "", description: "", address: "", phone: "" }); }}>Cancel</Button>}
          <Button className="gap-2" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name.trim() || (!editingId && !form.projectRef)}>
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save" : "Create Shop"}
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-4"><CardTitle className="text-base font-semibold">{editingId ? "Edit Shop" : "New Shop"}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {!editingId && (
            <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={form.projectRef} onChange={(e) => setForm((f) => ({ ...f, projectRef: e.target.value }))}>
              <option value="">Select workspace...</option>
              {(wsData?.workspaces ?? []).map((w) => <option key={w.projectRef} value={w.projectRef}>{w.name} ({w.projectRef})</option>)}
            </select>
          )}
          <Input placeholder="Shop name" value={form.name} onChange={(e) => { const n = e.target.value; setForm((f) => ({ ...f, name: n, slug: editingId ? f.slug : slugify(n) })); }} />
          <Input placeholder="Slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          <Input placeholder="Address (optional)" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          <Input placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <Input className="md:col-span-2" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <select className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={filterRef} onChange={(e) => setFilterRef(e.target.value)}>
          <option value="">All workspaces</option>
          {(wsData?.workspaces ?? []).map((w) => <option key={w.projectRef} value={w.projectRef}>{w.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : shops.length === 0 ? (
        <EmptyState icon={<Store />} title="No shops" description="Create a shop in a workspace" />
      ) : (
        <div className="space-y-2">
          {shops.map((s) => (
            <Card key={s.id} className="shadow-sm border-border/60">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{s.name}</span>
                    <Badge variant={s.isActive ? "default" : "secondary"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                    <span className="text-[11px] text-muted-foreground">{s.projectRef}</span>
                  </div>
                  {s.address && <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{s.address}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setEditingId(s.id);
                      setForm({ projectRef: s.projectRef, name: s.name, slug: s.slug, description: s.description ?? "", address: s.address ?? "", phone: s.phone ?? "" });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={deleteMutation.isPending}
                    aria-label="Edit shop"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive"
                    onClick={() => {
                      if (deleteMutation.isPending) return;
                      if (confirm(`Delete shop "${s.name}"?`)) {
                        if (editingId === s.id) {
                          setEditingId(null);
                          setForm({ projectRef: "", name: "", slug: "", description: "", address: "", phone: "" });
                        }
                        deleteMutation.mutate(s.id);
                      }
                    }}
                    aria-label="Delete shop"
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
