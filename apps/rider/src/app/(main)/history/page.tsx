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
import { RiderPageHeader } from "@/components/rider-page-header";

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
    <div className="space-y-5">
      <RiderPageHeader
        title="Delivery history"
        description="Track completed drops and performance at a glance."
      >
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border/60 bg-background/80 p-3">
            <div className="text-xs text-muted-foreground">Completed</div>
            <div className="mt-1 text-base font-semibold tabular-nums">{totalCompleted}</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/80 p-3">
            <div className="text-xs text-muted-foreground">Avg ETA</div>
            <div className="mt-1 text-base font-semibold tabular-nums">
              {averageEta > 0 ? `${averageEta}m` : "—"}
            </div>
          </div>
        </div>
      </RiderPageHeader>

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
            <Card key={delivery.id} className="border-border/60 shadow-sm">
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
