"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Skeleton,
  Input,
} from "@delivio/ui";
import { cn } from "@delivio/ui";
import { useOrder } from "@/hooks/use-orders";
import { api } from "@/lib/api";
import type { OrderStatus, Order } from "@delivio/types";

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
            className="focus:outline-none focus:ring-2 focus:ring-ring rounded p-0.5"
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
          >
            <Star
              className={cn(
                "size-10 transition-colors",
                i <= value ? "fill-amber-400 text-amber-500" : "text-muted-foreground"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

const TIP_PRESETS = [
  { label: "£1", cents: 100 },
  { label: "£2", cents: 200 },
  { label: "£5", cents: 500 },
];

export default function OrderRatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: rawOrder, isLoading } = useOrder(id);
  const order = rawOrder ? normalizeOrder(rawOrder) : null;

  const [vendorRating, setVendorRating] = useState(0);
  const [riderRating, setRiderRating] = useState(0);
  const [comment, setComment] = useState("");
  const [tipCents, setTipCents] = useState<number | null>(null);
  const [customTipCents, setCustomTipCents] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
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
      router.push("/orders");
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 pt-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 pt-8 text-center">
        <p className="text-muted-foreground">Order not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/orders")}>
          Back to orders
        </Button>
      </div>
    );
  }

  if (order.status !== "completed") {
    return (
      <div className="mx-auto max-w-md px-4 pt-8 text-center">
        <p className="text-muted-foreground">You can only rate completed orders.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push(`/orders/${id}`)}>
          Back to order
        </Button>
      </div>
    );
  }

  const hasDelivery = !!order.delivery?.riderId;

  return (
    <div className="mx-auto max-w-md px-4 pt-4 pb-8">
      <button
        onClick={() => router.push(`/orders/${id}`)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back
      </button>

      <h1 className="mb-6 text-2xl font-bold">How was your order?</h1>

      <Card>
        <CardContent className="space-y-6 pt-6">
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
            <span className="text-sm font-medium">Comment (optional)</span>
            <textarea
              placeholder="Tell us about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          {hasDelivery && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Tip for rider (optional)</span>
              <div className="flex flex-wrap gap-2">
                {TIP_PRESETS.map(({ label, cents }) => (
                  <Button
                    key={cents}
                    variant={tipCents === cents ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setTipCents(cents);
                      setCustomTipCents("");
                    }}
                  >
                    {label}
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
            onClick={handleSubmit}
            disabled={submitting || (vendorRating === 0 && riderRating === 0)}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Submit"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
