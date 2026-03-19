import { create } from "zustand";
import type { CartItem } from "@delivio/types";

interface CartState {
  items: CartItem[];
  projectRef: string | null;
  shopId: string | null;
  setItems: (items: CartItem[]) => void;
  setProjectRef: (ref: string) => void;
  setShopId: (shopId: string) => void;
  addItem: (item: CartItem) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clear: () => void;
  totalCents: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  projectRef: null,
  shopId: null,
  setItems: (items) => set({ items }),
  setProjectRef: (ref) => set({ projectRef: ref }),
  setShopId: (shopId) => set({ shopId }),
  addItem: (item) => {
    const existing = get().items.find((i) => i.productId === item.productId);
    if (existing) {
      set({
        items: get().items.map((i) =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        ),
      });
    } else {
      set({ items: [...get().items, item] });
    }
  },
  updateQuantity: (itemId, quantity) => {
    if (quantity <= 0) {
      set({ items: get().items.filter((i) => i.id !== itemId) });
    } else {
      set({ items: get().items.map((i) => (i.id === itemId ? { ...i, quantity } : i)) });
    }
  },
  removeItem: (itemId) => set({ items: get().items.filter((i) => i.id !== itemId) }),
  clear: () => set({ items: [], projectRef: null, shopId: null }),
  totalCents: () => get().items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0),
  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
