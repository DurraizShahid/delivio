import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

type AvailabilityMode = "active" | "background";

export function useRiderAvailabilityLocation(mode: AvailabilityMode) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setGranted(status === "granted");
    })();
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !granted) return;

    const send = async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy:
            mode === "active"
              ? Location.Accuracy.High
              : Location.Accuracy.Balanced,
        });
        await api.deliveries.updateRiderAvailability({
          lat: loc.coords.latitude,
          lon: loc.coords.longitude,
          heading: loc.coords.heading ?? undefined,
          speed: loc.coords.speed ?? undefined,
        });
      } catch {
        // ignore — best-effort
      }
    };

    send();
    timer.current = setInterval(send, mode === "active" ? 5_000 : 15_000);

    return () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
  }, [granted, isAuthenticated, isLoading, mode]);

  return { granted };
}

