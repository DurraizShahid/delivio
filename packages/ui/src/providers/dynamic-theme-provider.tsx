"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface ThemeColors {
  primary?: string;
  primaryForeground?: string;
  secondary?: string;
  secondaryForeground?: string;
  accent?: string;
  accentForeground?: string;
  background?: string;
  foreground?: string;
  muted?: string;
  mutedForeground?: string;
  destructive?: string;
  card?: string;
  cardForeground?: string;
  border?: string;
}

interface ResolvedThemePayload {
  light: ThemeColors;
  dark: ThemeColors;
  appName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  wordmarkUrl?: string;
  ogImageUrl?: string;
  supportEmail?: string;
  helpUrl?: string;
}

export interface PlatformBranding {
  appName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  wordmarkUrl: string | null;
  ogImageUrl: string | null;
  supportEmail: string | null;
  helpUrl: string | null;
}

function emptyBranding(fallbackAppName: string): PlatformBranding {
  return {
    appName: fallbackAppName,
    logoUrl: null,
    faviconUrl: null,
    wordmarkUrl: null,
    ogImageUrl: null,
    supportEmail: null,
    helpUrl: null,
  };
}

function payloadToBranding(
  t: Partial<ResolvedThemePayload>,
  fallbackAppName: string,
): PlatformBranding {
  const s = (v: unknown) => (v != null && String(v).trim() !== "" ? String(v).trim() : null);
  return {
    appName: s(t.appName) || fallbackAppName,
    logoUrl: s(t.logoUrl),
    faviconUrl: s(t.faviconUrl),
    wordmarkUrl: s(t.wordmarkUrl),
    ogImageUrl: s(t.ogImageUrl),
    supportEmail: s(t.supportEmail),
    helpUrl: s(t.helpUrl),
  };
}

const BrandingContext = createContext<PlatformBranding | null>(null);

export function usePlatformBranding(): PlatformBranding {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error("usePlatformBranding must be used within DynamicThemeProvider");
  }
  return ctx;
}

const TOKEN_TO_VAR: Record<keyof ThemeColors, string> = {
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  background: "--background",
  foreground: "--foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  destructive: "--destructive",
  card: "--card",
  cardForeground: "--card-foreground",
  border: "--border",
};

const CACHE_KEY = "delivio-theme-cache";

const TOKEN_MAP_JSON = JSON.stringify(TOKEN_TO_VAR);

/**
 * Inline script that runs synchronously before React hydrates.
 * Reads the cached theme from localStorage and injects CSS variables
 * immediately to prevent flash of default colors.
 */
const BLOCKING_SCRIPT = `
(function(){
  try {
    var c = localStorage.getItem("${CACHE_KEY}");
    if (!c) return;
    var t = JSON.parse(c);
    var m = ${TOKEN_MAP_JSON};
    var rules = [];
    function build(colors, sel) {
      if (!colors) return;
      var d = [];
      for (var k in m) { if (colors[k]) d.push(m[k] + ": " + colors[k] + ";"); }
      if (d.length) rules.push(sel + " { " + d.join(" ") + " }");
    }
    build(t.light, ":root");
    build(t.dark, ".dark");
    if (rules.length) {
      var s = document.createElement("style");
      s.id = "delivio-dynamic-theme";
      s.textContent = rules.join("\\n");
      document.head.appendChild(s);
    }
  } catch(e) {}
})();
`;

function buildCSS(colors: ThemeColors, selector: string): string {
  const declarations: string[] = [];
  for (const [token, cssVar] of Object.entries(TOKEN_TO_VAR)) {
    const value = colors[token as keyof ThemeColors];
    if (value) {
      declarations.push(`${cssVar}: ${value};`);
    }
  }
  if (declarations.length === 0) return "";
  return `${selector} { ${declarations.join(" ")} }`;
}

function injectTheme(theme: Pick<ResolvedThemePayload, "light" | "dark">) {
  let styleEl = document.getElementById("delivio-dynamic-theme") as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "delivio-dynamic-theme";
    document.head.appendChild(styleEl);
  }

  const rules: string[] = [];
  const lightCSS = buildCSS(theme.light, ":root");
  if (lightCSS) rules.push(lightCSS);

  const darkCSS = buildCSS(theme.dark, ".dark");
  if (darkCSS) rules.push(darkCSS);

  styleEl.textContent = rules.join("\n");
}

function readCachedBranding(fallbackAppName: string): PlatformBranding {
  if (typeof window === "undefined") {
    return emptyBranding(fallbackAppName);
  }
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return emptyBranding(fallbackAppName);
    const t = JSON.parse(raw) as Partial<ResolvedThemePayload>;
    return payloadToBranding(t, fallbackAppName);
  } catch {
    return emptyBranding(fallbackAppName);
  }
}

function setMetaProperty(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(
    `meta[property="${property}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setMetaName(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertOgTags(branding: PlatformBranding) {
  if (typeof document === "undefined") return;
  const title = branding.appName;
  const og = branding.ogImageUrl;

  setMetaProperty("og:title", title);
  if (og) {
    setMetaProperty("og:image", og);
    setMetaName("twitter:image", og);
    setMetaName("twitter:card", "summary_large_image");
  }
}

export function DynamicThemeProvider({
  apiUrl,
  appName,
  projectRef,
  fallbackAppName,
  children,
}: {
  apiUrl: string;
  /** Theme target: customer_web, rider_web, etc. */
  appName: string;
  projectRef?: string;
  /** Label when API has no platform app name yet */
  fallbackAppName: string;
  children: ReactNode;
}) {
  const fetched = useRef(false);
  // Initial state must match SSR: never read localStorage in useState init — that
  // runs on the client with cache but the server only had fallback → hydration mismatch.
  const [branding, setBranding] = useState<PlatformBranding>(() =>
    emptyBranding(fallbackAppName),
  );

  useLayoutEffect(() => {
    setBranding(readCachedBranding(fallbackAppName));
  }, [fallbackAppName]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = branding.appName;
  }, [branding.appName]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const href = branding.faviconUrl || branding.logoUrl;
    if (!href) return;
    let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [branding.faviconUrl, branding.logoUrl]);

  useEffect(() => {
    upsertOgTags(branding);
  }, [branding.appName, branding.ogImageUrl]);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const qs = new URLSearchParams({ app: appName });
    if (projectRef) qs.set("ref", projectRef);

    fetch(`${apiUrl}/api/public/theme?${qs}`, { credentials: "include" })
      .then((res) => {
        if (res.status === 204 || !res.ok) return null;
        return res.json() as Promise<ResolvedThemePayload>;
      })
      .then((theme) => {
        if (!theme) {
          localStorage.removeItem(CACHE_KEY);
          const el = document.getElementById("delivio-dynamic-theme");
          if (el) el.textContent = "";
          setBranding(emptyBranding(fallbackAppName));
          return;
        }
        injectTheme(theme);
        localStorage.setItem(CACHE_KEY, JSON.stringify(theme));
        setBranding(payloadToBranding(theme, fallbackAppName));
      })
      .catch(() => {
        // network error — keep cached version if any
      });
  }, [apiUrl, appName, projectRef, fallbackAppName]);

  return (
    <BrandingContext.Provider value={branding}>
      <script dangerouslySetInnerHTML={{ __html: BLOCKING_SCRIPT }} />
      {children}
    </BrandingContext.Provider>
  );
}
