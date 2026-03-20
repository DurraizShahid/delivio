"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  MessageCircle,
  Phone,
  Star,
  Loader2,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
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
import { PromoBanner } from "@/components/promo-banner";

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

function normalizeOrder(raw: unknown): Order | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const items = (o.items ?? o.order_items) as
    | Array<{
        id: string;
        name: string;
        quantity: number;
        unit_price_cents?: number;
        unitPriceCents?: number;
      }>
    | undefined;
  return {
    id: String(o.id ?? ""),
    projectRef: String(o.project_ref ?? o.projectRef ?? ""),
    customerId: String(o.customer_id ?? o.customerId ?? ""),
    status: (o.status ?? "placed") as OrderStatus,
    paymentStatus: (o.payment_status ?? o.paymentStatus ?? "pending") as
      | "pending"
      | "succeeded"
      | "failed"
      | "refunded",
    totalCents: Number(o.total_cents ?? o.totalCents ?? 0),
    rejectionReason: (o.rejection_reason ?? o.rejectionReason) as
      | string
      | undefined,
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
    const t = setTimeout(() => tick(), 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, [tick]);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
      Estimated delivery: {remaining}
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
    <div className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className="rounded p-0.5 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
          >
            <Star
              className={cn(
                "size-8 transition-colors",
                i <= value
                  ? "fill-amber-400 text-amber-500"
                  : "text-muted-foreground/30 hover:text-amber-300"
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
  const [vendorRating, setVendorRating] = useState(0);
  const [riderRating, setRiderRating] = useState(0);
  const [comment, setComment] = useState("");
  const [tipCents, setTipCents] = useState<number | null>(null);
  const [customTipCents, setCustomTipCents] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  const { data: rawOrder, isLoading } = useOrder(id);
  const order = useMemo(
    () => (rawOrder ? normalizeOrder(rawOrder) : null),
    [rawOrder]
  );

  useWSEvent("order:status_changed", (event) => {
    if (event.orderId === id) {
      toast.info(`Order updated: ${event.status.replace(/_/g, " ")}`);
    }
  });

  useWSEvent("order:rejected", (event) => {
    if (event.orderId === id) {
      toast.error(
        event.reason ? `Order rejected: ${event.reason}` : "Order rejected"
      );
    }
  });

  useWSEvent("order:delayed", (event) => {
    if (event.orderId === id) {
      toast.warning(
        "Your order has been delayed. We'll update the ETA soon."
      );
    }
  });

  useWSEvent("delivery:location_update", () => {});

  if (authLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8 lg:px-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

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
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8 lg:px-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
            <Package className="size-8 text-muted-foreground" />
          </div>
          <p className="mt-4 text-muted-foreground">Order not found</p>
        </div>
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
  const slaOverdue = order.slaDeadline
    ? new Date(order.slaDeadline).getTime() < Date.now()
    : false;
  const isLate =
    (order.slaBreached || slaOverdue) &&
    !["completed", "cancelled", "rejected"].includes(order.status);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <PromoBanner placement="order_detail" />
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex size-10 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Order #{order.id.slice(0, 8)}</h1>
          <p className="text-xs text-muted-foreground">
            {new Date(order.createdAt).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Main content */}
        <div className="space-y-4">
          {isRejected && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-destructive">
              <p className="font-semibold">Order Rejected</p>
              {order.rejectionReason && (
                <p className="mt-1 text-sm opacity-80">
                  {order.rejectionReason}
                </p>
              )}
            </div>
          )}

          {showSla && order.slaDeadline && (
            <SlaCountdown slaDeadline={order.slaDeadline} />
          )}

          {isLate && (
            <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 dark:border-orange-800/30 dark:bg-orange-950/30">
              <AlertTriangle className="size-5 shrink-0 text-orange-600 dark:text-orange-400" />
              <div>
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                  Order is later than expected
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-300">
                  The restaurant has been notified. Your order will be with you
                  soon.
                </p>
              </div>
            </div>
          )}

          {/* Progress tracker */}
          {!isCancelled && !isRejected && (
            <div className="rounded-2xl border border-border/50 bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
                Order Progress
              </h3>
              <div className="flex items-center justify-between">
                {ORDER_STEPS.map((step, idx) => (
                  <div key={step.status} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                          idx <= currentStep
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/20 text-muted-foreground/40"
                        )}
                      >
                        {idx + 1}
                      </div>
                      <span
                        className={cn(
                          "mt-1.5 text-[10px] leading-tight text-center",
                          idx <= currentStep
                            ? "font-medium text-foreground"
                            : "text-muted-foreground/50"
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                    {idx < ORDER_STEPS.length - 1 && (
                      <div
                        className={cn(
                          "mx-1 h-0.5 flex-1 rounded-full",
                          idx < currentStep ? "bg-primary" : "bg-muted"
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(order.status === "ready" ||
            (order.status === "assigned" && !order.delivery?.riderId)) && (
            <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 dark:border-blue-800/30 dark:bg-blue-950/30">
              <div className="size-3 animate-pulse rounded-full bg-blue-500" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Searching for a rider near you...
              </span>
            </div>
          )}

          {order.delivery?.isExternal && (
            <div className="rounded-2xl border border-border/50 bg-card p-5">
              <p className="text-sm font-medium">
                Your rider: {order.delivery.externalRiderName}
              </p>
              <a
                href={`tel:${order.delivery.externalRiderPhone}`}
                className="text-sm text-primary"
              >
                Call: {order.delivery.externalRiderPhone}
              </a>
            </div>
          )}

          {/* Rating section */}
          {showRating && (
            <div className="rounded-2xl border border-border/50 bg-card p-6">
              <h3 className="text-lg font-bold">Rate Your Experience</h3>
              <div className="mt-4 space-y-5">
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
                <div className="space-y-2">
                  <span className="text-sm font-medium">
                    Comment (optional)
                  </span>
                  <textarea
                    placeholder="How was your experience?"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    className="flex w-full rounded-xl border border-input bg-transparent px-4 py-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  />
                </div>
                {hasDelivery && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">
                      Tip for rider (optional)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {[100, 200, 500].map((c) => (
                        <Button
                          key={c}
                          variant={tipCents === c ? "default" : "outline"}
                          size="sm"
                          className="rounded-full"
                          onClick={() => {
                            setTipCents(c);
                            setCustomTipCents("");
                          }}
                        >
                          &pound;{c / 100}
                        </Button>
                      ))}
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">
                          Custom:
                        </span>
                        <Input
                          type="number"
                          placeholder="0"
                          className="w-20 rounded-lg"
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
                <Button
                  className="w-full rounded-xl"
                  onClick={handleSubmitRating}
                  disabled={
                    submitting || (vendorRating === 0 && riderRating === 0)
                  }
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Submit Rating"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Items */}
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <h3 className="font-semibold">Order Items</h3>
            <div className="mt-4 space-y-2">
              {order.items?.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.name} &times; {item.quantity}
                  </span>
                  <PriceDisplay
                    cents={item.unitPriceCents * item.quantity}
                    className="font-medium"
                  />
                </div>
              ))}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <PriceDisplay cents={order.totalCents} />
              </div>
            </div>
          </div>

          {/* Actions */}
          {!isRejected && (
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full gap-2 rounded-xl"
                onClick={() => router.push("/chat")}
              >
                <MessageCircle className="size-4" />
                Chat with Restaurant
              </Button>
              {hasDelivery && (
                <Button
                  variant="outline"
                  className="w-full gap-2 rounded-xl"
                  onClick={() => router.push("/chat")}
                >
                  <Phone className="size-4" />
                  Chat with Rider
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
