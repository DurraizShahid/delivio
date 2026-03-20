import type { Metadata } from "next";
import type { ResolvedTheme } from "@delivio/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://delivio-production.up.railway.app"
    : "http://localhost:8080");

const PROJECT_REF = process.env.NEXT_PUBLIC_PROJECT_REF || "demo";

export async function fetchResolvedTheme(): Promise<ResolvedTheme | null> {
  const qs = new URLSearchParams({
    app: "vendor_web",
    ref: PROJECT_REF,
  });
  try {
    const res = await fetch(`${API_URL}/api/public/theme?${qs}`, {
      next: { revalidate: 120 },
    });
    if (res.status === 204 || !res.ok) return null;
    return (await res.json()) as ResolvedTheme;
  } catch {
    return null;
  }
}

const DEFAULT_TITLE = "Delivio Vendor Dashboard";
const DEFAULT_DESCRIPTION = "Manage your restaurant orders and settings";

export async function buildVendorMetadata(): Promise<Metadata> {
  const theme = await fetchResolvedTheme();
  const title = theme?.appName?.trim() || DEFAULT_TITLE;
  const ogImage = theme?.ogImageUrl?.trim();

  return {
    title,
    description: DEFAULT_DESCRIPTION,
    openGraph: {
      title,
      description: DEFAULT_DESCRIPTION,
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: title }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}
