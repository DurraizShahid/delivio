"use client";

import { cn } from "@delivio/ui";
import {
  Utensils,
  Pizza,
  Coffee,
  Salad,
  Beef,
  Sandwich,
  IceCream,
  Soup,
  Fish,
  Flame,
} from "lucide-react";

const CUISINE_CATEGORIES = [
  { id: "all", label: "All", icon: Utensils },
  { id: "pizza", label: "Pizza", icon: Pizza },
  { id: "burgers", label: "Burgers", icon: Sandwich },
  { id: "sushi", label: "Sushi", icon: Fish },
  { id: "healthy", label: "Healthy", icon: Salad },
  { id: "coffee", label: "Coffee", icon: Coffee },
  { id: "desserts", label: "Desserts", icon: IceCream },
  { id: "soup", label: "Soup", icon: Soup },
  { id: "grill", label: "Grill", icon: Flame },
  { id: "steak", label: "Steak", icon: Beef },
];

interface CategoryFilterProps {
  active: string;
  onSelect: (id: string) => void;
}

export function CategoryFilter({ active, onSelect }: CategoryFilterProps) {
  return (
    <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-2">
      {CUISINE_CATEGORIES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className={cn(
            "group flex shrink-0 flex-col items-center gap-2 rounded-2xl border px-4 py-3 transition-all duration-200",
            active === id
              ? "border-primary/30 bg-gradient-to-br from-primary to-primary/85 text-primary-foreground shadow-lg shadow-primary/25 ring-2 ring-primary/15"
              : "border-border/50 bg-background/80 text-muted-foreground shadow-sm backdrop-blur-sm hover:border-primary/25 hover:bg-muted/80 hover:text-foreground hover:shadow-md"
          )}
        >
          <Icon
            className={cn(
              "size-6 transition-transform group-hover:scale-110",
              active === id && "text-primary-foreground"
            )}
          />
          <span className="text-xs font-medium whitespace-nowrap">{label}</span>
        </button>
      ))}
    </div>
  );
}
