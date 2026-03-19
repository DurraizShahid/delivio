"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShoppingCart, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  Skeleton,
  EmptyState,
  PriceDisplay,
} from "@delivio/ui";
import { useProducts, useShopDetail } from "@/hooks/use-products";
import { useCartStore } from "@/stores/cart-store";
import type { Product } from "@delivio/types";

export default function ShopMenuPage() {
  const { ref, shopId } = useParams<{ ref: string; shopId: string }>();
  const router = useRouter();
  const { data: shop, isLoading: shopLoading } = useShopDetail(ref, shopId);
  const { data: products, isLoading: prodLoading } = useProducts(ref, shopId);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const {
    addItem,
    items,
    projectRef,
    shopId: cartShopId,
    setProjectRef,
    setShopId,
    clear,
    itemCount,
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
    if (cartShopId && cartShopId !== shopId) {
      if (
        !confirm(
          "You have items from another shop. Clear cart and add this item?"
        )
      )
        return;
      clear();
    }
    setProjectRef(ref);
    setShopId(shopId);
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

  const isLoading = shopLoading || prodLoading;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4">
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back
      </button>

      {isLoading ? (
        <>
          <Skeleton className="mb-4 h-40 w-full rounded-xl" />
          <Skeleton className="mb-2 h-7 w-1/2" />
          <Skeleton className="mb-6 h-4 w-3/4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </>
      ) : (
        <>
          {shop?.bannerUrl && (
            <img
              src={shop.bannerUrl}
              alt={shop.name}
              className="mb-4 h-40 w-full rounded-xl object-cover"
            />
          )}
          <h1 className="text-2xl font-bold">{shop?.name}</h1>
          {shop?.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {shop.description}
            </p>
          )}
          {shop?.address && (
            <p className="mt-1 text-xs text-muted-foreground">
              {shop.address}
            </p>
          )}

          {categories.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={activeCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(null)}
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={activeCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-3">
            {availableProducts.length === 0 ? (
              <EmptyState title="No items available" />
            ) : (
              availableProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <CardContent className="flex items-center gap-4 p-4">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="size-20 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex size-20 items-center justify-center rounded-lg bg-muted text-2xl">
                        🍽
                      </div>
                    )}
                    <div className="flex-1 space-y-1">
                      <h3 className="font-medium">{product.name}</h3>
                      {product.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {product.description}
                        </p>
                      )}
                      <PriceDisplay cents={product.priceCents} />
                    </div>
                    <Button
                      size="icon"
                      onClick={() => handleAddToCart(product)}
                      aria-label={`Add ${product.name} to cart`}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {itemCount() > 0 && (
            <div className="fixed bottom-16 left-0 z-40 right-0 p-4">
              <Button
                className="mx-auto flex w-full max-w-md gap-2"
                size="lg"
                onClick={() => router.push("/cart")}
              >
                <ShoppingCart className="size-4" />
                View Cart ({itemCount()} items)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
