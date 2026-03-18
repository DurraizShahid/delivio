import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useWSEvent } from "@/providers/ws-provider";
import type { Order, OrderItem } from "@delivio/types";

export function useOrders() {
  return useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await api.orders.list({ limit: 50 });
      return (res as { orders?: Order[] })?.orders ?? (Array.isArray(res) ? res : []);
    },
  });
}

export function useOrder(id: string) {
  const queryClient = useQueryClient();

  const query = useQuery<Order & { items: OrderItem[] }>({
    queryKey: ["orders", id],
    queryFn: async () => {
      const res = await api.orders.get(id);
      const raw = (res as { order?: unknown })?.order ?? res;
      return raw as Order & { items: OrderItem[] };
    },
    enabled: !!id,
    refetchInterval: 10_000,
  });

  useWSEvent("order:rejected", (event) => {
    if (event.orderId === id) {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", id] });
    }
  });

  useWSEvent("order:delayed", (event) => {
    if (event.orderId === id) {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", id] });
    }
  });

  return query;
}
