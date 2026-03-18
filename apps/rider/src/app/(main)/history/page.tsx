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

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold">Delivery History</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
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
            <Card key={delivery.id}>
              <CardContent className="flex items-center justify-between p-4">
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
                <Badge variant="secondary" className="text-xs">
                  Earnings TBD
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
