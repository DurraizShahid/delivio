"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Loader2, Save, Settings2, Type, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
} from "@delivio/ui";
import type { AppTarget, PlatformTheme, ThemeColors } from "@delivio/types";
import { api } from "@/lib/api";

function mergeLightForBranding(
  existing: ThemeColors | undefined,
  appName: string,
  logoUrl: string,
): ThemeColors {
  const next: ThemeColors = { ...(existing ?? {}) };
  const name = appName.trim();
  const url = logoUrl.trim();
  if (name) next.appName = name;
  else delete next.appName;
  if (url) next.logoUrl = url;
  else delete next.logoUrl;
  return next;
}

export default function PlatformSettingsPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: themesData,
    isLoading,
  } = useQuery<{ themes: PlatformTheme[] }>({
    queryKey: ["sa-themes", "platform"],
    queryFn: () => api.superadmin.themes.list(),
  });

  const themes = themesData?.themes ?? [];
  const globalTheme = useMemo(
    () => themes.find((t) => t.appTarget === ("global" as AppTarget)) ?? null,
    [themes],
  );

  const [appName, setAppName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const g = globalTheme;
    const fromLight = g?.lightTheme;
    setAppName((fromLight?.appName ?? "").trim());
    setLogoUrl((fromLight?.logoUrl ?? "").trim());
    setDirty(false);
  }, [globalTheme]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const light = mergeLightForBranding(
        globalTheme?.lightTheme,
        appName,
        logoUrl,
      );
      return api.superadmin.themes.upsert({
        appTarget: "global",
        workspaceId: null,
        lightTheme: light,
        darkTheme: globalTheme?.darkTheme ?? {},
      });
    },
    onSuccess: () => {
      toast.success("Platform branding saved");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["sa-themes"] });
    },
    onError: (err: unknown) => {
      const body =
        err && typeof err === "object" && "body" in err
          ? (err as { body?: { error?: string } }).body
          : undefined;
      const message =
        body?.error ||
        (err instanceof Error ? err.message : "Failed to save");
      toast.error(message);
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const { logoUrl: uploaded } = await api.superadmin.uploadPlatformLogo(file);
      const cached = qc.getQueryData<{ themes: PlatformTheme[] }>([
        "sa-themes",
        "platform",
      ]);
      const gt =
        cached?.themes?.find((t) => t.appTarget === ("global" as AppTarget)) ??
        globalTheme;
      const light = mergeLightForBranding(gt?.lightTheme, appName, uploaded);
      return api.superadmin.themes.upsert({
        appTarget: "global",
        workspaceId: null,
        lightTheme: light,
        darkTheme: gt?.darkTheme ?? {},
      });
    },
    onSuccess: (data) => {
      const url = data.theme.lightTheme.logoUrl ?? "";
      setLogoUrl(url);
      setDirty(false);
      toast.success("Logo uploaded and applied");
      qc.invalidateQueries({ queryKey: ["sa-themes"] });
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err: unknown) => {
      const body =
        err && typeof err === "object" && "body" in err
          ? (err as { body?: { error?: string } }).body
          : undefined;
      const message =
        body?.error ||
        (err instanceof Error ? err.message : "Upload failed");
      toast.error(message);
    },
  });

  const onFieldChange = useCallback(
    (nextName: string, nextUrl: string) => {
      setAppName(nextName);
      setLogoUrl(nextUrl);
      setDirty(true);
    },
    [],
  );

  const onPickFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChosen = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      uploadLogoMutation.mutate(file);
    },
    [uploadLogoMutation],
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Platform settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          App name and logo apply to customer, rider, and vendor web apps for all workspaces.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Type className="size-4" />
              App name
            </CardTitle>
            <CardDescription>
              Shown in document titles, headers, and sign-in screens across customer, rider, and vendor web.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-10 w-full rounded-lg" />
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="platform-app-name">
                    Display name
                  </label>
                  <Input
                    id="platform-app-name"
                    value={appName}
                    onChange={(e) => onFieldChange(e.target.value, logoUrl)}
                    placeholder="e.g. Acme Food"
                    maxLength={120}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ImageIcon className="size-4" />
              Logo
            </CardTitle>
            <CardDescription>
              Upload PNG, JPEG, or WebP (max 2&nbsp;MB), or paste an HTTPS image URL. Updates favicon and header marks
              on web apps after they refresh theme cache.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-10 w-full rounded-lg" />
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={onFileChosen}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={uploadLogoMutation.isPending}
                    onClick={onPickFile}
                  >
                    {uploadLogoMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    Upload image
                  </Button>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="platform-logo-url">
                    Or image URL
                  </label>
                  <Input
                    id="platform-logo-url"
                    value={logoUrl}
                    onChange={(e) => onFieldChange(appName, e.target.value)}
                    placeholder="https://…"
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                  />
                </div>
                <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div className="flex size-14 items-center justify-center overflow-hidden rounded-xl bg-primary shadow-sm">
                    {logoUrl.trim() ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={logoUrl.trim()}
                        alt=""
                        className="size-full object-contain p-1.5"
                      />
                    ) : (
                      <span className="text-lg font-bold text-primary-foreground">
                        {(appName.trim().charAt(0) || "D").toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 text-sm text-muted-foreground">
                    Production: set <code className="rounded bg-muted px-1 text-xs">PUBLIC_SERVER_URL</code> on the API
                    so uploaded files get the correct public URL.
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button
          className="gap-2"
          disabled={saveMutation.isPending || !dirty || isLoading}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save branding
        </Button>
      </div>

      <Card className="border-dashed border-border/60 bg-muted/20 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Settings2 className="size-3.5" />
            Themes
          </CardTitle>
          <CardDescription className="text-xs">
            Color tokens are still managed under{" "}
            <a href="/themes" className="font-medium text-primary hover:underline">
              Themes
            </a>
            . Branding is stored on the global theme row and merges with per-app overrides.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
