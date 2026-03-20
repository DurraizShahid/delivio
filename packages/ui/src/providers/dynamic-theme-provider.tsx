"use client";

import {
  createContext,
  useContext,
  useEffect,
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
}

export interface PlatformBranding {
  /** Resolved display name (API or fallback) */
  appName: string;
  logoUrl: string | null;
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
    return { appName: fallbackAppName, logoUrl: null };
  }
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { appName: fallbackAppName, logoUrl: null };
    const t = JSON.parse(raw) as Partial<ResolvedThemePayload>;
    return {
      appName: (t.appName && String(t.appName).trim()) || fallbackAppName,
      logoUrl: (t.logoUrl && String(t.logoUrl).trim()) || null,
    };
  } catch {
    return { appName: fallbackAppName, logoUrl: null };
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
  const [branding, setBranding] = useState<PlatformBranding>(() =>
    readCachedBranding(fallbackAppName),
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = branding.appName;
  }, [branding.appName]);

  useEffect(() => {
    if (typeof document === "undefined" || !branding.logoUrl) return;
    let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = branding.logoUrl;
  }, [branding.logoUrl]);

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
          setBranding({ appName: fallbackAppName, logoUrl: null });
          return;
        }
        injectTheme(theme);
        localStorage.setItem(CACHE_KEY, JSON.stringify(theme));
        setBranding({
          appName: (theme.appName && String(theme.appName).trim()) || fallbackAppName,
          logoUrl: (theme.logoUrl && String(theme.logoUrl).trim()) || null,
        });
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
