"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle, Navigation } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Separator,
  Skeleton,
  OrderStatusBadge,
  PriceDisplay,
} from "@delivio/ui";
import { cn } from "@delivio/ui";
import { useOrder } from "@/hooks/use-orders";
import { useWSEvent } from "@/providers/ws-provider";
import type { OrderStatus } from "@delivio/types";

const ORDER_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Order Placed" },
  { status: "accepted_by_vendor", label: "Accepted" },
  { status: "preparing", label: "Preparing" },
  { status: "ready", label: "Ready" },
  { status: "picked_up", label: "Picked Up" },
  { status: "delivered", label: "Delivered" },
];

function getStepIndex(status: OrderStatus): number {
  const idx = ORDER_STEPS.findIndex((s) => s.status === status);
  return idx >= 0 ? idx : 0;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: order, isLoading } = useOrder(id);

  useWSEvent("order:status_changed", (event) => {
    if (event.orderId === id) {
      toast.info(`Order updated: ${event.status.replace(/_/g, " ")}`);
    }
  });

  useWSEvent("delivery:location_update", (event) => {
    // Future: update map marker
  });

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

  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back
      </button>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">
          Order #{order.id.slice(0, 8)}
        </h1>
        <OrderStatusBadge status={order.status} />
      </div>

      {!isCancelled && (
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

      <div className="mt-4">
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => router.push("/chat")}
        >
          <MessageCircle className="size-4" />
          Chat with restaurant
        </Button>
      </div>
    </div>
  );
}
