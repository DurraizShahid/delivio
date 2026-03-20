"use client";

import Link from "next/link";
import { MapPin, Clock, Star, Store, ArrowUpRight } from "lucide-react";
import { cn } from "@delivio/ui";
import type { Shop } from "@delivio/types";

interface RestaurantCardProps {
  shop: Shop;
  className?: string;
}

export function RestaurantCard({ shop, className }: RestaurantCardProps) {
  return (
    <Link
      href={`/restaurant/${shop.projectRef}/${shop.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-sm shadow-black/5 backdrop-blur-sm transition-all duration-300",
        "hover:-translate-y-1 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/10 dark:hover:shadow-black/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      <span className="card-shine" aria-hidden />

      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {shop.bannerUrl ? (
          <img
            src={shop.bannerUrl}
            alt={shop.name}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted via-primary/5 to-accent/10">
            <Store className="size-12 text-muted-foreground/35" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-white/25 bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground shadow-lg backdrop-blur-md">
          <Clock className="size-3.5 opacity-80" />
          <span>25–35 min</span>
        </div>

        <div className="absolute bottom-3 right-3 flex size-9 items-center justify-center rounded-full bg-background/92 text-foreground opacity-0 shadow-lg backdrop-blur-md transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1">
          <ArrowUpRight className="size-4" />
        </div>

        {shop.logoUrl && (
          <div className="absolute bottom-3 left-3 size-12 overflow-hidden rounded-xl border-2 border-white/90 bg-background shadow-lg ring-2 ring-black/5 dark:ring-white/10">
            <img src={shop.logoUrl} alt="" className="size-full object-cover" />
          </div>
        )}
      </div>

      <div className="relative p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold tracking-tight transition-colors group-hover:text-primary">
              {shop.name}
            </h3>
            {shop.description && (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {shop.description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-500/12 px-2 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-400">
            <Star className="size-3 fill-current" />
            <span>4.5</span>
          </div>
        </div>

        {shop.address && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0 text-primary/70" />
            <span className="truncate">{shop.address}</span>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-gradient-to-r from-primary/15 to-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary ring-1 ring-primary/15">
            Free delivery
          </span>
          <span className="text-xs text-muted-foreground">Min. order $10</span>
        </div>
      </div>
    </Link>
  );
}
