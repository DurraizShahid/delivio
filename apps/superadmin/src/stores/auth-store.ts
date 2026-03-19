import { create } from "zustand";
import type { Superadmin } from "@delivio/types";
import { api } from "@/lib/api";

interface AuthState {
  user: Superadmin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  setUser: (user: Superadmin | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  hydrate: async () => {
    try {
      const session = await api.superadmin.auth.session();
      if (session?.user) {
        set({ user: session.user, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user) =>
    set({ user, isAuthenticated: !!user, isLoading: false }),

  logout: async () => {
    try {
      await api.superadmin.auth.logout();
    } catch {}
    set({ user: null, isAuthenticated: false });
  },
}));
