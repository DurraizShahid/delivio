"use client";

import { useState, useMemo } from "react";
import { LocateFixed, Store, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@delivio/ui";
import { api } from "@/lib/api";
import { useLocationStore } from "@/stores/location-store";
import { useBrowseSearchStore } from "@/stores/browse-search-store";
import { HeroBanner } from "@/components/hero-banner";
import { CategoryFilter } from "@/components/category-filter";
import { RestaurantCard } from "@/components/restaurant-card";
import { PromoBanner } from "@/components/promo-banner";
import type { Shop } from "@delivio/types";

const DEMO_REFS = (
  process.env.NEXT_PUBLIC_RESTAURANT_REFS || "demo"
)
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean)
  .filter((ref, idx, arr) => arr.indexOf(ref) === idx);

export default function HomePage() {
  const search = useBrowseSearchStore((s) => s.query);
  const [activeCategory, setActiveCategory] = useState("all");
  const { lat, lon, status } = useLocationStore();

  const { data: shops, isLoading } = useQuery<Shop[]>({
    queryKey: ["all-shops", lat, lon],
    queryFn: async () => {
      const results = await Promise.allSettled(
        DEMO_REFS.map((ref) =>
          api.public.shops(ref, lat ?? undefined, lon ?? undefined)
        )
      );
      return results
        .filter(
          (r): r is PromiseFulfilledResult<Shop[]> =>
            r.status === "fulfilled"
        )
        .flatMap((r) => r.value);
    },
  });

  const filtered = useMemo(() => {
    if (!shops) return [];
    let list = shops;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.address?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [shops, search]);

  return (
    <div>
      {/* Hero */}
      <HeroBanner />

      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <PromoBanner placement="home_below_hero" />
        {/* Location warning */}
        {status === "denied" && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/30 dark:text-amber-200">
            <LocateFixed className="size-5 shrink-0" />
            <div>
              <p className="font-medium">Enable location access</p>
              <p className="mt-0.5 text-xs opacity-80">
                Allow location to see restaurants that deliver to your area.
              </p>
            </div>
          </div>
        )}

        {/* Promo banners — only rendered when API returns banners */}
        <PromoBanner placement="home_promotions" />

        {/* Category filter */}
        <section className="mt-10">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/15 shadow-sm">
              <TrendingUp className="size-5" />
            </span>
            <h2 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
              {search ? (
                <>
                  Results for{" "}
                  <span className="text-primary">&ldquo;{search}&rdquo;</span>
                </>
              ) : (
                <>
                  <span className="text-primary">Restaurants</span>
                  <span> near you</span>
                </>
              )}
            </h2>
            {shops && (
              <span className="ml-auto text-sm text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "place" : "places"}
              </span>
            )}
          </div>
          <CategoryFilter active={activeCategory} onSelect={setActiveCategory} />
          <PromoBanner placement="restaurant_list" />
        </section>

        {/* Restaurant grid */}
        <section className="mt-8 pb-16">
          {isLoading || status === "loading" ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-2xl border border-border/50 bg-card/50 shadow-sm backdrop-blur-sm"
                >
                  <Skeleton className="aspect-[16/10] w-full rounded-none" />
                  <div className="p-4">
                    <Skeleton className="mb-2 h-5 w-2/3" />
                    <Skeleton className="mb-3 h-4 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-muted/30 px-6 py-20 text-center shadow-inner dark:bg-muted/15">
              <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 text-primary ring-2 ring-primary/15">
                <Store className="size-10" />
              </div>
              <h3 className="mt-5 text-lg font-bold tracking-tight">No restaurants found</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {search
                  ? "Try a different search term or clear your filters"
                  : lat
                    ? "No restaurants deliver to your area right now"
                    : "No shops are available right now"}
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((shop) => (
                <RestaurantCard key={shop.id} shop={shop} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
