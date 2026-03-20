import { create } from "zustand";

/** Search query for the home restaurant list — driven by the site header. */
export const useBrowseSearchStore = create<{
  query: string;
  setQuery: (query: string) => void;
}>((set) => ({
  query: "",
  setQuery: (query) => set({ query }),
}));
