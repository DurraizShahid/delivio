"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Separator,
  Skeleton,
} from "@delivio/ui";
import type { VendorSettings, DeliveryMode } from "@delivio/types";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery<VendorSettings>({
    queryKey: ["vendor-settings"],
    queryFn: () => api.vendorSettings.get(),
  });

  const [autoAccept, setAutoAccept] = useState(false);
  const [prepTime, setPrepTime] = useState(15);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("third_party");
  const [deliveryRadius, setDeliveryRadius] = useState(5);
  const [autoDispatchDelay, setAutoDispatchDelay] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setAutoAccept(settings.autoAccept);
      setPrepTime(settings.defaultPrepTimeMinutes ?? 15);
      setDeliveryMode(settings.deliveryMode ?? "third_party");
      setDeliveryRadius(settings.deliveryRadiusKm ?? 5);
      setAutoDispatchDelay((settings as VendorSettings & { autoDispatchDelayMinutes?: number }).autoDispatchDelayMinutes ?? 0);
    }
  }, [settings]);

  async function handleSave() {
    setSaving(true);
    try {
      await api.vendorSettings.update({
        autoAccept,
        defaultPrepTimeMinutes: prepTime,
        deliveryMode,
        deliveryRadiusKm: deliveryRadius,
        autoDispatchDelayMinutes: autoDispatchDelay,
      });
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: ["vendor-settings"] });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Failed to save settings";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-1/3" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your restaurant preferences
        </p>
      </div>

      {/* Auto-accept */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auto-Accept Orders</CardTitle>
          <CardDescription>
            Automatically accept incoming orders without manual review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <button
            type="button"
            role="switch"
            aria-checked={autoAccept}
            onClick={() => setAutoAccept(!autoAccept)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              autoAccept ? "bg-primary" : "bg-input"
            }`}
          >
            <span
              className={`pointer-events-none block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                autoAccept ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </CardContent>
      </Card>

      {/* Prep time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default Prep Time</CardTitle>
          <CardDescription>
            Average time to prepare an order (in minutes)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={1}
              max={120}
              value={prepTime}
              onChange={(e) => setPrepTime(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">minutes</span>
          </div>
        </CardContent>
      </Card>

      {/* Delivery mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery Mode</CardTitle>
          <CardDescription>
            How orders are delivered to customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="radio"
              name="deliveryMode"
              value="third_party"
              checked={deliveryMode === "third_party"}
              onChange={() => setDeliveryMode("third_party")}
              className="size-4 accent-primary"
            />
            <div>
              <p className="text-sm font-medium">Third-Party Riders</p>
              <p className="text-xs text-muted-foreground">
                Delivio assigns riders from the platform pool
              </p>
            </div>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="radio"
              name="deliveryMode"
              value="vendor_rider"
              checked={deliveryMode === "vendor_rider"}
              onChange={() => setDeliveryMode("vendor_rider")}
              className="size-4 accent-primary"
            />
            <div>
              <p className="text-sm font-medium">Own Riders</p>
              <p className="text-xs text-muted-foreground">
                Use your own delivery staff
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Delivery radius */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery Radius</CardTitle>
          <CardDescription>
            Maximum distance for delivery orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={30}
              step={0.5}
              value={deliveryRadius}
              onChange={(e) => setDeliveryRadius(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="w-16 text-right text-sm font-medium tabular-nums">
              {deliveryRadius} km
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Auto-dispatch delay */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auto-Dispatch Delay</CardTitle>
          <CardDescription>
            Minutes to wait after marking an order ready before auto-dispatching a rider. Set to 0 for immediate dispatch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={0}
              max={60}
              value={autoDispatchDelay}
              onChange={(e) => setAutoDispatchDelay(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">minutes</span>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Button
        className="w-full gap-2"
        disabled={saving}
        onClick={handleSave}
      >
        {saving ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        Save Settings
      </Button>
    </div>
  );
}
