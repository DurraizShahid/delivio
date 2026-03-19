"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, MapPin, Store, LocateFixed } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Input,
  Card,
  CardContent,
  Skeleton,
  EmptyState,
  Button,
} from "@delivio/ui";
import { api } from "@/lib/api";
import type { Shop } from "@delivio/types";

const DEMO_REFS = (
  process.env.NEXT_PUBLIC_RESTAURANT_REFS || "demo"
)
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean)
  .filter((ref, idx, arr) => arr.indexOf(ref) === idx);

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [customerLat, setCustomerLat] = useState<number | null>(null);
  const [customerLon, setCustomerLon] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "granted" | "denied">("idle");

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCustomerLat(pos.coords.latitude);
        setCustomerLon(pos.coords.longitude);
        setLocationStatus("granted");
      },
      () => {
        setLocationStatus("denied");
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, []);

  const { data: shops, isLoading } = useQuery<Shop[]>({
    queryKey: ["all-shops", customerLat, customerLon],
    queryFn: async () => {
      const results = await Promise.allSettled(
        DEMO_REFS.map((ref) =>
          api.public.shops(
            ref,
            customerLat ?? undefined,
            customerLon ?? undefined
          )
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
    if (!search.trim()) return shops;
    const q = search.toLowerCase();
    return shops.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q)
    );
  }, [shops, search]);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          What are you craving?
        </h1>
        <p className="text-sm text-muted-foreground">
          Order from restaurants near you
        </p>
      </div>

      {locationStatus === "denied" && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <LocateFixed className="size-4 shrink-0" />
          <span>Enable location access to see restaurants that deliver to your area.</span>
        </div>
      )}

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search shops..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading || locationStatus === "loading" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <Skeleton className="h-36 w-full rounded-t-xl" />
              <CardContent className="pt-4">
                <Skeleton className="mb-2 h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Store />}
          title="No shops found"
          description={
            search
              ? "Try a different search term"
              : customerLat
                ? "No restaurants deliver to your area right now"
                : "No shops are available right now"
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((shop) => (
            <Link
              key={shop.id}
              href={`/restaurant/${shop.projectRef}/${shop.id}`}
            >
              <Card className="overflow-hidden transition-shadow hover:shadow-md">
                {shop.bannerUrl ? (
                  <img
                    src={shop.bannerUrl}
                    alt={shop.name}
                    className="h-36 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-36 items-center justify-center bg-muted">
                    <Store className="size-10 text-muted-foreground" />
                  </div>
                )}
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{shop.name}</h3>
                      {shop.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                          {shop.description}
                        </p>
                      )}
                    </div>
                    {shop.logoUrl && (
                      <img
                        src={shop.logoUrl}
                        alt=""
                        className="size-10 rounded-lg object-cover"
                      />
                    )}
                  </div>
                  {shop.address && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      <span className="line-clamp-1">
                        {shop.address}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
