"use client";

import { useQuery } from "@tanstack/react-query";
import { UtensilsCrossed, Plus } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Skeleton,
  EmptyState,
  Badge,
  PriceDisplay,
} from "@delivio/ui";
import type { Product } from "@delivio/types";
import { api } from "@/lib/api";

const PROJECT_REF = process.env.NEXT_PUBLIC_PROJECT_REF || "demo";

export default function MenuPage() {
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => api.public.products(PROJECT_REF),
  });

  const categories = products
    ? [...new Set(products.map((p) => p.category ?? "Uncategorized"))]
    : [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Menu</h1>
          <p className="text-sm text-muted-foreground">
            Manage your products and pricing
          </p>
        </div>
        <Button disabled className="gap-2">
          <Plus className="size-4" />
          Add Product
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : !products || products.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed />}
          title="No products yet"
          description="Add items to your menu to start receiving orders"
        />
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {category}
              </h2>
              <div className="space-y-2">
                {products
                  .filter((p) => (p.category ?? "Uncategorized") === category)
                  .map((product) => (
                    <Card key={product.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4 min-w-0">
                          {product.imageUrl && (
                            <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="size-full object-cover"
                              />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">
                                {product.name}
                              </p>
                              <Badge
                                variant={product.available ? "default" : "secondary"}
                              >
                                {product.available ? "Available" : "Unavailable"}
                              </Badge>
                            </div>
                            {product.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <PriceDisplay
                          cents={product.priceCents}
                          className="shrink-0 ml-4"
                        />
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
