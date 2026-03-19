"use client";

import { useState } from "react";
import { PackageCheck, Loader2, MapPin, Timer, Zap, BellRing } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  Button,
  Skeleton,
  EmptyState,
  Badge,
} from "@delivio/ui";
import { useAvailableDeliveries } from "@/hooks/use-deliveries";
import { useWSEvent } from "@/providers/ws-provider";
import { api } from "@/lib/api";

export default function AvailableDeliveriesPage() {
  const queryClient = useQueryClient();
  const { data: deliveries, isLoading } = useAvailableDeliveries();
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const totalOffers = deliveries?.length ?? 0;
  const quickOffers =
    deliveries?.filter((delivery) => (delivery.etaMinutes ?? 999) <= 20).length ?? 0;

  useWSEvent("delivery:request", () => {
    queryClient.invalidateQueries({ queryKey: ["deliveries", "available"] });
    toast.info("New delivery request available!");
  });

  async function handleClaim(deliveryId: string) {
    setClaimingId(deliveryId);
    try {
      await api.deliveries.claim(deliveryId);
      toast.success("Delivery claimed!");
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Failed to claim delivery";
      toast.error(message);
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Available Deliveries</h1>
            <p className="text-sm text-muted-foreground">
              New offers appear in real-time. Claim quickly to lock them in.
            </p>
          </div>
          <Badge className="rounded-md bg-primary/10 text-primary hover:bg-primary/10">
            Live
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border/60 bg-background p-3">
            <div className="text-xs text-muted-foreground">Offers</div>
            <div className="mt-1 flex items-center gap-1 text-base font-semibold">
              <BellRing className="size-4 text-primary" />
              {totalOffers}
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-background p-3">
            <div className="text-xs text-muted-foreground">Quick ETA</div>
            <div className="mt-1 flex items-center gap-1 text-base font-semibold">
              <Zap className="size-4 text-primary" />
              {quickOffers}
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-background p-3">
            <div className="text-xs text-muted-foreground">Status</div>
            <div className="mt-1 text-base font-semibold">Online</div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : !deliveries || deliveries.length === 0 ? (
        <EmptyState
          icon={<PackageCheck />}
          title="No deliveries available"
          description="New delivery requests will appear here in real-time"
        />
      ) : (
        <div className="space-y-3">
          {deliveries.map((delivery) => (
            <Card key={delivery.id} className="overflow-hidden border-border/70 shadow-sm">
              <CardContent className="p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-sm font-semibold">
                      Order #{delivery.orderId.slice(0, 8)}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      <span>
                        {delivery.zoneId
                          ? `Zone: ${delivery.zoneId}`
                          : "Nearby"}
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="rounded-md px-2 py-1 text-xs">
                    {delivery.etaMinutes
                      ? `ETA ${delivery.etaMinutes}m`
                      : "New"}
                  </Badge>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-muted/60 px-2.5 py-2">
                    <div className="text-muted-foreground">Requested</div>
                    <div className="mt-0.5 flex items-center gap-1 font-medium text-foreground">
                      <Timer className="size-3.5" />
                      {new Date(delivery.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/60 px-2.5 py-2">
                    <div className="text-muted-foreground">Priority</div>
                    <div className="mt-0.5 font-medium text-foreground">
                      {(delivery.etaMinutes ?? 999) <= 15 ? "High" : "Standard"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <Button
                    size="sm"
                    className="min-w-28 rounded-lg"
                    onClick={() => handleClaim(delivery.id)}
                    disabled={claimingId === delivery.id}
                  >
                    {claimingId === delivery.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Accept delivery"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
