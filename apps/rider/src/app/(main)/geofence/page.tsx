"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Save, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Skeleton,
} from "@delivio/ui";
import type { GeoPolygon, RiderGeofence } from "@delivio/types";
import { api } from "@/lib/api";
import { GeofenceDrawerMap } from "@/components/map";

export default function RiderGeofencePage() {
  const queryClient = useQueryClient();
  const [geofence, setGeofence] = useState<GeoPolygon | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const { data, isLoading } = useQuery<{ geofence: RiderGeofence | null }>({
    queryKey: ["rider-geofence"],
    queryFn: () => api.riderGeofence.get(),
  });

  useEffect(() => {
    if (data?.geofence?.geofence) {
      setGeofence(data.geofence.geofence);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!geofence) throw new Error("Please draw your delivery zone on the map");
      return api.riderGeofence.save(geofence);
    },
    onSuccess: () => {
      toast.success("Delivery zone saved");
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["rider-geofence"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save delivery zone");
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Delivery Zone</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Draw the area you want to deliver in
          </p>
        </div>
        <Button
          className="gap-2 shrink-0"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !hasChanges}
        >
          {saveMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save Zone
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-[500px] w-full rounded-xl" />
      ) : (
        <Card className="shadow-sm border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="size-4" />
              Your Delivery Zone
            </CardTitle>
            <CardDescription>
              Use the polygon tool in the top-right corner to draw the area where you accept deliveries.
              You will only receive orders from shops whose delivery zone overlaps yours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GeofenceDrawerMap
              geofence={data?.geofence?.geofence ?? null}
              onGeofenceChange={(g) => {
                setGeofence(g);
                setHasChanges(true);
              }}
            />
            {data?.geofence && !hasChanges && (
              <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="size-4" />
                Delivery zone is set
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
