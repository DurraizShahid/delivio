import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Delivery } from "@delivio/types";

export function useAvailableDeliveries() {
  return useQuery<Delivery[]>({
    queryKey: ["deliveries", "available"],
    queryFn: () => api.deliveries.list({ status: "pending" }),
    refetchInterval: 10_000,
  });
}

export function useActiveDelivery() {
  return useQuery<Delivery[]>({
    queryKey: ["deliveries", "active"],
    queryFn: () => api.deliveries.list({ status: "assigned" }),
    refetchInterval: 5_000,
    select: (data) => data,
  });
}

export function useDeliveryHistory() {
  return useQuery<Delivery[]>({
    queryKey: ["deliveries", "history"],
    queryFn: () => api.deliveries.list({ status: "delivered" }),
  });
}
