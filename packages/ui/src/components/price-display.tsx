"use client";

import { cn } from "../lib/utils";
import { formatPrice } from "../lib/utils";

interface PriceDisplayProps extends React.ComponentProps<"span"> {
  cents: number;
  currency?: string;
}

export function PriceDisplay({
  cents,
  currency = "GBP",
  className,
  ...props
}: PriceDisplayProps) {
  return (
    <span className={cn("font-semibold tabular-nums", className)} {...props}>
      {formatPrice(cents, currency)}
    </span>
  );
}
