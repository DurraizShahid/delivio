import { create } from "zustand";
import type { User } from "@delivio/types";
import { api } from "@/lib/api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  hydrate: async () => {
    try {
      const session = await api.auth.getAdminSession();
      if (session?.user) {
        set({
          user: session.user as unknown as User,
          isAuthenticated: true,
          isLoading: false,
        });
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
      await api.auth.logout();
    } catch {
      // ignore
    }
    set({ user: null, isAuthenticated: false });
  },
}));
