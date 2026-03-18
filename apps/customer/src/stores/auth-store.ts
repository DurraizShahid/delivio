import { create } from "zustand";
import type { Customer } from "@delivio/types";
import { api } from "@/lib/api";

interface AuthState {
  customer: Customer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  setCustomer: (customer: Customer | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  customer: null,
  isAuthenticated: false,
  isLoading: true,

  hydrate: async () => {
    try {
      const session = await api.auth.getSession();
      if (session?.customer) {
        set({
          customer: session.customer,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ customer: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ customer: null, isAuthenticated: false, isLoading: false });
    }
  },

  setCustomer: (customer) =>
    set({ customer, isAuthenticated: !!customer, isLoading: false }),

  logout: async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    }
    set({ customer: null, isAuthenticated: false });
  },
}));
