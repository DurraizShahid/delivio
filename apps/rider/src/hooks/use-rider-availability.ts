import { useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Periodically publish rider availability location so dispatch targeting works
 * even when the rider has no active delivery.
 */
export function useRiderAvailabilityLocation() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (typeof window === "undefined") return;
    if (!("geolocation" in navigator)) return;

    const send = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await api.deliveries.updateRiderAvailability({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              heading:
                typeof pos.coords.heading === "number"
                  ? pos.coords.heading
                  : undefined,
              speed:
                typeof pos.coords.speed === "number"
                  ? pos.coords.speed
                  : undefined,
            });
          } catch {
            // ignore — best-effort
          }
        },
        () => {
          // ignore — permission denied / unavailable
        },
        { enableHighAccuracy: true, maximumAge: 30_000, timeout: 10_000 }
      );
    };

    // Initial ping + interval
    send();
    timerRef.current = window.setInterval(send, 10_000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isAuthenticated, isLoading]);
}

