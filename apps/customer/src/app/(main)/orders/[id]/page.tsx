"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, MessageCircle, Phone, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Separator,
  Skeleton,
  OrderStatusBadge,
  PriceDisplay,
  Input,
} from "@delivio/ui";
import { cn } from "@delivio/ui";
import { useOrder } from "@/hooks/use-orders";
import { useAuthStore } from "@/stores/auth-store";
import { useWSEvent } from "@/providers/ws-provider";
import { api } from "@/lib/api";
import type { OrderStatus, Order } from "@delivio/types";

const ORDER_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "placed", label: "Placed" },
  { status: "accepted", label: "Accepted" },
  { status: "preparing", label: "Preparing" },
  { status: "ready", label: "Ready" },
  { status: "assigned", label: "Rider Assigned" },
  { status: "picked_up", label: "Picked Up" },
  { status: "arrived", label: "Rider Arrived" },
  { status: "completed", label: "Completed" },
];

function getStepIndex(status: OrderStatus): number {
  const idx = ORDER_STEPS.findIndex((s) => s.status === status);
  return idx >= 0 ? idx : 0;
}

// Normalize order from API (handles snake_case from backend)
function normalizeOrder(raw: unknown): Order | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const items = (o.items ?? o.order_items) as Array<{ id: string; name: string; quantity: number; unit_price_cents?: number; unitPriceCents?: number }> | undefined;
  return {
    id: String(o.id ?? ""),
    projectRef: String(o.project_ref ?? o.projectRef ?? ""),
    customerId: String(o.customer_id ?? o.customerId ?? ""),
    status: (o.status ?? "placed") as OrderStatus,
    paymentStatus: (o.payment_status ?? o.paymentStatus ?? "pending") as "pending" | "succeeded" | "failed" | "refunded",
    totalCents: Number(o.total_cents ?? o.totalCents ?? 0),
    rejectionReason: (o.rejection_reason ?? o.rejectionReason) as string | undefined,
    slaDeadline: (o.sla_deadline ?? o.slaDeadline) as string | undefined,
    slaBreached: !!(o.sla_breached ?? o.slaBreached),
    createdAt: String(o.created_at ?? o.createdAt ?? ""),
    updatedAt: String(o.updated_at ?? o.updatedAt ?? ""),
    items: items?.map((it) => ({
      id: it.id,
      orderId: String(o.id),
      productId: "",
      name: it.name,
      quantity: it.quantity,
      unitPriceCents: it.unitPriceCents ?? it.unit_price_cents ?? 0,
    })),
    delivery: o.delivery as Order["delivery"],
    vendorId: o.vendorId as string | undefined,
  } as Order;
}

function SlaCountdown({ slaDeadline }: { slaDeadline: string }) {
  const [remaining, setRemaining] = useState("");
  const tick = useCallback(() => {
    const deadline = new Date(slaDeadline).getTime();
    const now = Date.now();
    const diff = deadline - now;
    if (diff <= 0) {
      setRemaining("Ready soon");
      return;
    }
    const mins = Math.floor(diff / 60_000);
    const secs = Math.floor((diff % 60_000) / 1000);
    setRemaining(`${mins}m ${secs}s`);
  }, [slaDeadline]);

  useEffect(() => {
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
      ETA: {remaining}
    </div>
  );
}

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className="focus:outline-none focus:ring-2 focus:ring-ring rounded p-0.5"
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
          >
            <Star
              className={cn(
                "size-8 transition-colors",
                i <= value ? "fill-amber-400 text-amber-500" : "text-muted-foreground"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  const { data: rawOrder, isLoading } = useOrder(id);

  if (authLoading) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 pt-4">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }
  if (!isAuthenticated) return null;
  const order = rawOrder ? normalizeOrder(rawOrder) : null;

  const [vendorRating, setVendorRating] = useState(0);
  const [riderRating, setRiderRating] = useState(0);
  const [comment, setComment] = useState("");
  const [tipCents, setTipCents] = useState<number | null>(null);
  const [customTipCents, setCustomTipCents] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useWSEvent("order:status_changed", (event) => {
    if (event.orderId === id) {
      toast.info(`Order updated: ${event.status.replace(/_/g, " ")}`);
    }
  });

  useWSEvent("order:rejected", (event) => {
    if (event.orderId === id) {
      toast.error(event.reason ? `Order rejected: ${event.reason}` : "Order rejected");
    }
  });

  useWSEvent("order:delayed", (event) => {
    if (event.orderId === id) {
      toast.warning("Your order has been delayed. We'll update the ETA soon.");
    }
  });

  useWSEvent("delivery:location_update", () => {
    // Future: update map marker
  });

  const handleSubmitRating = async () => {
    if (!order) return;
    setSubmitting(true);
    try {
      if (order.vendorId && vendorRating > 0) {
        await api.ratings.create({
          orderId: order.id,
          toUserId: order.vendorId,
          toRole: "vendor",
          rating: vendorRating,
          comment: comment || undefined,
        });
      }
      if (order.delivery?.riderId && riderRating > 0) {
        await api.ratings.create({
          orderId: order.id,
          toUserId: order.delivery.riderId,
          toRole: "rider",
          rating: riderRating,
          comment: comment || undefined,
        });
      }
      const customTip = customTipCents ? parseInt(customTipCents, 10) : 0;
      const tipAmount = tipCents ?? (Number.isNaN(customTip) ? 0 : customTip);
      if (order.delivery?.riderId && tipAmount > 0) {
        await api.tips.create({
          orderId: order.id,
          toRiderId: order.delivery.riderId,
          amountCents: tipAmount,
        });
      }
      toast.success("Thank you for your feedback!");
      if (!order.vendorId && !order.delivery?.riderId) {
        toast.info("Rating submitted.");
      }
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 pt-4">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 pt-8 text-center">
        <p className="text-muted-foreground">Order not found</p>
      </div>
    );
  }

  const currentStep = getStepIndex(order.status);
  const isCancelled = order.status === "cancelled";
  const isRejected = order.status === "rejected";
  const showSla =
    order.slaDeadline &&
    (order.status === "accepted" || order.status === "preparing");
  const showRating = order.status === "completed";
  const hasDelivery = !!order.delivery?.riderId;
  const slaOverdue = order.slaDeadline ? new Date(order.slaDeadline).getTime() < Date.now() : false;
  const isLate =
    ((order as any).slaBreached || slaOverdue) &&
    !["completed", "cancelled", "rejected"].includes(order.status);

  return (
    <div className="mx-auto max-w-md px-4 pt-4 pb-8">
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back
      </button>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Order #{order.id.slice(0, 8)}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      {isRejected && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive">
          <p className="font-semibold">Order Rejected</p>
          {order.rejectionReason && (
            <p className="mt-1 text-sm">{order.rejectionReason}</p>
          )}
        </div>
      )}

      {showSla && order.slaDeadline && (
        <div className="mb-4">
          <SlaCountdown slaDeadline={order.slaDeadline} />
        </div>
      )}

      {isLate && (
        <Card className="mb-4 border-orange-300 bg-orange-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="size-5 text-orange-600" />
            <div>
              <p className="text-sm font-semibold text-orange-800">Order is later than expected</p>
              <p className="text-xs text-orange-600">The restaurant has been notified. Your order will be with you soon.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isCancelled && !isRejected && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              {ORDER_STEPS.map((step, idx) => (
                <div key={step.status} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                        idx <= currentStep
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30 text-muted-foreground"
                      )}
                    >
                      {idx + 1}
                    </div>
                    <span
                      className={cn(
                        "mt-1 text-[10px] leading-tight",
                        idx <= currentStep
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < ORDER_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "mx-1 h-0.5 flex-1",
                        idx < currentStep ? "bg-primary" : "bg-muted"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(order.status === "ready" || (order.status === "assigned" && !order.delivery?.riderId)) && (
        <Card className="mb-4 border-blue-200 bg-blue-50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-3 w-3 animate-pulse rounded-full bg-blue-500" />
            <span className="text-sm font-medium text-blue-700">
              Searching for a rider near you...
            </span>
          </CardContent>
        </Card>
      )}

      {order.delivery?.isExternal && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <p className="text-sm font-medium">Your rider: {order.delivery.externalRiderName}</p>
            <a href={`tel:${order.delivery.externalRiderPhone}`} className="text-sm text-primary">
              Call: {order.delivery.externalRiderPhone}
            </a>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {order.items?.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                {item.name} x{item.quantity}
              </span>
              <PriceDisplay cents={item.unitPriceCents * item.quantity} />
            </div>
          ))}
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <PriceDisplay cents={order.totalCents} />
          </div>
        </CardContent>
      </Card>

      {showRating && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Rate Your Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.vendorId && (
              <StarRating
                value={vendorRating}
                onChange={setVendorRating}
                label="Food / Restaurant"
              />
            )}
            {hasDelivery && (
              <StarRating
                value={riderRating}
                onChange={setRiderRating}
                label="Delivery / Rider"
              />
            )}
            <div className="space-y-1">
              <span className="text-sm font-medium">Comment (optional)</span>
              <textarea
                placeholder="How was your experience?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            {hasDelivery && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Tip for rider (optional)</span>
                <div className="flex flex-wrap gap-2">
                  {[100, 200, 500].map((c) => (
                    <Button
                      key={c}
                      variant={tipCents === c ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setTipCents(c);
                        setCustomTipCents("");
                      }}
                    >
                      £{c / 100}
                    </Button>
                  ))}
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">Custom:</span>
                    <Input
                      type="number"
                      placeholder="0"
                      className="w-20"
                      min={0}
                      step={10}
                      value={customTipCents}
                      onChange={(e) => {
                        setCustomTipCents(e.target.value);
                        setTipCents(null);
                      }}
                    />
                    <span className="text-xs text-muted-foreground">p</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              className="w-full gap-2"
              onClick={handleSubmitRating}
              disabled={submitting || (vendorRating === 0 && riderRating === 0)}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Submit"
              )}
            </Button>
            <button
              type="button"
              onClick={() => router.push(`/orders/${id}/rate`)}
              className="mt-2 w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Rate on full page →
            </button>
          </CardFooter>
        </Card>
      )}

      {!isRejected && (
        <div className="mt-4 space-y-2">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => router.push("/chat")}
          >
            <MessageCircle className="size-4" />
            Chat with Restaurant
          </Button>
          {hasDelivery && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => router.push("/chat")}
            >
              <Phone className="size-4" />
              Chat with Rider
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
