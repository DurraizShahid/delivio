"use client";

import { cn } from "../lib/utils";
import { usePlatformBranding } from "../providers/dynamic-theme-provider";

type PlatformWordmarkProps = {
  className?: string;
  imgClassName?: string;
  children: React.ReactNode;
};

/**
 * Renders a horizontal wordmark image when `wordmarkUrl` is set; otherwise renders children (e.g. app name text).
 */
export function PlatformWordmark({
  className,
  imgClassName,
  children,
}: PlatformWordmarkProps) {
  const { wordmarkUrl } = usePlatformBranding();

  if (wordmarkUrl) {
    return (
      <span
        className={cn(
          "inline-flex max-w-[200px] items-center sm:max-w-[280px]",
          className,
        )}
      >
        <img
          src={wordmarkUrl}
          alt=""
          className={cn(
            "h-7 w-auto max-w-full object-contain object-left sm:h-8",
            imgClassName,
          )}
        />
      </span>
    );
  }

  return <span className={className}>{children}</span>;
}
