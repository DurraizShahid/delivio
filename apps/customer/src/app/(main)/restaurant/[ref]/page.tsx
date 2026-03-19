"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShoppingCart,
  Plus,
  Minus,
  MapPin,
  Clock,
  Star,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Skeleton, PriceDisplay, cn } from "@delivio/ui";
import { useProducts, useWorkspace } from "@/hooks/use-products";
import { useCartStore } from "@/stores/cart-store";
import type { Product } from "@delivio/types";

export default function RestaurantPage() {
  const { ref } = useParams<{ ref: string }>();
  const router = useRouter();
  const { data: workspace, isLoading: wsLoading } = useWorkspace(ref);
  const { data: products, isLoading: prodLoading } = useProducts(ref);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const {
    addItem,
    items,
    projectRef,
    setProjectRef,
    clear,
    itemCount,
    totalCents,
    updateQuantity,
  } = useCartStore();

  const categories = useMemo(() => {
    if (!products) return [];
    const cats = new Set(products.map((p) => p.category || "Other"));
    return Array.from(cats);
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    if (!activeCategory) return products;
    return products.filter(
      (p) => (p.category || "Other") === activeCategory
    );
  }, [products, activeCategory]);

  const availableProducts = useMemo(
    () => filtered.filter((p) => p.available),
    [filtered]
  );

  function handleAddToCart(product: Product) {
    if (projectRef && projectRef !== ref) {
      if (
        !confirm(
          "You have items from another restaurant. Clear cart and add this item?"
        )
      )
        return;
      clear();
    }
    setProjectRef(ref);
    addItem({
      id: crypto.randomUUID(),
      sessionId: "",
      productId: product.id,
      name: product.name,
      quantity: 1,
      unitPriceCents: product.priceCents,
      createdAt: new Date().toISOString(),
    });
    toast.success(`${product.name} added to cart`);
  }

  function getCartQuantity(productId: string) {
    if (projectRef !== ref) return 0;
    const item = items.find((i) => i.productId === productId);
    return item?.quantity || 0;
  }

  const isLoading = wsLoading || prodLoading;

  return (
    <div>
      {/* Banner */}
      <div className="relative h-56 overflow-hidden bg-muted sm:h-72 lg:h-80">
        {isLoading ? (
          <Skeleton className="size-full" />
        ) : workspace?.bannerUrl ? (
          <img
            src={workspace.bannerUrl}
            alt={workspace.name}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <Store className="size-20 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        <button
          onClick={() => router.back()}
          className="absolute left-4 top-4 flex size-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background lg:left-8"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" />
        </button>

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h1 className="text-2xl font-bold text-white drop-shadow-sm sm:text-3xl">
              {isLoading ? <Skeleton className="h-8 w-48" /> : workspace?.name}
            </h1>
            {workspace?.description && (
              <p className="mt-1 text-sm text-white/80 line-clamp-1">
                {workspace.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="border-b border-border/50 bg-card">
        <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 py-3 text-sm lg:px-8 hide-scrollbar">
          <div className="flex shrink-0 items-center gap-1.5 text-green-600 dark:text-green-400">
            <Star className="size-4 fill-current" />
            <span className="font-semibold">4.5</span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
            <Clock className="size-4" />
            <span>25-35 min</span>
          </div>
        </div>
      </div>

      {/* Category nav */}
      {categories.length > 1 && (
        <div className="sticky top-16 z-30 border-b border-border/50 bg-background/95 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="hide-scrollbar flex gap-1 overflow-x-auto py-2">
              <button
                onClick={() => setActiveCategory(null)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all",
                  activeCategory === null
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all",
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Products */}
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-4 rounded-2xl border border-border/50 p-4"
              >
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
                <Skeleton className="size-24 shrink-0 rounded-xl" />
              </div>
            ))}
          </div>
        ) : availableProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              <Store className="size-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No items available</h3>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableProducts.map((product) => {
              const qty = getCartQuantity(product.id);
              return (
                <div
                  key={product.id}
                  className="group flex gap-4 rounded-2xl border border-border/50 bg-card p-4 transition-all hover:border-border hover:shadow-md"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold leading-tight">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <div className="mt-3">
                      <PriceDisplay
                        cents={product.priceCents}
                        className="text-base font-semibold"
                      />
                    </div>
                    <div className="mt-3">
                      {qty > 0 ? (
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-1">
                          <button
                            onClick={() => {
                              const item = items.find(
                                (i) => i.productId === product.id
                              );
                              if (item) updateQuantity(item.id, qty - 1);
                            }}
                            className="flex size-8 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
                          >
                            <Minus className="size-4" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold text-primary">
                            {qty}
                          </span>
                          <button
                            onClick={() => handleAddToCart(product)}
                            className="flex size-8 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
                          >
                            <Plus className="size-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
                        >
                          <Plus className="size-4" />
                          Add
                        </button>
                      )}
                    </div>
                  </div>

                  {product.imageUrl ? (
                    <div className="size-24 shrink-0 overflow-hidden rounded-xl sm:size-28">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="flex size-24 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-3xl sm:size-28">
                      🍽
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating cart bar */}
      {itemCount() > 0 && projectRef === ref && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4">
          <div className="mx-auto max-w-lg">
            <button
              onClick={() => router.push("/cart")}
              className="flex w-full items-center justify-between rounded-2xl bg-primary px-6 py-4 text-primary-foreground shadow-xl shadow-primary/25 transition-all hover:bg-primary/95 hover:shadow-2xl active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary-foreground/20">
                  <ShoppingCart className="size-4" />
                </div>
                <span className="font-semibold">
                  {itemCount()} {itemCount() === 1 ? "item" : "items"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <PriceDisplay
                  cents={totalCents()}
                  className="text-lg font-bold text-primary-foreground"
                />
                <ArrowLeft className="size-4 rotate-180" />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
