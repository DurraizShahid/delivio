import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api } from "@/lib/api";

const safeStorage = createJSONStorage(() =>
  typeof window !== "undefined"
    ? localStorage
    : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      }
);

interface LocationState {
  lat: number | null;
  lon: number | null;
  address: string | null;
  status: "idle" | "loading" | "granted" | "denied";
  setLocation: (lat: number, lon: number) => void;
  setAddress: (address: string) => void;
  setStatus: (status: LocationState["status"]) => void;
  detectLocation: () => void;
  clear: () => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      lat: null,
      lon: null,
      address: null,
      status: "idle",

      setLocation: (lat, lon) => set({ lat, lon, status: "granted" }),
      setAddress: (address) => set({ address }),
      setStatus: (status) => set({ status }),

      detectLocation: () => {
        if (typeof window === "undefined" || !navigator.geolocation) {
          set({ status: "denied" });
          return;
        }
        // Clear existing address so the UI doesn't show stale data while re-detecting.
        set({ status: "loading", address: null });
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;

            // Update coordinates immediately so restaurant filtering refreshes.
            set({ lat, lon, status: "granted" });

            // Reverse-geocode to a human-readable address (best-effort).
            void (async () => {
              try {
                const geo = await api.public.reverseGeocode(lat, lon);
                if (geo && typeof geo.address === "string") {
                  // Safety net: strip any Google Plus Code prefix that might
                  // still come through as part of `formatted_address`.
                  const PLUS_CODE_PREFIX_RE =
                    /^([0-9A-Z]{4,6}\+[0-9A-Z]{2,4})(?:,)?\s*/i;
                  const cleaned = geo.address.replace(PLUS_CODE_PREFIX_RE, "").trim();
                  if (cleaned) set({ address: cleaned });
                }
              } catch {
                // Ignore reverse-geocoding failures; coordinates are still useful.
              }
            })();
          },
          () => {
            set({ status: "denied", address: null });
          },
          { enableHighAccuracy: false, timeout: 10000 }
        );
      },

      clear: () => set({ lat: null, lon: null, address: null, status: "idle" }),
    }),
    { name: "delivio-location", storage: safeStorage }
  )
);
