"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UtensilsCrossed, Plus, Trash2 } from "lucide-react";
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
} from "@delivio/ui";
import type { Product, Category } from "@delivio/types";
import { api } from "@/lib/api";

export default function MenuPage() {
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
    queryKey: ["catalog", "products"],
    queryFn: () => api.catalog.listProducts(),
  });
  const products = useMemo(() => res?.products ?? [], [res]);

  const { data: catRes, isLoading: catsLoading } = useQuery<{ categories: Category[] }>({
    queryKey: ["catalog", "categories"],
    queryFn: () => api.catalog.listCategories(),
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
          })
        : api.catalog.createProduct({
            name: form.name.trim(),
            priceCents: Number(form.priceCents),
            category: form.category.trim() || null,
            imageUrl: form.imageUrl.trim() || null,
            description: form.description.trim() || null,
            available: form.available,
          }),
    onSuccess: async () => {
      setEditingId(null);
      setForm({ name: "", priceCents: "", category: "", imageUrl: "", description: "", available: true });
      await qc.invalidateQueries({ queryKey: ["catalog", "products"] });
      await qc.invalidateQueries({ queryKey: ["catalog", "categories"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) =>
      api.catalog.updateProduct(id, { available }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog", "products"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.catalog.deleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog", "products"] }),
  });

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => api.catalog.createCategory({ name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog", "categories"] }),
  });

  const renameCategoryMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.catalog.updateCategory(id, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog", "categories"] }),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => api.catalog.deleteCategory(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["catalog", "categories"] });
      await qc.invalidateQueries({ queryKey: ["catalog", "products"] });
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
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Menu</h1>
          <p className="text-sm text-muted-foreground">
            Manage your products and pricing
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editingId && (
            <Button variant="outline" onClick={cancelEdit} disabled={createMutation.isPending}>
              Cancel edit
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

      {/* Categories */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row">
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
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : (catRes?.categories?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No categories yet. Categories are optional, but help customers browse.
            </p>
          ) : (
            <div className="space-y-2">
              {catRes!.categories.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3 md:flex-row md:items-center"
                >
                  <Input
                    value={renaming[c.id] ?? c.name}
                    onChange={(e) => setRenaming((r) => ({ ...r, [c.id]: e.target.value }))}
                  />
                  <div className="flex items-center gap-2 md:justify-end">
                    <Button
                      variant="outline"
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

      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-2">
          <Input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            placeholder="Price (cents) e.g. 1299"
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
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              id="available"
              type="checkbox"
              checked={form.available}
              onChange={(e) => setForm((f) => ({ ...f, available: e.target.checked }))}
              className="size-4 accent-primary"
            />
            <label htmlFor="available" className="text-sm">
              Available
            </label>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : products.length === 0 ? (
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
                      <CardContent className="flex items-center justify-between gap-3 p-4">
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
                        <div className="flex items-center gap-2 shrink-0">
                          <PriceDisplay cents={product.priceCents} className="shrink-0" />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(product)}
                            disabled={createMutation.isPending}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              toggleMutation.mutate({
                                id: product.id,
                                available: !product.available,
                              })
                            }
                            disabled={toggleMutation.isPending}
                          >
                            {product.available ? "Mark Unavailable" : "Mark Available"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => deleteMutation.mutate(product.id)}
                            disabled={deleteMutation.isPending}
                            aria-label={`Delete ${product.name}`}
                          >
                            <Trash2 className="size-4" />
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
