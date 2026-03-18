import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Order, OrderItem } from "@delivio/types";

export function useOrders(status?: string) {
  return useQuery<Order[]>({
    queryKey: ["orders", status ?? "all"],
    queryFn: () => api.orders.list(status ? { status } : { limit: 100 }),
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
