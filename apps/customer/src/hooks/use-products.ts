import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Product, Workspace } from "@delivio/types";

export function useProducts(ref: string) {
  return useQuery<Product[]>({
    queryKey: ["products", ref],
    queryFn: () => api.public.products(ref),
    enabled: !!ref,
  });
}

export function useWorkspace(ref: string) {
  return useQuery<Workspace>({
    queryKey: ["workspace", ref],
    queryFn: () => api.public.workspace(ref),
    enabled: !!ref,
  });
}
