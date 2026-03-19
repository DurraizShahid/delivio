import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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
        set({ status: "loading" });
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            set({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              status: "granted",
            });
          },
          () => {
            set({ status: "denied" });
          },
          { enableHighAccuracy: false, timeout: 10000 }
        );
      },

      clear: () => set({ lat: null, lon: null, address: null, status: "idle" }),
    }),
    { name: "delivio-location", storage: safeStorage }
  )
);
