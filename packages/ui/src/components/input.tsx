"use client";

import { cn } from "../lib/utils";

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };
