import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Order, OrderItem } from "@delivio/types";
import { useShopStore } from "@/stores/shop-store";

export function useOrders(status?: string) {
  const activeShop = useShopStore((s) => s.activeShop);
  return useQuery<Order[]>({
    queryKey: ["orders", status ?? "all", activeShop?.id ?? "all-shops"],
    queryFn: () =>
      api.orders.list({
        ...(status ? { status } : {}),
        limit: 100,
        shopId: activeShop?.id,
      }),
    refetchInterval: 15_000,
  });
}

export function useOrder(id: string) {
  return useQuery<Order & { items: OrderItem[] }>({
    queryKey: ["orders", id],
    queryFn: () => api.orders.get(id),
    enabled: !!id,
    refetchInterval: 10_000,
  });
}
