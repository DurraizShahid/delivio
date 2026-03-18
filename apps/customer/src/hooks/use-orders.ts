import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Order, OrderItem } from "@delivio/types";

export function useOrders() {
  return useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => api.orders.list({ limit: 50 }),
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
