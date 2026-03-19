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
  Skeleton,
  cn,
} from "@delivio/ui";
import type { VendorSettings, DeliveryMode } from "@delivio/types";
import { api } from "@/lib/api";
import { useShopStore } from "@/stores/shop-store";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const activeShop = useShopStore((s) => s.activeShop);
  const { data: settings, isLoading } = useQuery<VendorSettings>({
    queryKey: ["vendor-settings", activeShop?.id],
    queryFn: () => api.vendorSettings.get(activeShop?.id),
  });

  const [autoAccept, setAutoAccept] = useState(false);
  const [prepTime, setPrepTime] = useState(15);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("third_party");
  const [autoDispatchDelay, setAutoDispatchDelay] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setAutoAccept(settings.autoAccept);
      setPrepTime(settings.defaultPrepTimeMinutes ?? 15);
      setDeliveryMode(settings.deliveryMode ?? "third_party");
      setAutoDispatchDelay(settings.autoDispatchDelayMinutes ?? 0);
    }
  }, [settings]);

  async function handleSave() {
    setSaving(true);
    try {
      await api.vendorSettings.update({
        autoAccept,
        defaultPrepTimeMinutes: prepTime,
        deliveryMode,
        autoDispatchDelayMinutes: autoDispatchDelay,
      }, activeShop?.id);
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: ["vendor-settings", activeShop?.id] });
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
      <div className="mx-auto max-w-xl space-y-4">
        <Skeleton className="h-8 w-1/3" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your restaurant preferences
        </p>
      </div>

      {/* Auto-accept */}
      <Card className="shadow-sm border-border/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Auto-Accept Orders</CardTitle>
              <CardDescription className="mt-1">
                Automatically accept incoming orders without manual review
              </CardDescription>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoAccept}
              onClick={() => setAutoAccept(!autoAccept)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                autoAccept ? "bg-primary" : "bg-input"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform",
                  autoAccept ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </CardHeader>
      </Card>

      {/* Prep time */}
      <Card className="shadow-sm border-border/60">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Default Prep Time</CardTitle>
          <CardDescription className="mt-1">
            Average time to prepare an order
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
      <Card className="shadow-sm border-border/60">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Delivery Mode</CardTitle>
          <CardDescription className="mt-1">
            How orders are delivered to customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <label className={cn(
            "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all",
            deliveryMode === "third_party"
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border/60 hover:bg-muted/50"
          )}>
            <div className={cn(
              "flex size-5 items-center justify-center rounded-full border-2 transition-colors",
              deliveryMode === "third_party" ? "border-primary" : "border-muted-foreground/30"
            )}>
              {deliveryMode === "third_party" && (
                <div className="size-2.5 rounded-full bg-primary" />
              )}
            </div>
            <input
              type="radio"
              name="deliveryMode"
              value="third_party"
              checked={deliveryMode === "third_party"}
              onChange={() => setDeliveryMode("third_party")}
              className="sr-only"
            />
            <div>
              <p className="text-sm font-medium">Third-Party Riders</p>
              <p className="text-xs text-muted-foreground">
                Delivio assigns riders from the platform pool
              </p>
            </div>
          </label>
          <label className={cn(
            "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all",
            deliveryMode === "vendor_rider"
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border/60 hover:bg-muted/50"
          )}>
            <div className={cn(
              "flex size-5 items-center justify-center rounded-full border-2 transition-colors",
              deliveryMode === "vendor_rider" ? "border-primary" : "border-muted-foreground/30"
            )}>
              {deliveryMode === "vendor_rider" && (
                <div className="size-2.5 rounded-full bg-primary" />
              )}
            </div>
            <input
              type="radio"
              name="deliveryMode"
              value="vendor_rider"
              checked={deliveryMode === "vendor_rider"}
              onChange={() => setDeliveryMode("vendor_rider")}
              className="sr-only"
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

      {/* Auto-dispatch delay */}
      <Card className="shadow-sm border-border/60">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Auto-Dispatch Delay</CardTitle>
          <CardDescription className="mt-1">
            Minutes to wait after marking ready before auto-dispatching. Set to 0 for immediate.
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
