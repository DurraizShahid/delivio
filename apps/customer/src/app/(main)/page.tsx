"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, MapPin, Store } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Input,
  Card,
  CardContent,
  Skeleton,
  EmptyState,
} from "@delivio/ui";
import { api } from "@/lib/api";
import type { Workspace } from "@delivio/types";

const DEMO_REFS = (
  process.env.NEXT_PUBLIC_RESTAURANT_REFS || "demo"
)
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean)
  // Ensure stable unique keys + avoid duplicate fetches
  .filter((ref, idx, arr) => arr.indexOf(ref) === idx);

export default function HomePage() {
  const [search, setSearch] = useState("");

  const { data: restaurants, isLoading } = useQuery<Workspace[]>({
    queryKey: ["restaurants"],
    queryFn: async () => {
      const results = await Promise.allSettled(
        DEMO_REFS.map((ref) => api.public.workspace(ref))
      );
      return results
        .filter(
          (r): r is PromiseFulfilledResult<Workspace> =>
            r.status === "fulfilled"
        )
        .map((r) => r.value);
    },
  });

  const filtered = useMemo(() => {
    if (!restaurants) return [];
    if (!search.trim()) return restaurants;
    const q = search.toLowerCase();
    return restaurants.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
    );
  }, [restaurants, search]);

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

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search restaurants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
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
          title="No restaurants found"
          description={
            search
              ? "Try a different search term"
              : "No restaurants are available right now"
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((restaurant) => (
            <Link
              key={restaurant.id}
              href={`/restaurant/${restaurant.projectRef}`}
            >
              <Card className="overflow-hidden transition-shadow hover:shadow-md">
                {restaurant.bannerUrl ? (
                  <img
                    src={restaurant.bannerUrl}
                    alt={restaurant.name}
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
                      <h3 className="font-semibold">{restaurant.name}</h3>
                      {restaurant.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                          {restaurant.description}
                        </p>
                      )}
                    </div>
                    {restaurant.logoUrl && (
                      <img
                        src={restaurant.logoUrl}
                        alt=""
                        className="size-10 rounded-lg object-cover"
                      />
                    )}
                  </div>
                  {restaurant.address && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      <span className="line-clamp-1">
                        {restaurant.address}
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
