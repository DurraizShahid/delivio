"use client";

import Link from "next/link";
import { MapPin, Clock, Star, Store } from "lucide-react";
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
        "group block overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20",
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {shop.bannerUrl ? (
          <img
            src={shop.bannerUrl}
            alt={shop.name}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <Store className="size-12 text-muted-foreground/40" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Logo badge */}
        {shop.logoUrl && (
          <div className="absolute bottom-3 left-3 size-12 overflow-hidden rounded-xl border-2 border-background bg-background shadow-md">
            <img
              src={shop.logoUrl}
              alt=""
              className="size-full object-cover"
            />
          </div>
        )}

        {/* Estimated time badge */}
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur-sm">
          <Clock className="size-3" />
          <span>25-35 min</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold group-hover:text-primary transition-colors">
              {shop.name}
            </h3>
            {shop.description && (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {shop.description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-lg bg-green-500/10 px-2 py-1 text-xs font-semibold text-green-600 dark:text-green-400">
            <Star className="size-3 fill-current" />
            <span>4.5</span>
          </div>
        </div>

        {shop.address && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{shop.address}</span>
          </div>
        )}

        {/* Tags row */}
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            Free delivery
          </span>
          <span className="text-xs text-muted-foreground">
            Min. order $10
          </span>
        </div>
      </div>
    </Link>
  );
}
