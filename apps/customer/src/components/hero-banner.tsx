"use client";

import { Search, MapPin } from "lucide-react";
import { useLocationStore } from "@/stores/location-store";

interface HeroBannerProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
}

export function HeroBanner({ searchValue, onSearchChange }: HeroBannerProps) {
  const { address, status } = useLocationStore();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary-rgb,0,0,0),0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary-rgb,0,0,0),0.05),transparent_50%)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Delicious food,{" "}
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              delivered to you
            </span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Discover the best restaurants and cuisines near you. Order your
            favourite meals and get them delivered fast.
          </p>

          {/* Search box */}
          <div className="mx-auto mt-8 max-w-xl">
            <div className="flex flex-col gap-3 sm:flex-row">
              {status === "granted" && address && (
                <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm backdrop-blur-sm sm:w-auto">
                  <MapPin className="size-4 shrink-0 text-primary" />
                  <span className="truncate text-muted-foreground">
                    {address}
                  </span>
                </div>
              )}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search for restaurant or cuisine..."
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border/60 bg-background/80 pl-12 pr-4 text-sm shadow-sm backdrop-blur-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:shadow-md focus:ring-2 focus:ring-primary/20 sm:text-base"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative bottom wave */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </section>
  );
}
