"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Globe,
  ImageIcon,
  LifeBuoy,
  Loader2,
  Mail,
  Save,
  Settings2,
  Type,
  Upload,
  X,
} from "lucide-react";
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
  Separator,
} from "@delivio/ui";
import type { AppTarget, PlatformTheme, ThemeColors } from "@delivio/types";
import { api } from "@/lib/api";

type BrandingForm = {
  appName: string;
  logoUrl: string;
  faviconUrl: string;
  wordmarkUrl: string;
  ogImageUrl: string;
  supportEmail: string;
  helpUrl: string;
};

type AssetUrlKey = "logoUrl" | "faviconUrl" | "wordmarkUrl" | "ogImageUrl";

const EMPTY_FORM: BrandingForm = {
  appName: "",
  logoUrl: "",
  faviconUrl: "",
  wordmarkUrl: "",
  ogImageUrl: "",
  supportEmail: "",
  helpUrl: "",
};

function buildLightTheme(
  existing: ThemeColors | undefined,
  form: BrandingForm,
): ThemeColors {
  const next: ThemeColors = { ...(existing ?? {}) };
  const setOrDel = (key: keyof ThemeColors, value: string) => {
    const t = value.trim();
    if (t) (next as Record<string, string>)[key as string] = t;
    else delete (next as Record<string, unknown>)[key as string];
  };
  setOrDel("appName", form.appName);
  setOrDel("logoUrl", form.logoUrl);
  setOrDel("faviconUrl", form.faviconUrl);
  setOrDel("wordmarkUrl", form.wordmarkUrl);
  setOrDel("ogImageUrl", form.ogImageUrl);
  setOrDel("supportEmail", form.supportEmail);
  setOrDel("helpUrl", form.helpUrl);
  return next;
}

function formFromLightTheme(light: ThemeColors | undefined): BrandingForm {
  const g = (k: keyof ThemeColors) => (light?.[k] != null ? String(light[k]).trim() : "");
  return {
    appName: g("appName"),
    logoUrl: g("logoUrl"),
    faviconUrl: g("faviconUrl"),
    wordmarkUrl: g("wordmarkUrl"),
    ogImageUrl: g("ogImageUrl"),
    supportEmail: g("supportEmail"),
    helpUrl: g("helpUrl"),
  };
}

export default function PlatformSettingsPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<AssetUrlKey | null>(null);
  const formRef = useRef<BrandingForm>(EMPTY_FORM);

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

  const [form, setForm] = useState<BrandingForm>(EMPTY_FORM);
  const [dirty, setDirty] = useState(false);
  const [activeUploadField, setActiveUploadField] = useState<AssetUrlKey | null>(null);

  formRef.current = form;

  useEffect(() => {
    const next = formFromLightTheme(globalTheme?.lightTheme);
    setForm(next);
    setDirty(false);
  }, [globalTheme]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const light = buildLightTheme(globalTheme?.lightTheme, formRef.current);
      return api.superadmin.themes.upsert({
        appTarget: "global",
        workspaceId: null,
        lightTheme: light,
        darkTheme: globalTheme?.darkTheme ?? {},
      });
    },
    onSuccess: () => {
      toast.success("Branding saved");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["sa-themes"] });
    },
    onError: (err: unknown) => {
      const body =
        err && typeof err === "object" && "body" in err
          ? (err as { body?: { error?: string } }).body
          : undefined;
      toast.error(body?.error || (err instanceof Error ? err.message : "Failed to save"));
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      field,
    }: {
      file: File;
      field: AssetUrlKey;
    }) => {
      const { logoUrl: uploaded } = await api.superadmin.uploadPlatformLogo(file);
      const cached = qc.getQueryData<{ themes: PlatformTheme[] }>([
        "sa-themes",
        "platform",
      ]);
      const gt =
        cached?.themes?.find((t) => t.appTarget === ("global" as AppTarget)) ??
        globalTheme;
      const mergedForm = { ...formRef.current, [field]: uploaded };
      const light = buildLightTheme(gt?.lightTheme, mergedForm);
      return api.superadmin.themes.upsert({
        appTarget: "global",
        workspaceId: null,
        lightTheme: light,
        darkTheme: gt?.darkTheme ?? {},
      });
    },
    onSuccess: (data) => {
      const next = formFromLightTheme(data.theme.lightTheme);
      setForm(next);
      setDirty(false);
      toast.success("Image uploaded and saved");
      qc.invalidateQueries({ queryKey: ["sa-themes"] });
      if (fileInputRef.current) fileInputRef.current.value = "";
      uploadTargetRef.current = null;
    },
    onSettled: () => setActiveUploadField(null),
    onError: (err: unknown) => {
      const body =
        err && typeof err === "object" && "body" in err
          ? (err as { body?: { error?: string } }).body
          : undefined;
      toast.error(body?.error || (err instanceof Error ? err.message : "Upload failed"));
    },
  });

  const patchForm = useCallback((partial: Partial<BrandingForm>) => {
    setForm((prev) => ({ ...prev, ...partial }));
    setDirty(true);
  }, []);

  const clearAsset = useCallback((key: AssetUrlKey) => {
    patchForm({ [key]: "" });
  }, [patchForm]);

  const openUpload = useCallback((field: AssetUrlKey) => {
    setActiveUploadField(field);
    uploadTargetRef.current = field;
    fileInputRef.current?.click();
  }, []);

  const onFileChosen = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const field = uploadTargetRef.current;
      if (!file || !field) {
        setActiveUploadField(null);
        return;
      }
      uploadMutation.mutate({ file, field });
    },
    [uploadMutation],
  );

  const AssetRow = ({
    label,
    description,
    field,
    urlValue,
  }: {
    label: string;
    description: string;
    field: AssetUrlKey;
    urlValue: string;
  }) => (
    <div className="space-y-3 rounded-xl border border-border/50 bg-background/50 p-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={uploadMutation.isPending}
          onClick={() => openUpload(field)}
        >
          {uploadMutation.isPending && activeUploadField === field ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          Upload
        </Button>
        {urlValue.trim() ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            onClick={() => clearAsset(field)}
          >
            <X className="size-3.5" />
            Clear
          </Button>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <span className="text-xs text-muted-foreground">Image URL</span>
        <Input
          value={urlValue}
          onChange={(e) => patchForm({ [field]: e.target.value } as Partial<BrandingForm>)}
          placeholder="https://…"
          className="font-mono text-xs"
          autoComplete="off"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Platform settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Identity, marketing images, and support links apply to customer, rider, and vendor web apps. Theme colors
          stay under{" "}
          <a href="/themes" className="font-medium text-primary hover:underline">
            Themes
          </a>
          .
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          <strong className="font-medium text-foreground">Uploads</strong> save to the server and update branding
          immediately. Use <strong className="font-medium text-foreground">Save branding</strong> for text fields
          and pasted URLs only.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={onFileChosen}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Type className="size-4" />
              Platform identity
            </CardTitle>
            <CardDescription>App name shown in titles, headers, and sign-in screens.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-10 w-full max-w-md rounded-lg" />
            ) : (
              <div className="max-w-md space-y-2">
                <label htmlFor="platform-app-name" className="text-sm font-medium">
                  Display name
                </label>
                <Input
                  id="platform-app-name"
                  value={form.appName}
                  onChange={(e) => patchForm({ appName: e.target.value })}
                  placeholder="e.g. Acme Food"
                  maxLength={120}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ImageIcon className="size-4" />
              Branding &amp; chrome
            </CardTitle>
            <CardDescription>
              Square mark for headers, optional favicon, horizontal wordmark, and social preview image (1200×630
              recommended for OG). PNG, JPEG, or WebP — max 2&nbsp;MB per upload.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <Skeleton className="h-40 w-full rounded-xl" />
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <AssetRow
                    label="Header icon (square)"
                    description="Compact mark beside the wordmark or app name."
                    field="logoUrl"
                    urlValue={form.logoUrl}
                  />
                  <AssetRow
                    label="Wordmark (horizontal)"
                    description="Wide logo image; replaces text name in headers when set."
                    field="wordmarkUrl"
                    urlValue={form.wordmarkUrl}
                  />
                  <AssetRow
                    label="Favicon"
                    description="Browser tab icon. Falls back to the header icon if empty."
                    field="faviconUrl"
                    urlValue={form.faviconUrl}
                  />
                  <AssetRow
                    label="Open Graph / social image"
                    description="Default image when links are shared (see also server-side metadata on web apps)."
                    field="ogImageUrl"
                    urlValue={form.ogImageUrl}
                  />
                </div>
                <Separator />
                <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary shadow-sm">
                    {form.logoUrl.trim() ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={form.logoUrl.trim()}
                        alt=""
                        className="size-full object-contain p-1.5"
                      />
                    ) : (
                      <span className="text-lg font-bold text-primary-foreground">
                        {(form.appName.trim().charAt(0) || "D").toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-h-14 min-w-0 flex-1 flex-col justify-center">
                    {form.wordmarkUrl.trim() ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={form.wordmarkUrl.trim()}
                        alt=""
                        className="h-8 w-auto max-w-full object-contain object-left"
                      />
                    ) : (
                      <span className="text-lg font-semibold tracking-tight">
                        {form.appName || "App name"}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <LifeBuoy className="size-4" />
              Support
            </CardTitle>
            <CardDescription>Shown in customer footer and “Need help?” on sign-in flows.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {isLoading ? (
              <>
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label
                    htmlFor="support-email"
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <Mail className="size-3.5 text-muted-foreground" />
                    Support email
                  </label>
                  <Input
                    id="support-email"
                    type="email"
                    value={form.supportEmail}
                    onChange={(e) => patchForm({ supportEmail: e.target.value })}
                    placeholder="support@example.com"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="help-url" className="flex items-center gap-2 text-sm font-medium">
                    <Globe className="size-3.5 text-muted-foreground" />
                    Help center URL
                  </label>
                  <Input
                    id="help-url"
                    type="url"
                    value={form.helpUrl}
                    onChange={(e) => patchForm({ helpUrl: e.target.value })}
                    placeholder="https://…"
                    autoComplete="off"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-dashed border-border/60 bg-muted/15 shadow-none lg:col-span-2">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Deployment</CardTitle>
            <CardDescription className="text-xs">
              Set <code className="rounded bg-muted px-1">PUBLIC_SERVER_URL</code> on the API to the public origin
              (e.g. your Railway URL) so uploaded assets return correct absolute URLs. Uploaded files live on the
              server disk unless you use external URLs — configure a volume in production if you need persistence across
              deploys.
            </CardDescription>
          </CardHeader>
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

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Settings2 className="size-3.5" />
            Related
          </CardTitle>
          <CardDescription className="text-xs">
            Color tokens:{" "}
            <a href="/themes" className="font-medium text-primary hover:underline">
              Themes
            </a>
            . Promotions:{" "}
            <a href="/banners" className="font-medium text-primary hover:underline">
              Banners
            </a>
            .
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
