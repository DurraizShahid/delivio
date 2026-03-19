"use client";

import { Clock, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  Skeleton,
  EmptyState,
  Badge,
} from "@delivio/ui";
import { useDeliveryHistory } from "@/hooks/use-deliveries";

export default function HistoryPage() {
  const { data: deliveries, isLoading } = useDeliveryHistory();
  const totalCompleted = deliveries?.length ?? 0;
  const averageEta =
    deliveries && deliveries.length > 0
      ? Math.round(
          deliveries.reduce((sum, d) => sum + (d.etaMinutes ?? 0), 0) /
            deliveries.length
        )
      : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">Delivery History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track completed drops and performance at a glance.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border/60 bg-background p-3">
            <div className="text-xs text-muted-foreground">Completed</div>
            <div className="mt-1 text-base font-semibold">{totalCompleted}</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-background p-3">
            <div className="text-xs text-muted-foreground">Avg ETA</div>
            <div className="mt-1 text-base font-semibold">
              {averageEta > 0 ? `${averageEta}m` : "--"}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : !deliveries || deliveries.length === 0 ? (
        <EmptyState
          icon={<Clock />}
          title="No deliveries yet"
          description="Completed deliveries will appear here"
        />
      ) : (
        <div className="space-y-3">
          {deliveries.map((delivery) => (
            <Card key={delivery.id} className="border-border/70 shadow-sm">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-green-600" />
                    <span className="text-sm font-medium">
                      Order #{delivery.orderId.slice(0, 8)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {new Date(delivery.createdAt).toLocaleDateString()}
                    </span>
                    {delivery.etaMinutes && (
                      <span>~{delivery.etaMinutes} min</span>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" className="rounded-md text-xs">
                  Completed
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
