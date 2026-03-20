import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useRiderTips() {
  return useQuery({
    queryKey: ["tips", "mine"],
    queryFn: () => api.tips.getMine(),
    refetchInterval: 60_000,
  });
}
