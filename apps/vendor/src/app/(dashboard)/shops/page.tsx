"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Store,
  Plus,
  Pencil,
  MapPin,
  Phone,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  EmptyState,
  Badge,
  Input,
} from "@delivio/ui";
import type { Shop, GeoPolygon } from "@delivio/types";
import { api } from "@/lib/api";
import { GeofenceDrawerMap } from "@/components/map";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function ShopsPage() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    address: "",
    phone: "",
    lat: null as number | null,
    lon: null as number | null,
    deliveryGeofence: null as GeoPolygon | null,
  });

  const { data, isLoading } = useQuery<{ shops: Shop[] }>({
    queryKey: ["shops", "all"],
    queryFn: () => api.shops.list({ includeInactive: true }),
  });
  const shops = data?.shops ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        description: form.description.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        lat: form.lat,
        lon: form.lon,
        deliveryGeofence: form.deliveryGeofence,
      };
      return editingId
        ? api.shops.update(editingId, payload)
        : api.shops.create(payload as any);
    },
    onSuccess: () => {
      toast.success(editingId ? "Shop updated" : "Shop created");
      setEditingId(null);
      setForm({ name: "", slug: "", description: "", address: "", phone: "", lat: null, lon: null, deliveryGeofence: null });
      qc.invalidateQueries({ queryKey: ["shops"] });
      qc.invalidateQueries({ queryKey: ["shops", "all"] });
    },
    onError: (err: any) => {
      toast.error(err?.body?.error || err?.message || "Failed to save shop");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.shops.update(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shops"] });
      qc.invalidateQueries({ queryKey: ["shops", "all"] });
    },
  });

  function startEdit(shop: Shop) {
    setEditingId(shop.id);
    setForm({
      name: shop.name,
      slug: shop.slug,
      description: shop.description ?? "",
      address: shop.address ?? "",
      phone: shop.phone ?? "",
      lat: shop.lat ?? null,
      lon: shop.lon ?? null,
      deliveryGeofence: shop.deliveryGeofence ?? null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ name: "", slug: "", description: "", address: "", phone: "", lat: null, lon: null, deliveryGeofence: null });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shops</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your branches and locations
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {editingId && (
            <Button variant="outline" onClick={cancelEdit} disabled={saveMutation.isPending}>
              Cancel
            </Button>
          )}
          <Button
            className="gap-2"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.name.trim()}
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {editingId ? "Save Changes" : "Add Shop"}
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">
            {editingId ? "Edit Shop" : "New Shop"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Shop name"
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => ({
                  ...f,
                  name,
                  slug: editingId ? f.slug : slugify(name),
                }));
              }}
            />
            <Input
              placeholder="Slug (URL-friendly)"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            />
            <Input
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
            <Input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <Input
              className="md:col-span-2"
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              Location &amp; Delivery Zone
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Click the map to set the shop location. Use the polygon tool (top-right) to draw the delivery zone.
            </p>
            <GeofenceDrawerMap
              key={editingId ?? "new"}
              lat={form.lat}
              lon={form.lon}
              geofence={form.deliveryGeofence}
              onLocationChange={(lat, lon) =>
                setForm((f) => ({ ...f, lat, lon }))
              }
              onGeofenceChange={(geofence) =>
                setForm((f) => ({ ...f, deliveryGeofence: geofence }))
              }
            />
            {form.lat != null && form.lon != null && (
              <p className="mt-2 text-xs text-muted-foreground">
                Pin: {form.lat.toFixed(6)}, {form.lon.toFixed(6)}
                {form.deliveryGeofence ? " | Delivery zone drawn" : " | No delivery zone drawn yet"}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : shops.length === 0 ? (
        <EmptyState
          icon={<Store />}
          title="No shops yet"
          description="Add your first shop to start managing branches"
        />
      ) : (
        <div className="space-y-3">
          {shops.map((shop) => (
            <Card key={shop.id} className="shadow-sm border-border/60">
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold truncate">{shop.name}</h3>
                    <Badge variant={shop.isActive ? "default" : "secondary"}>
                      {shop.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {shop.deliveryGeofence && (
                      <Badge variant="outline" className="text-[10px]">Geofenced</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {shop.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {shop.address}
                      </span>
                    )}
                    {shop.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="size-3" />
                        {shop.phone}
                      </span>
                    )}
                    <span className="text-muted-foreground/50">
                      /{shop.slug}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      toggleMutation.mutate({
                        id: shop.id,
                        isActive: !shop.isActive,
                      })
                    }
                    disabled={toggleMutation.isPending}
                    aria-label={shop.isActive ? "Deactivate" : "Activate"}
                  >
                    {shop.isActive ? (
                      <ToggleRight className="size-4 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="size-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => startEdit(shop)}
                    aria-label="Edit shop"
                  >
                    <Pencil className="size-3.5" />
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
