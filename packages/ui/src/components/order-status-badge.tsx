"use client";

import { Badge } from "./badge";
import type { OrderStatus } from "@delivio/types";

const statusConfig: Record<
  OrderStatus,
  { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }
> = {
  pending: { label: "Pending", variant: "secondary" },
  scheduled: { label: "Scheduled", variant: "secondary" },
  accepted_by_vendor: { label: "Accepted", variant: "default" },
  preparing: { label: "Preparing", variant: "warning" },
  ready: { label: "Ready", variant: "warning" },
  picked_up: { label: "Picked Up", variant: "default" },
  delivered: { label: "Delivered", variant: "success" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
