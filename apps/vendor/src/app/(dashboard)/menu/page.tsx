"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UtensilsCrossed, Plus, Trash2, Pencil } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  EmptyState,
  Badge,
  PriceDisplay,
  Input,
  cn,
} from "@delivio/ui";
import type { Product, Category } from "@delivio/types";
import { api } from "@/lib/api";
import { useShopStore } from "@/stores/shop-store";

export default function MenuPage() {
  const activeShop = useShopStore((s) => s.activeShop);
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    name: string;
    priceCents: string;
    category: string;
    imageUrl: string;
    description: string;
    available: boolean;
  }>({
    name: "",
    priceCents: "",
    category: "",
    imageUrl: "",
    description: "",
    available: true,
  });

  const { data: res, isLoading } = useQuery<{ products: Product[] }>({
    queryKey: ["catalog", "products", activeShop?.id],
    queryFn: () => api.catalog.listProducts(undefined, activeShop?.id),
    enabled: !!activeShop?.id,
  });
  const products = useMemo(() => res?.products ?? [], [res]);

  const { data: catRes, isLoading: catsLoading } = useQuery<{ categories: Category[] }>({
    queryKey: ["catalog", "categories", activeShop?.id],
    queryFn: () => api.catalog.listCategories(activeShop?.id),
    enabled: !!activeShop?.id,
  });
  const categories = useMemo(() => {
    const fromCatalog = (catRes?.categories ?? []).map((c) => c.name);
    const fromProducts = products.map((p) => p.category).filter(Boolean) as string[];
    return [...new Set([...fromCatalog, ...fromProducts])].sort();
  }, [catRes?.categories, products]);

  const [newCategory, setNewCategory] = useState("");
  const [renaming, setRenaming] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: async () =>
      editingId
        ? api.catalog.updateProduct(editingId, {
            name: form.name.trim(),
            priceCents: Number(form.priceCents),
            category: form.category.trim() || null,
            imageUrl: form.imageUrl.trim() || null,
            description: form.description.trim() || null,
            available: form.available,
          }, activeShop?.id)
        : api.catalog.createProduct({
            name: form.name.trim(),
            priceCents: Number(form.priceCents),
            category: form.category.trim() || null,
            imageUrl: form.imageUrl.trim() || null,
            description: form.description.trim() || null,
            available: form.available,
          }, activeShop?.id),
    onSuccess: async () => {
      setEditingId(null);
      setForm({ name: "", priceCents: "", category: "", imageUrl: "", description: "", available: true });
      await qc.invalidateQueries({ queryKey: ["catalog", "products"] });
      await qc.invalidateQueries({ queryKey: ["catalog", "categories"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) =>
      api.catalog.updateProduct(id, { available }, activeShop?.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog", "products", activeShop?.id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.catalog.deleteProduct(id, activeShop?.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog", "products", activeShop?.id] }),
  });

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => api.catalog.createCategory({ name }, activeShop?.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog", "categories", activeShop?.id] }),
  });

  const renameCategoryMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.catalog.updateCategory(id, { name }, activeShop?.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog", "categories", activeShop?.id] }),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => api.catalog.deleteCategory(id, activeShop?.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["catalog", "categories", activeShop?.id] });
      await qc.invalidateQueries({ queryKey: ["catalog", "products", activeShop?.id] });
    },
  });

  function startEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name ?? "",
      priceCents: String(product.priceCents ?? ""),
      category: product.category ?? "",
      imageUrl: product.imageUrl ?? "",
      description: product.description ?? "",
      available: product.available ?? true,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ name: "", priceCents: "", category: "", imageUrl: "", description: "", available: true });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Menu</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your products and pricing
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {editingId && (
            <Button variant="outline" onClick={cancelEdit} disabled={createMutation.isPending}>
              Cancel
            </Button>
          )}
          <Button
            className="gap-2"
            onClick={() => createMutation.mutate()}
            disabled={
              createMutation.isPending ||
              !form.name.trim() ||
              !form.priceCents ||
              Number.isNaN(Number(form.priceCents))
            }
          >
            <Plus className="size-4" />
            {editingId ? "Save Changes" : "Add Product"}
          </Button>
        </div>
      </div>

      {/* Product form */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">
            {editingId ? "Edit Product" : "New Product"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder="Product name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            placeholder="Price (pence) e.g. 1299"
            inputMode="numeric"
            value={form.priceCents}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                priceCents: e.target.value.replace(/[^\d]/g, ""),
              }))
            }
          />
          <Input
            placeholder="Category (optional)"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />
          <Input
            placeholder="Image URL (optional)"
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
          />
          <Input
            className="md:col-span-2"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="md:col-span-2 flex items-center gap-2.5">
            <button
              type="button"
              role="switch"
              aria-checked={form.available}
              onClick={() => setForm((f) => ({ ...f, available: !f.available }))}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                form.available ? "bg-primary" : "bg-input"
              )}
            >
              <span className={cn(
                "pointer-events-none block size-4 rounded-full bg-white shadow-sm transition-transform",
                form.available ? "translate-x-4" : "translate-x-0"
              )} />
            </button>
            <label className="text-sm text-muted-foreground">
              {form.available ? "Available" : "Unavailable"}
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="New category name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <Button
              className="shrink-0"
              onClick={() => {
                const name = newCategory.trim();
                if (!name) return;
                createCategoryMutation.mutate(name);
                setNewCategory("");
              }}
              disabled={createCategoryMutation.isPending || !newCategory.trim()}
            >
              Add category
            </Button>
          </div>

          {catsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : (catRes?.categories?.length ?? 0) === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No categories yet. Categories help customers browse your menu.
            </p>
          ) : (
            <div className="space-y-2">
              {catRes!.categories.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col gap-2 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center"
                >
                  <Input
                    value={renaming[c.id] ?? c.name}
                    onChange={(e) => setRenaming((r) => ({ ...r, [c.id]: e.target.value }))}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-2 sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        renameCategoryMutation.mutate({
                          id: c.id,
                          name: (renaming[c.id] ?? c.name).trim(),
                        })
                      }
                      disabled={renameCategoryMutation.isPending}
                    >
                      Save
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteCategoryMutation.mutate(c.id)}
                      disabled={deleteCategoryMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed />}
          title="No products yet"
          description="Add items to your menu above to start receiving orders"
        />
      ) : (
        <div className="space-y-8">
          {categories.map((category) => (
            <div key={category}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {category}
              </h2>
              <div className="space-y-2">
                {products
                  .filter((p) => (p.category ?? "Uncategorized") === category)
                  .map((product) => (
                    <Card key={product.id} className="shadow-sm border-border/60">
                      <CardContent className="flex items-center justify-between gap-4 p-4">
                        <div className="flex items-center gap-4 min-w-0">
                          {product.imageUrl && (
                            <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-muted">
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
                                className="shrink-0"
                              >
                                {product.available ? "Available" : "Unavailable"}
                              </Badge>
                            </div>
                            {product.description && (
                              <p className="mt-0.5 text-xs text-muted-foreground truncate">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <PriceDisplay cents={product.priceCents} className="text-sm font-medium shrink-0" />
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => startEdit(product)}
                            disabled={createMutation.isPending}
                            aria-label={`Edit ${product.name}`}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              toggleMutation.mutate({
                                id: product.id,
                                available: !product.available,
                              })
                            }
                            disabled={toggleMutation.isPending}
                            aria-label={product.available ? "Mark unavailable" : "Mark available"}
                            className="text-muted-foreground"
                          >
                            {product.available ? "Hide" : "Show"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => deleteMutation.mutate(product.id)}
                            disabled={deleteMutation.isPending}
                            aria-label={`Delete ${product.name}`}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
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
