"use client";

import { cn } from "../lib/utils";
import { usePlatformBranding } from "../providers/dynamic-theme-provider";

type PlatformBrandingMarkProps = {
  className?: string;
  imgClassName?: string;
};

/**
 * Renders the platform logo image when set, otherwise the first letter of the app name.
 * Must be used inside DynamicThemeProvider.
 */
export function PlatformBrandingMark({
  className,
  imgClassName,
}: PlatformBrandingMarkProps) {
  const { appName, logoUrl } = usePlatformBranding();
  const initial = appName.trim().charAt(0).toUpperCase() || "D";

  if (logoUrl) {
    return (
      <span
        className={cn("relative flex shrink-0 items-center justify-center overflow-hidden", className)}
      >
        <img
          src={logoUrl}
          alt=""
          className={cn("size-full object-contain", imgClassName)}
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center font-bold text-primary-foreground",
        className,
      )}
    >
      {initial}
    </span>
  );
}
