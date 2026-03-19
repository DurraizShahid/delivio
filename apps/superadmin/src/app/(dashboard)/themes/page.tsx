"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Palette,
  Save,
  Trash2,
  RotateCcw,
  Loader2,
  Monitor,
  Smartphone,
  Globe,
  ChevronDown,
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
  cn,
} from "@delivio/ui";
import type {
  PlatformTheme,
  AppTarget,
  ThemeColors,
  Workspace,
} from "@delivio/types";
import { api } from "@/lib/api";

const APP_TARGETS: { value: AppTarget; label: string; icon: typeof Globe }[] = [
  { value: "global", label: "Global Default", icon: Globe },
  { value: "customer_web", label: "Customer Web", icon: Monitor },
  { value: "rider_web", label: "Rider Web", icon: Monitor },
  { value: "vendor_web", label: "Vendor Web", icon: Monitor },
  { value: "superadmin_web", label: "Superadmin Web", icon: Monitor },
  { value: "customer_mobile", label: "Customer Mobile", icon: Smartphone },
  { value: "rider_mobile", label: "Rider Mobile", icon: Smartphone },
  { value: "vendor_mobile", label: "Vendor Mobile", icon: Smartphone },
];

const COLOR_FIELDS: { key: keyof ThemeColors; label: string; hasFg: boolean }[] =
  [
    { key: "primary", label: "Primary", hasFg: true },
    { key: "secondary", label: "Secondary", hasFg: true },
    { key: "accent", label: "Accent", hasFg: true },
    { key: "background", label: "Background", hasFg: false },
    { key: "foreground", label: "Foreground", hasFg: false },
    { key: "muted", label: "Muted", hasFg: true },
    { key: "destructive", label: "Destructive", hasFg: false },
    { key: "card", label: "Card", hasFg: true },
    { key: "border", label: "Border", hasFg: false },
  ];

const EMPTY_COLORS: ThemeColors = {};

function fgKey(base: keyof ThemeColors): keyof ThemeColors {
  return `${base}Foreground` as keyof ThemeColors;
}

export default function ThemesPage() {
  const qc = useQueryClient();
  const [scope, setScope] = useState<"platform" | string>("platform");
  const [activeTarget, setActiveTarget] = useState<AppTarget>("global");
  const [lightTheme, setLightTheme] = useState<ThemeColors>({});
  const [darkTheme, setDarkTheme] = useState<ThemeColors>({});
  const [dirty, setDirty] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);

  const workspaceId = scope === "platform" ? undefined : scope;

  const { data: wsData } = useQuery<{ workspaces: Workspace[] }>({
    queryKey: ["sa-workspaces"],
    queryFn: () => api.superadmin.workspaces.list(),
  });
  const workspaces = wsData?.workspaces ?? [];

  const {
    data: themesData,
    isLoading,
  } = useQuery<{ themes: PlatformTheme[] }>({
    queryKey: ["sa-themes", workspaceId ?? "platform"],
    queryFn: () => api.superadmin.themes.list(workspaceId),
  });
  const themes = themesData?.themes ?? [];

  const currentTheme = useMemo(
    () => themes.find((t) => t.appTarget === activeTarget) ?? null,
    [themes, activeTarget]
  );

  useEffect(() => {
    setLightTheme(currentTheme?.lightTheme ?? {});
    setDarkTheme(currentTheme?.darkTheme ?? {});
    setDirty(false);
  }, [currentTheme]);

  const updateLight = useCallback(
    (key: keyof ThemeColors, value: string) => {
      setLightTheme((prev) => ({ ...prev, [key]: value }));
      setDirty(true);
    },
    []
  );

  const updateDark = useCallback(
    (key: keyof ThemeColors, value: string) => {
      setDarkTheme((prev) => ({ ...prev, [key]: value }));
      setDirty(true);
    },
    []
  );

  const clearColor = useCallback(
    (mode: "light" | "dark", key: keyof ThemeColors) => {
      if (mode === "light") {
        setLightTheme((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      } else {
        setDarkTheme((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
      setDirty(true);
    },
    []
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      api.superadmin.themes.upsert({
        appTarget: activeTarget,
        workspaceId: workspaceId ?? null,
        lightTheme,
        darkTheme,
      }),
    onSuccess: () => {
      toast.success("Theme saved");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["sa-themes"] });
    },
    onError: (err: any) =>
      toast.error(err?.body?.error || err?.message || "Failed to save"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!currentTheme) throw new Error("No theme to delete");
      return api.superadmin.themes.delete(currentTheme.id);
    },
    onSuccess: () => {
      toast.success("Theme override deleted");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["sa-themes"] });
    },
    onError: (err: any) =>
      toast.error(err?.body?.error || err?.message || "Failed to delete"),
  });

  const hasAnyColor =
    Object.keys(lightTheme).length > 0 || Object.keys(darkTheme).length > 0;

  const scopeLabel =
    scope === "platform"
      ? "Platform Defaults"
      : workspaces.find((w) => w.id === scope)?.name ?? "Workspace";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Themes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage color themes for all apps and web apps
          </p>
        </div>
        <div className="flex gap-2">
          {currentTheme && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              Delete
            </Button>
          )}
          {dirty && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                setLightTheme(currentTheme?.lightTheme ?? {});
                setDarkTheme(currentTheme?.darkTheme ?? {});
                setDirty(false);
              }}
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          )}
          <Button
            size="sm"
            className="gap-2"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !dirty}
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Scope Selector */}
      <Card className="shadow-sm border-border/60">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <span className="text-sm font-medium text-muted-foreground">
            Scope:
          </span>
          <div className="relative">
            <button
              onClick={() => setScopeOpen(!scopeOpen)}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              {scopeLabel}
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </button>
            {scopeOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-xl border border-border/60 bg-card p-1 shadow-lg">
                <button
                  onClick={() => {
                    setScope("platform");
                    setScopeOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors",
                    scope === "platform"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  Platform Defaults
                </button>
                {workspaces.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => {
                      setScope(w.id);
                      setScopeOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors",
                      scope === w.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    {w.name}
                    <span className="ml-auto text-xs opacity-60">
                      {w.projectRef}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* App Target Tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-border/60 bg-muted/50 p-1.5">
        {APP_TARGETS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setActiveTarget(value)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-all",
              activeTarget === value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            )}
          >
            <Icon className="size-3.5" />
            {label}
            {themes.some((t) => t.appTarget === value) && (
              <span className="size-1.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Color Editor */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Light Mode */}
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <span className="size-3 rounded-full border border-border bg-white" />
                  Light Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {COLOR_FIELDS.map(({ key, label, hasFg }) => (
                  <div key={key} className="space-y-1.5">
                    <ColorRow
                      label={label}
                      colorKey={key}
                      value={lightTheme[key] ?? ""}
                      onChange={(v) => updateLight(key, v)}
                      onClear={() => clearColor("light", key)}
                    />
                    {hasFg && (
                      <ColorRow
                        label={`${label} Foreground`}
                        colorKey={fgKey(key)}
                        value={lightTheme[fgKey(key)] ?? ""}
                        onChange={(v) => updateLight(fgKey(key), v)}
                        onClear={() => clearColor("light", fgKey(key))}
                        indent
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Dark Mode */}
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <span className="size-3 rounded-full border border-border bg-zinc-900" />
                  Dark Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {COLOR_FIELDS.map(({ key, label, hasFg }) => (
                  <div key={key} className="space-y-1.5">
                    <ColorRow
                      label={label}
                      colorKey={key}
                      value={darkTheme[key] ?? ""}
                      onChange={(v) => updateDark(key, v)}
                      onClear={() => clearColor("dark", key)}
                    />
                    {hasFg && (
                      <ColorRow
                        label={`${label} Foreground`}
                        colorKey={fgKey(key)}
                        value={darkTheme[fgKey(key)] ?? ""}
                        onChange={(v) => updateDark(fgKey(key), v)}
                        onClear={() => clearColor("dark", fgKey(key))}
                        indent
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          {hasAnyColor && (
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-2">
                  <ThemePreview label="Light" colors={lightTheme} dark={false} />
                  <ThemePreview label="Dark" colors={darkTheme} dark={true} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function ColorRow({
  label,
  colorKey,
  value,
  onChange,
  onClear,
  indent,
}: {
  label: string;
  colorKey: keyof ThemeColors;
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  indent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        indent && "ml-4"
      )}
    >
      <label className="min-w-[140px] text-[13px] text-muted-foreground">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="size-8 cursor-pointer rounded-lg border border-border/60 bg-transparent p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none"
        />
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Not set (inherit)"
        className="h-8 max-w-[160px] text-xs font-mono"
      />
      {value && (
        <button
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Clear"
        >
          &times;
        </button>
      )}
    </div>
  );
}

function ThemePreview({
  label,
  colors,
  dark,
}: {
  label: string;
  colors: ThemeColors;
  dark: boolean;
}) {
  const bg = colors.background || (dark ? "#0a0a0a" : "#ffffff");
  const fg = colors.foreground || (dark ? "#fafafa" : "#0a0a0a");
  const primary = colors.primary || (dark ? "#a0a0a0" : "#171717");
  const primaryFg =
    colors.primaryForeground || (dark ? "#171717" : "#fafafa");
  const secondary = colors.secondary || (dark ? "#262626" : "#f5f5f5");
  const secondaryFg =
    colors.secondaryForeground || (dark ? "#fafafa" : "#171717");
  const muted = colors.muted || (dark ? "#262626" : "#f5f5f5");
  const mutedFg =
    colors.mutedForeground || (dark ? "#a0a0a0" : "#737373");
  const accent = colors.accent || (dark ? "#262626" : "#f5f5f5");
  const destructive = colors.destructive || "#ef4444";
  const card = colors.card || (dark ? "#171717" : "#ffffff");
  const cardFg = colors.cardForeground || fg;
  const border = colors.border || (dark ? "#262626" : "#e5e5e5");

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: bg, color: fg, border: `1px solid ${border}` }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
        {label} Mode Preview
      </p>
      <div
        className="rounded-lg p-3 space-y-2"
        style={{ background: card, color: cardFg, border: `1px solid ${border}` }}
      >
        <p className="text-sm font-semibold">Sample Card</p>
        <p className="text-xs" style={{ color: mutedFg }}>
          This shows how the theme colors appear together.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <span
            className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium"
            style={{ background: primary, color: primaryFg }}
          >
            Primary
          </span>
          <span
            className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium"
            style={{ background: secondary, color: secondaryFg }}
          >
            Secondary
          </span>
          <span
            className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium"
            style={{ background: accent, color: fg }}
          >
            Accent
          </span>
          <span
            className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium"
            style={{ background: destructive, color: "#fff" }}
          >
            Destructive
          </span>
        </div>
        <div
          className="mt-2 rounded-md p-2 text-xs"
          style={{ background: muted, color: mutedFg }}
        >
          Muted content area
        </div>
      </div>
    </div>
  );
}
