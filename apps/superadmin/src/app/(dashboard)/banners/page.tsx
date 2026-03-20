"use client";

import { useEffect, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
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
import {
  getPlatformBannerAspectStyle,
  getPlatformBannerImageBackgroundStyle,
  getPlatformBannerImageOnlyBackgroundStyle,
  getPlatformBannerSlideUrls,
  PLATFORM_BANNER_ASPECT_PRESETS,
  PLATFORM_BANNER_PLACEMENTS,
  type PlatformBanner,
  type PlatformBannerAspectPreset,
  type PlatformBannerImageResize,
  type PlatformBannerPlacement,
} from "@delivio/types";
import { api } from "@/lib/api";

const IMAGE_RESIZE_OPTIONS: {
  value: PlatformBannerImageResize;
  label: string;
}[] = [
  { value: "fit", label: "Fit" },
  { value: "stretch", label: "Stretch" },
  { value: "tile", label: "Tile" },
  { value: "center", label: "Center" },
  { value: "span", label: "Span" },
];

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
  carouselEnabled: false,
  imageUrls: [] as string[],
  imageScale: 100,
  imageResize: "center" as PlatformBannerImageResize,
  imageAspectPreset: "auto" as PlatformBannerAspectPreset,
  placement: "home_promotions" as PlatformBannerPlacement,
  bgGradient: "from-orange-500 to-rose-500",
  textColor: "#ffffff",
  sortOrder: 0,
  isActive: true,
  startsAt: "",
  endsAt: "",
};

type BannerForm = typeof emptyForm;

function toDatetimeLocal(iso: string) {
  // Convert stored ISO (UTC) to a `datetime-local` string (local time, no timezone suffix).
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string) {
  // Parse `datetime-local` as local time in the admin browser, then convert to ISO (UTC).
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

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
      if (form.carouselEnabled) {
        const urls = form.imageUrls.map((u) => u.trim()).filter(Boolean);
        if (urls.length === 0) {
          throw new Error("Add at least one image URL for the carousel.");
        }
      }
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        ctaText: form.ctaText.trim() || null,
        ctaLink: form.ctaLink.trim() || null,
        imageUrl: form.carouselEnabled
          ? (form.imageUrls.map((u) => u.trim()).filter(Boolean)[0] ?? null)
          : form.imageUrl.trim() || null,
        imageUrls: form.carouselEnabled
          ? form.imageUrls.map((u) => u.trim()).filter(Boolean)
          : [],
        carouselEnabled: form.carouselEnabled,
        imageScale: form.imageScale,
        imageResize: form.imageResize,
        imageAspectPreset: form.imageAspectPreset,
        placement: form.placement,
        bgGradient: form.bgGradient,
        textColor: form.textColor,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
        startsAt: form.startsAt ? fromDatetimeLocal(form.startsAt) : null,
        endsAt: form.endsAt ? fromDatetimeLocal(form.endsAt) : null,
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
      carouselEnabled: b.carouselEnabled ?? false,
      imageUrls:
        b.carouselEnabled && (b.imageUrls?.length ?? 0) > 0
          ? [...(b.imageUrls ?? [])]
          : [],
      imageScale: b.imageScale ?? 100,
      imageResize: b.imageResize ?? "center",
      imageAspectPreset: b.imageAspectPreset ?? "auto",
      placement: b.placement ?? "home_promotions",
      bgGradient: b.bgGradient,
      textColor: b.textColor,
      sortOrder: b.sortOrder,
      isActive: b.isActive,
      startsAt: b.startsAt ? toDatetimeLocal(b.startsAt) : "",
      endsAt: b.endsAt ? toDatetimeLocal(b.endsAt) : "",
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
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Customer site placement
                </label>
                <select
                  value={form.placement}
                  onChange={(e) =>
                    patch({
                      placement: e.target.value as PlatformBannerPlacement,
                    })
                  }
                  className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  )}
                >
                  {PLATFORM_BANNER_PLACEMENTS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {
                    PLATFORM_BANNER_PLACEMENTS.find(
                      (p) => p.id === form.placement
                    )?.customerArea
                  }
                </p>
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

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Recommended resolution (layout)
                  </label>
                  <select
                    value={form.imageAspectPreset}
                    onChange={(e) =>
                      patch({
                        imageAspectPreset: e.target
                          .value as PlatformBannerAspectPreset,
                      })
                    }
                    className={cn(
                      "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    )}
                  >
                    {PLATFORM_BANNER_ASPECT_PRESETS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label} — {o.pixels}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Common pixel sizes for hero, social, and ad slots. Sets the
                    card aspect ratio on the customer site (Auto keeps flexible
                    height).
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.carouselEnabled}
                      onChange={(e) => {
                        const on = e.target.checked;
                        if (on && form.imageUrls.length === 0) {
                          patch({
                            carouselEnabled: true,
                            imageUrls: form.imageUrl.trim()
                              ? [form.imageUrl]
                              : [""],
                          });
                        } else if (!on) {
                          patch({
                            carouselEnabled: false,
                            imageUrl:
                              form.imageUrls.find((u) => u.trim()) ??
                              form.imageUrl,
                            imageUrls: [],
                          });
                        } else {
                          patch({ carouselEnabled: on });
                        }
                      }}
                      className="size-4 rounded border-border accent-primary"
                    />
                    <span className="font-medium">Carousel</span>
                    <span className="text-xs text-muted-foreground">
                      Rotate multiple background images on this banner
                    </span>
                  </label>
                </div>

                {form.carouselEnabled ? (
                  <div className="sm:col-span-2 space-y-2">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Image URLs (one per slide)
                    </label>
                    {form.imageUrls.map((url, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          placeholder="https://example.com/slide.jpg"
                          value={url}
                          onChange={(e) => {
                            const next = [...form.imageUrls];
                            next[i] = e.target.value;
                            patch({ imageUrls: next });
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={form.imageUrls.length <= 1}
                          title="Remove slide"
                          onClick={() =>
                            patch({
                              imageUrls: form.imageUrls.filter((_, j) => j !== i),
                            })
                          }
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() =>
                        patch({ imageUrls: [...form.imageUrls, ""] })
                      }
                    >
                      <Plus className="size-3.5" />
                      Add slide
                    </Button>
                  </div>
                ) : (
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
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Image resize
                  </label>
                  <select
                    value={form.imageResize}
                    onChange={(e) =>
                      patch({
                        imageResize: e.target
                          .value as PlatformBannerImageResize,
                      })
                    }
                    disabled={
                      !(
                        form.carouselEnabled
                          ? form.imageUrls.some((u) => u.trim())
                          : form.imageUrl.trim()
                      )
                    }
                    className={cn(
                      "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                      "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                  >
                    {IMAGE_RESIZE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <div className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <label>Image scale</label>
                    <span>{form.imageScale}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={200}
                    step={5}
                    value={form.imageScale}
                    onChange={(e) =>
                      patch({ imageScale: parseInt(e.target.value, 10) || 100 })
                    }
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
                    disabled={
                      !(
                        form.carouselEnabled
                          ? form.imageUrls.some((u) => u.trim())
                          : form.imageUrl.trim()
                      )
                    }
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {form.carouselEnabled
                      ? form.imageUrls.some((u) => u.trim())
                      : form.imageUrl.trim()
                      ? "Zoom level for the image layer (works with every resize mode)."
                      : "Add an image URL to enable scaling."}
                  </p>
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
                imageUrls={form.imageUrls}
                carouselEnabled={form.carouselEnabled}
                imageScale={form.imageScale}
                imageResize={form.imageResize}
                imageAspectPreset={form.imageAspectPreset}
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
          {banners.map((b) => {
            const slides = getPlatformBannerSlideUrls(b);
            const thumb = slides[0];
            return (
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
                      thumb
                        ? {
                            backgroundImage: `url(${thumb})`,
                            ...getPlatformBannerImageOnlyBackgroundStyle(
                              b.imageScale ?? 100,
                              b.imageResize
                            ),
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
                        {b.carouselEnabled &&
                          (b.imageUrls?.length ?? 0) > 1 && (
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                            >
                              Carousel
                            </Badge>
                          )}
                      </div>
                      {b.subtitle && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {b.subtitle}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span>
                          Place:{" "}
                          {PLATFORM_BANNER_PLACEMENTS.find(
                            (p) => p.id === (b.placement ?? "home_promotions")
                          )?.label ?? b.placement}
                        </span>
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
            );
          })}
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
  imageUrls,
  carouselEnabled,
  imageScale,
  imageResize,
  imageAspectPreset,
}: {
  title: string;
  subtitle: string;
  ctaText: string;
  bgGradient: string;
  textColor: string;
  imageUrl: string;
  imageUrls: string[];
  carouselEnabled: boolean;
  imageScale: number;
  imageResize: PlatformBannerImageResize;
  imageAspectPreset: PlatformBannerAspectPreset;
}) {
  const slides = getPlatformBannerSlideUrls({
    carouselEnabled,
    imageUrls,
    imageUrl,
  });
  const hasImage = slides.length > 0;
  const useLiveCarousel = Boolean(carouselEnabled && slides.length > 1);
  const [slideIdx, setSlideIdx] = useState(0);

  const slideKey = slides.join("|");
  useEffect(() => {
    setSlideIdx(0);
  }, [slideKey]);

  useEffect(() => {
    if (!useLiveCarousel) return;
    const t = setInterval(
      () => setSlideIdx((i) => (i + 1) % slides.length),
      5500
    );
    return () => clearInterval(t);
  }, [useLiveCarousel, slides.length, slideKey]);

  const aspectStyle = getPlatformBannerAspectStyle(imageAspectPreset);
  const bgStyle = getPlatformBannerImageBackgroundStyle(imageScale, imageResize);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-6",
        hasImage ? "bg-muted" : `bg-gradient-to-r ${bgGradient}`,
        !aspectStyle.aspectRatio && "min-h-[160px]"
      )}
      style={aspectStyle}
    >
      {hasImage && (
        <div className="absolute inset-0 z-0">
          {useLiveCarousel ? (
            slides.map((url, i) => (
              <div
                key={`${url}-${i}`}
                className={cn(
                  "absolute inset-0 transition-opacity duration-500",
                  i === slideIdx ? "opacity-100" : "opacity-0"
                )}
                style={{
                  backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.4), rgba(0,0,0,0.2)), url(${url})`,
                  ...bgStyle,
                }}
              />
            ))
          ) : (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.4), rgba(0,0,0,0.2)), url(${slides[0]})`,
                ...bgStyle,
              }}
            />
          )}
        </div>
      )}

      {useLiveCarousel && (
        <>
          <button
            type="button"
            className="absolute left-2 top-1/2 z-20 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-background"
            aria-label="Previous slide"
            onClick={() =>
              setSlideIdx((i) => (i - 1 + slides.length) % slides.length)
            }
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            className="absolute right-2 top-1/2 z-20 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-background"
            aria-label="Next slide"
            onClick={() =>
              setSlideIdx((i) => (i + 1) % slides.length)
            }
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="pointer-events-none absolute bottom-2 left-0 right-0 z-20 flex justify-center gap-1.5">
            {slides.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  i === slideIdx ? "bg-white" : "bg-white/40"
                )}
              />
            ))}
          </div>
          <span className="absolute right-2 top-2 z-20 rounded-md bg-background/85 px-2 py-0.5 text-[10px] text-muted-foreground backdrop-blur-sm">
            Live · {slideIdx + 1}/{slides.length}
          </span>
        </>
      )}

      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
      <div className="relative z-10">
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
