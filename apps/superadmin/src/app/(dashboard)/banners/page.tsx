"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  GripVertical,
  ArrowRight,
  X,
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
  Input,
  Badge,
  Separator,
  cn,
} from "@delivio/ui";
import type { PlatformBanner } from "@delivio/types";
import { api } from "@/lib/api";

const GRADIENT_PRESETS = [
  { label: "Sunset", value: "from-orange-500 to-rose-500" },
  { label: "Ocean", value: "from-blue-500 to-cyan-500" },
  { label: "Purple", value: "from-violet-600 to-indigo-600" },
  { label: "Forest", value: "from-emerald-500 to-teal-500" },
  { label: "Berry", value: "from-pink-500 to-fuchsia-600" },
  { label: "Midnight", value: "from-slate-800 to-slate-900" },
  { label: "Fire", value: "from-red-500 to-orange-500" },
  { label: "Gold", value: "from-amber-400 to-yellow-500" },
  { label: "Primary", value: "from-primary to-primary/80" },
];

const emptyForm = {
  title: "",
  subtitle: "",
  ctaText: "",
  ctaLink: "",
  imageUrl: "",
  bgGradient: "from-orange-500 to-rose-500",
  textColor: "#ffffff",
  sortOrder: 0,
  isActive: true,
  startsAt: "",
  endsAt: "",
};

type BannerForm = typeof emptyForm;

export default function BannersPage() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<BannerForm>({ ...emptyForm });

  const { data, isLoading } = useQuery<{ banners: PlatformBanner[] }>({
    queryKey: ["sa-banners"],
    queryFn: () => api.superadmin.banners.list(),
  });
  const banners = data?.banners ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        ctaText: form.ctaText.trim() || null,
        ctaLink: form.ctaLink.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        bgGradient: form.bgGradient,
        textColor: form.textColor,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      };
      if (editingId) {
        return api.superadmin.banners.update(editingId, payload);
      }
      return api.superadmin.banners.create(payload as Parameters<typeof api.superadmin.banners.create>[0]);
    },
    onSuccess: () => {
      toast.success(editingId ? "Banner updated" : "Banner created");
      resetForm();
      qc.invalidateQueries({ queryKey: ["sa-banners"] });
    },
    onError: (err: any) =>
      toast.error(err?.body?.error || err?.message || "Failed to save"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.superadmin.banners.delete(id),
    onSuccess: () => {
      toast.success("Banner deleted");
      qc.invalidateQueries({ queryKey: ["sa-banners"] });
    },
    onError: (err: any) =>
      toast.error(err?.body?.error || err?.message || "Failed to delete"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.superadmin.banners.update(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sa-banners"] });
    },
  });

  function resetForm() {
    setEditingId(null);
    setShowForm(false);
    setForm({ ...emptyForm });
  }

  function startEdit(b: PlatformBanner) {
    setEditingId(b.id);
    setShowForm(true);
    setForm({
      title: b.title,
      subtitle: b.subtitle ?? "",
      ctaText: b.ctaText ?? "",
      ctaLink: b.ctaLink ?? "",
      imageUrl: b.imageUrl ?? "",
      bgGradient: b.bgGradient,
      textColor: b.textColor,
      sortOrder: b.sortOrder,
      isActive: b.isActive,
      startsAt: b.startsAt ? b.startsAt.slice(0, 16) : "",
      endsAt: b.endsAt ? b.endsAt.slice(0, 16) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function patch(updates: Partial<BannerForm>) {
    setForm((f) => ({ ...f, ...updates }));
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Banners</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage promotional banners shown on the customer website
          </p>
        </div>
        {!showForm && (
          <Button
            className="gap-2"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus className="size-4" />
            New Banner
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">
              {editingId ? "Edit Banner" : "New Banner"}
            </CardTitle>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic info */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Title *
                </label>
                <Input
                  placeholder="e.g. 20% off your first order"
                  value={form.title}
                  onChange={(e) => patch({ title: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Subtitle
                </label>
                <Input
                  placeholder="e.g. Use code WELCOME20 at checkout"
                  value={form.subtitle}
                  onChange={(e) => patch({ subtitle: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  CTA Button Text
                </label>
                <Input
                  placeholder="e.g. Order now"
                  value={form.ctaText}
                  onChange={(e) => patch({ ctaText: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  CTA Link URL
                </label>
                <Input
                  placeholder="e.g. /restaurant/demo"
                  value={form.ctaLink}
                  onChange={(e) => patch({ ctaLink: e.target.value })}
                />
              </div>
            </div>

            <Separator />

            {/* Styling */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">Appearance</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Gradient presets */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">
                    Background Gradient
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {GRADIENT_PRESETS.map(({ label, value }) => (
                      <button
                        key={value}
                        onClick={() => patch({ bgGradient: value })}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                          form.bgGradient === value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/60 hover:border-border hover:bg-muted"
                        )}
                      >
                        <div
                          className={cn(
                            "size-4 rounded-full bg-gradient-to-r",
                            value
                          )}
                        />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom gradient */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Custom Gradient (Tailwind classes)
                  </label>
                  <Input
                    placeholder="from-blue-500 to-purple-600"
                    value={form.bgGradient}
                    onChange={(e) => patch({ bgGradient: e.target.value })}
                  />
                </div>

                {/* Text color */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Text Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.textColor}
                      onChange={(e) => patch({ textColor: e.target.value })}
                      className="size-9 cursor-pointer rounded border border-border/60"
                    />
                    <Input
                      value={form.textColor}
                      onChange={(e) => patch({ textColor: e.target.value })}
                      className="flex-1"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                {/* Image URL */}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Background Image URL (optional, overrides gradient)
                  </label>
                  <Input
                    placeholder="https://example.com/banner.jpg"
                    value={form.imageUrl}
                    onChange={(e) => patch({ imageUrl: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Scheduling & ordering */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">Scheduling</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Sort Order
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(e) =>
                      patch({ sortOrder: parseInt(e.target.value, 10) || 0 })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Starts At
                  </label>
                  <Input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => patch({ startsAt: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Ends At
                  </label>
                  <Input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => patch({ endsAt: e.target.value })}
                  />
                </div>
              </div>

              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => patch({ isActive: e.target.checked })}
                  className="size-4 rounded border-border accent-primary"
                />
                <span className="font-medium">Active</span>
                <span className="text-xs text-muted-foreground">
                  (inactive banners are hidden from customers)
                </span>
              </label>
            </div>

            <Separator />

            {/* Live preview */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">Preview</h3>
              <BannerPreview
                title={form.title || "Banner title"}
                subtitle={form.subtitle}
                ctaText={form.ctaText}
                bgGradient={form.bgGradient}
                textColor={form.textColor}
                imageUrl={form.imageUrl}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                className="gap-2"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !form.title.trim()}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                {editingId ? "Update Banner" : "Create Banner"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Banner list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <EmptyState
          icon={<Megaphone />}
          title="No banners"
          description="Create promotional banners to display on the customer website"
        />
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <Card
              key={b.id}
              className={cn(
                "border-border/60 shadow-sm transition-opacity",
                !b.isActive && "opacity-60"
              )}
            >
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  {/* Mini banner preview */}
                  <div
                    className={cn(
                      "flex w-40 shrink-0 items-center justify-center rounded-l-xl bg-gradient-to-r p-4 sm:w-56",
                      b.bgGradient
                    )}
                    style={
                      b.imageUrl
                        ? {
                            backgroundImage: `url(${b.imageUrl})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : undefined
                    }
                  >
                    <span
                      className="text-center text-xs font-bold leading-tight sm:text-sm"
                      style={{ color: b.textColor }}
                    >
                      {b.title}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 items-center justify-between gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold">
                          {b.title}
                        </h3>
                        {b.isActive ? (
                          <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 text-[10px]">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      {b.subtitle && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {b.subtitle}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span>Order: {b.sortOrder}</span>
                        {b.ctaText && <span>CTA: {b.ctaText}</span>}
                        {b.startsAt && (
                          <span>
                            From:{" "}
                            {new Date(b.startsAt).toLocaleDateString()}
                          </span>
                        )}
                        {b.endsAt && (
                          <span>
                            Until:{" "}
                            {new Date(b.endsAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() =>
                          toggleMutation.mutate({
                            id: b.id,
                            isActive: !b.isActive,
                          })
                        }
                        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title={b.isActive ? "Deactivate" : "Activate"}
                      >
                        {b.isActive ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                      <button
                        onClick={() => startEdit(b)}
                        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Edit"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this banner?")) {
                            deleteMutation.mutate(b.id);
                          }
                        }}
                        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function BannerPreview({
  title,
  subtitle,
  ctaText,
  bgGradient,
  textColor,
  imageUrl,
}: {
  title: string;
  subtitle: string;
  ctaText: string;
  bgGradient: string;
  textColor: string;
  imageUrl: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-r p-6",
        bgGradient
      )}
      style={
        imageUrl
          ? {
              backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.4), rgba(0,0,0,0.2)), url(${imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent_50%)]"
      />
      <div className="relative">
        <h3
          className="text-xl font-bold leading-tight"
          style={{ color: textColor }}
        >
          {title}
        </h3>
        {subtitle && (
          <p className="mt-1 text-sm" style={{ color: textColor, opacity: 0.8 }}>
            {subtitle}
          </p>
        )}
        {ctaText && (
          <div
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold"
            style={{ color: textColor }}
          >
            {ctaText}
            <ArrowRight className="size-4" />
          </div>
        )}
      </div>
    </div>
  );
}
