"use client";

import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@delivio/ui";
import { api } from "@/lib/api";
import type { PlatformBanner } from "@delivio/types";

export function PromoBanner() {
  const { data, isLoading, isError, error } = useQuery<{ banners: PlatformBanner[] }>({
    queryKey: ["public-banners"],
    queryFn: () => api.public.banners(),
    staleTime: 5 * 60 * 1000,
  });

  const banners = data?.banners ?? [];

  // #region agent log
  if (typeof window !== "undefined") {
    fetch('http://127.0.0.1:7929/ingest/c6b94d87-f945-4818-a38c-cf95b2daae21',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0512be'},body:JSON.stringify({sessionId:'0512be',runId:'pre-fix',hypothesisId:'H4',location:'apps/customer/src/components/promo-banner.tsx:PromoBanner:queryState',message:'Customer PromoBanner query/render state',data:{isLoading,isError,errorMessage:isError?String((error as Error)?.message||'unknown'):null,bannersCount:banners.length,bannerIds:banners.map((b)=>b.id)},timestamp:Date.now()})}).catch(()=>{});
  }
  // #endregion

  if (banners.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-lg font-bold sm:text-xl">Promotions</h2>
      <div className="hide-scrollbar flex gap-4 overflow-x-auto pb-2">
      {banners.map((b) => (
        <a
          key={b.id}
          href={b.ctaLink || undefined}
          className={cn(
            "group relative flex min-w-[280px] flex-1 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl p-5 transition-all hover:shadow-xl sm:min-w-[300px] sm:p-6",
            b.imageUrl
              ? "bg-cover bg-center"
              : `bg-gradient-to-r ${b.bgGradient}`
          )}
          style={
            b.imageUrl
              ? {
                  backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.4), rgba(0,0,0,0.2)), url(${b.imageUrl})`,
                }
              : undefined
          }
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
          <div className="relative">
            <h3
              className="text-lg font-bold leading-tight sm:text-xl"
              style={{ color: b.textColor }}
            >
              {b.title}
            </h3>
            {b.subtitle && (
              <p
                className="mt-1 text-sm"
                style={{ color: b.textColor, opacity: 0.8 }}
              >
                {b.subtitle}
              </p>
            )}
          </div>
          {b.ctaText && (
            <div
              className="relative mt-4 flex items-center gap-1 text-sm font-semibold"
              style={{ color: b.textColor }}
            >
              <span>{b.ctaText}</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </div>
          )}
        </a>
      ))}
      </div>
    </section>
  );
}
