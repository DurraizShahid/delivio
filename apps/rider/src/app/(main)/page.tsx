"use client";

import { useState } from "react";
import { PackageCheck, Loader2, MapPin } from "lucide-react";
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
    } catch (err: any) {
      toast.error(err.message || "Failed to claim delivery");
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold">Available Deliveries</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
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
            <Card key={delivery.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-sm font-medium">
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
                  <Badge variant="secondary">
                    {delivery.etaMinutes
                      ? `~${delivery.etaMinutes} min`
                      : "New"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(delivery.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleClaim(delivery.id)}
                    disabled={claimingId === delivery.id}
                  >
                    {claimingId === delivery.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Claim"
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
