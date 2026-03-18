import type { Delivery } from "@delivio/types";

/**
 * Normalize delivery from API (handles snake_case from backend).
 */
export function normalizeDelivery(raw: unknown): Delivery {
  if (!raw || typeof raw !== "object") {
    return raw as Delivery;
  }
  const d = raw as Record<string, unknown>;
  return {
    id: String(d.id ?? ""),
    orderId: String(d.order_id ?? d.orderId ?? ""),
    riderId: (d.rider_id ?? d.riderId) as string | undefined,
    status: (d.status ?? "pending") as Delivery["status"],
    zoneId: (d.zone_id ?? d.zoneId) as string | undefined,
    etaMinutes: (d.eta_minutes ?? d.etaMinutes) as number | undefined,
    claimedAt: (d.claimed_at ?? d.claimedAt) as string | undefined,
    createdAt: String(d.created_at ?? d.createdAt ?? ""),
    updatedAt: String(d.updated_at ?? d.updatedAt ?? ""),
  };
}
