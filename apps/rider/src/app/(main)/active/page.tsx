"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bike,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Navigation,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  EmptyState,
} from "@delivio/ui";
import { cn } from "@delivio/ui";
import { useActiveDelivery } from "@/hooks/use-deliveries";
import { api } from "@/lib/api";
import type { DeliveryStatus } from "@delivio/types";

const STEPS: { key: DeliveryStatus; label: string; icon: typeof Package }[] = [
  { key: "assigned", label: "Assigned", icon: Package },
  { key: "picked_up", label: "Picked Up", icon: Bike },
  { key: "arrived", label: "Arrived", icon: Navigation },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

function getStepIndex(status: DeliveryStatus) {
  return STEPS.findIndex((s) => s.key === status);
}

function getNextStatus(current: DeliveryStatus): DeliveryStatus | null {
  const map: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
    assigned: "picked_up",
    picked_up: "arrived",
    arrived: "delivered",
  };
  return map[current] ?? null;
}

function getNextLabel(current: DeliveryStatus): string {
  const map: Partial<Record<DeliveryStatus, string>> = {
    assigned: "Mark Picked Up",
    picked_up: "Arrived Outside",
    arrived: "Complete Delivery",
  };
  return map[current] ?? "Update Status";
}

export default function ActiveDeliveryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: deliveries, isLoading } = useActiveDelivery();
  const [updating, setUpdating] = useState(false);

  const activeDeliveries = deliveries?.filter(
    (d) => d.status !== "delivered" && d.status !== "pending"
  );
  const delivery = activeDeliveries?.[0];

  async function handleUpdateStatus() {
    if (!delivery) return;
    const next = getNextStatus(delivery.status);
    if (!next) return;

    setUpdating(true);
    try {
      if (next === "arrived") {
        await api.deliveries.arrived(delivery.id);
      } else {
        await api.deliveries.updateStatus(delivery.id, next);
      }
      toast.success(`Status updated to ${next.replace("_", " ")}`);
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Failed to update status";
      toast.error(message);
    } finally {
      setUpdating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md px-4 pt-6">
        <h1 className="mb-4 text-2xl font-bold">Active Delivery</h1>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="mx-auto max-w-md px-4 pt-6">
        <h1 className="mb-4 text-2xl font-bold">Active Delivery</h1>
        <EmptyState
          icon={<Bike />}
          title="No active delivery"
          description="Claim a delivery from the Available tab to get started"
        />
      </div>
    );
  }

  const currentStep = getStepIndex(delivery.status);
  const nextStatus = getNextStatus(delivery.status);

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold">Active Delivery</h1>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">
            Order #{delivery.orderId.slice(0, 8)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Status stepper */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isCompleted = idx < currentStep;
                const isCurrent = idx === currentStep;
                return (
                  <div key={step.key} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "flex size-10 items-center justify-center rounded-full border-2 transition-colors",
                          isCompleted
                            ? "border-primary bg-primary text-primary-foreground"
                            : isCurrent
                              ? "border-primary bg-background text-primary"
                              : "border-muted bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="size-5" />
                      </div>
                      <span
                        className={cn(
                          "mt-1.5 text-[10px] font-medium",
                          isCompleted || isCurrent
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "mx-1 h-0.5 flex-1",
                          idx < currentStep ? "bg-primary" : "bg-muted"
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery details */}
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center gap-3">
              <MapPin className="size-4 shrink-0 text-muted-foreground" />
              <span className="text-sm">
                Pickup: {(delivery as any).shopName || (delivery as any).shopAddress || delivery.zoneId || "Restaurant"}
              </span>
            </div>
            {delivery.etaMinutes && (
              <div className="flex items-center gap-3">
                <Bike className="size-4 shrink-0 text-muted-foreground" />
                <span className="text-sm">
                  ETA: ~{delivery.etaMinutes} minutes
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-2">
            {nextStatus && (
              <Button
                className="w-full"
                onClick={handleUpdateStatus}
                disabled={updating}
              >
                {updating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  getNextLabel(delivery.status)
                )}
              </Button>
            )}

            {delivery.status === "delivered" && (
              <div className="rounded-lg bg-green-50 p-3 text-center text-sm font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                <CheckCircle2 className="mb-1 mx-auto size-5" />
                Delivery completed!
              </div>
            )}

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => router.push("/chat")}
            >
              <MessageCircle className="size-4" />
              Chat
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
