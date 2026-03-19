"use client";

import { useEffect, useRef } from "react";

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

interface ResolvedTheme {
  light: ThemeColors;
  dark: ThemeColors;
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
      var d = [];
      for (var k in m) { if (colors[k]) d.push(m[k] + ": " + colors[k] + ";"); }
      if (d.length) rules.push(sel + " { " + d.join(" ") + " }");
    }
    if (t.light) build(t.light, ":root");
    if (t.dark) build(t.dark, ".dark");
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

function injectTheme(theme: ResolvedTheme) {
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

export function DynamicThemeProvider({
  apiUrl,
  appName,
  projectRef,
  children,
}: {
  apiUrl: string;
  appName: string;
  projectRef?: string;
  children: React.ReactNode;
}) {
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const qs = new URLSearchParams({ app: appName });
    if (projectRef) qs.set("ref", projectRef);

    fetch(`${apiUrl}/api/public/theme?${qs}`, { credentials: "include" })
      .then((res) => {
        if (res.status === 204 || !res.ok) return null;
        return res.json() as Promise<ResolvedTheme>;
      })
      .then((theme) => {
        if (!theme) {
          localStorage.removeItem(CACHE_KEY);
          const el = document.getElementById("delivio-dynamic-theme");
          if (el) el.textContent = "";
          return;
        }
        injectTheme(theme);
        localStorage.setItem(CACHE_KEY, JSON.stringify(theme));
      })
      .catch(() => {
        // network error — keep cached version if any
      });
  }, [apiUrl, appName, projectRef]);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: BLOCKING_SCRIPT }} />
      {children}
    </>
  );
}
