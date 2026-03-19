"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Clock, Truck, AlertTriangle, TimerReset, RefreshCw, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Separator,
  Skeleton,
  OrderStatusBadge,
  PriceDisplay,
  cn,
} from "@delivio/ui";
import type { OrderStatus } from "@delivio/types";
import { useOrder } from "@/hooks/use-orders";
import { useWSEvent } from "@/providers/ws-provider";
import { api } from "@/lib/api";
import { useSLATimer } from "@/hooks/use-sla-timer";

const VENDOR_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "placed", label: "Placed" },
  { status: "accepted", label: "Accepted" },
  { status: "preparing", label: "Preparing" },
  { status: "ready", label: "Ready" },
  { status: "picked_up", label: "Picked Up" },
  { status: "completed", label: "Completed" },
];

function getStepIndex(status: OrderStatus): number {
  const idx = VENDOR_STEPS.findIndex((s) => s.status === status);
  return idx >= 0 ? idx : 0;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: order, isLoading } = useOrder(id);
  const [loading, setLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState("15");
  const [showExtendForm, setShowExtendForm] = useState(false);
  const [externalName, setExternalName] = useState("");
  const [externalPhone, setExternalPhone] = useState("");

  useWSEvent("order:status_changed", (event) => {
    if (event.orderId === id) {
      toast.info(`Order updated: ${event.status.replace(/_/g, " ")}`);
      queryClient.invalidateQueries({ queryKey: ["orders", id] });
    }
  });

  const slaRemaining = useSLATimer(order?.slaDeadline ?? null);

  async function handleAction(action: () => Promise<unknown>, label: string) {
    setLoading(label);
    try {
      await action();
      toast.success(`Order ${label.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", id] });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : `Failed to ${label.toLowerCase()}`;
      toast.error(message);
    } finally {
      setLoading(null);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl text-center py-16">
        <p className="text-muted-foreground">Order not found</p>
      </div>
    );
  }

  const currentStep = getStepIndex(order.status);
  const isCancelled = order.status === "cancelled";
  const isRejected = order.status === "rejected";
  const isTerminal = isCancelled || isRejected;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" /> Back to orders
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Order #{order.id.slice(0, 8)}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* SLA Timer */}
      {order.slaDeadline && !isTerminal && (
        <Card className={cn(
          "shadow-sm border-border/60",
          slaRemaining && slaRemaining <= 0 ? "border-destructive/50 bg-destructive/5" : "bg-amber-50/50"
        )}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={cn(
              "flex size-9 items-center justify-center rounded-xl",
              slaRemaining && slaRemaining <= 0 ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-600"
            )}>
              <Clock className="size-4" />
            </div>
            <div className="text-sm">
              {slaRemaining && slaRemaining > 0 ? (
                <span>
                  SLA deadline in{" "}
                  <span className="font-semibold tabular-nums">
                    {Math.floor(slaRemaining / 60)}m {slaRemaining % 60}s
                  </span>
                </span>
              ) : (
                <span className="text-destructive font-medium">
                  SLA deadline breached
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress steps */}
      {!isTerminal && (
        <Card className="shadow-sm border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              {VENDOR_STEPS.map((step, idx) => (
                <div key={step.status} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                        idx <= currentStep
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      {idx + 1}
                    </div>
                    <span
                      className={cn(
                        "mt-1.5 text-[10px] leading-tight text-center",
                        idx <= currentStep
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < VENDOR_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "mx-1 h-0.5 flex-1 rounded-full",
                        idx < currentStep ? "bg-primary" : "bg-border"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      {!isTerminal && (
        <Card className="shadow-sm border-border/60">
          <CardContent className="flex flex-wrap gap-2 p-4">
            {order.status === "placed" && (
              <>
                <Button
                  disabled={!!loading}
                  onClick={() => handleAction(() => api.orders.accept(order.id), "Accepted")}
                >
                  {loading === "Accepted" ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  Accept Order
                </Button>
                <Button
                  variant="destructive"
                  disabled={!!loading}
                  onClick={() => setShowRejectForm(!showRejectForm)}
                >
                  Reject
                </Button>
              </>
            )}
            {order.status === "accepted" && (
              <Button
                disabled={!!loading}
                onClick={() => handleAction(() => api.orders.updateStatus(order.id, "preparing"), "Started preparing")}
              >
                {loading === "Started preparing" ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Start Preparing
              </Button>
            )}
            {order.status === "preparing" && (
              <Button
                disabled={!!loading}
                onClick={() => handleAction(() => api.orders.updateStatus(order.id, "ready"), "Marked ready")}
              >
                {loading === "Marked ready" ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Mark Ready
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reject form */}
      {showRejectForm && order.status === "placed" && (
        <Card className="shadow-sm border-border/60">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-medium">Reason for rejection</p>
            <Input
              placeholder="e.g. Out of stock, kitchen closed..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                disabled={!!loading}
                onClick={() =>
                  handleAction(
                    () => api.orders.reject(order.id, rejectReason || undefined),
                    "Rejected"
                  )
                }
              >
                {loading === "Rejected" ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Confirm Reject
              </Button>
              <Button variant="outline" onClick={() => setShowRejectForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejection / cancellation notice */}
      {isRejected && order.rejectionReason && (
        <Card className="border-destructive/50 bg-destructive/5 shadow-sm">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
              <AlertTriangle className="size-4 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium text-destructive">Rejected</p>
              <p className="text-sm text-muted-foreground mt-0.5">{order.rejectionReason}</p>
            </div>
          </CardContent>
        </Card>
      )}
      {isCancelled && order.cancellationReason && (
        <Card className="border-destructive/50 bg-destructive/5 shadow-sm">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
              <AlertTriangle className="size-4 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium text-destructive">Cancelled</p>
              <p className="text-sm text-muted-foreground mt-0.5">{order.cancellationReason}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <Card className="shadow-sm border-border/60">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.items?.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {item.name} &times; {item.quantity}
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

      {/* Order meta */}
      <Card className="shadow-sm border-border/60">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Order ID</span>
            <span className="font-mono text-xs text-muted-foreground">{order.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Customer</span>
            <span>{order.customerId.slice(0, 8)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Placed at</span>
            <span>{new Date(order.createdAt).toLocaleString()}</span>
          </div>
          {order.prepTimeMinutes && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prep time</span>
              <span>{order.prepTimeMinutes} min</span>
            </div>
          )}
          {order.deliveryMode && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery mode</span>
              <span className="capitalize">{order.deliveryMode.replace(/_/g, " ")}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment</span>
            <span className="capitalize">{order.paymentStatus}</span>
          </div>
        </CardContent>
      </Card>

      {/* Delivery status */}
      {order.deliveryMode && (
        <Card className="shadow-sm border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Truck className="size-4" />
            </div>
            <div className="text-sm">
              <p className="font-medium">Delivery</p>
              <p className="text-muted-foreground capitalize">
                {order.deliveryMode.replace(/_/g, " ")} delivery
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extend SLA */}
      {(order.status === "accepted" || order.status === "preparing") && order.slaDeadline && (
        <Card className="shadow-sm border-border/60">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium flex items-center gap-2">
                <TimerReset className="size-4 text-muted-foreground" /> Extend Prep Time
              </p>
              {!showExtendForm && (
                <Button size="sm" variant="outline" onClick={() => setShowExtendForm(true)}>
                  Extend Time
                </Button>
              )}
            </div>
            {showExtendForm && (
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Additional minutes</label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={extendMinutes}
                    onChange={(e) => setExtendMinutes(e.target.value)}
                  />
                </div>
                <Button
                  disabled={!!loading}
                  onClick={() =>
                    handleAction(
                      () => api.orders.extendSla(order.id, parseInt(extendMinutes, 10) || undefined),
                      "Extended SLA"
                    ).then(() => setShowExtendForm(false))
                  }
                >
                  {loading === "Extended SLA" ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  Confirm
                </Button>
                <Button variant="outline" onClick={() => setShowExtendForm(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reassign Rider */}
      {order.delivery?.riderId && (order.delivery.status === "assigned" || order.delivery.status === "picked_up") && (
        <Card className="shadow-sm border-border/60">
          <CardContent className="flex items-center justify-between p-4">
            <p className="text-sm font-medium flex items-center gap-2">
              <RefreshCw className="size-4 text-muted-foreground" /> Reassign Rider
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={!!loading}
              onClick={() =>
                handleAction(
                  () => api.deliveries.reassign(order.delivery!.id),
                  "Reassigned rider"
                )
              }
            >
              {loading === "Reassigned rider" ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Reassign
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Assign External Rider */}
      {order.deliveryMode === "vendor_rider" && order.delivery && (
        <Card className="shadow-sm border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <UserPlus className="size-4 text-muted-foreground" /> Assign External Rider
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Rider name</label>
              <Input
                placeholder="e.g. John"
                value={externalName}
                onChange={(e) => setExternalName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Rider phone</label>
              <Input
                placeholder="e.g. +44 7700 900000"
                value={externalPhone}
                onChange={(e) => setExternalPhone(e.target.value)}
              />
            </div>
            <Button
              disabled={!!loading || !externalName.trim() || !externalPhone.trim()}
              onClick={() =>
                handleAction(
                  () => api.deliveries.assignExternal(order.delivery!.id, {
                    name: externalName.trim(),
                    phone: externalPhone.trim(),
                  }),
                  "Assigned external rider"
                ).then(() => { setExternalName(""); setExternalPhone(""); })
              }
            >
              {loading === "Assigned external rider" ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Assign External Rider
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
