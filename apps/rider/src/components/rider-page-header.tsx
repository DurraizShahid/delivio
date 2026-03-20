import { cn } from "@delivio/ui";

type RiderPageHeaderProps = {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  /** Stronger gradient & glow — use for standout screens (e.g. earnings). */
  variant?: "default" | "hero";
  className?: string;
  children?: React.ReactNode;
};

export function RiderPageHeader({
  title,
  description,
  badge,
  action,
  variant = "default",
  className,
  children,
}: RiderPageHeaderProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm",
        variant === "hero" &&
          "border-primary/20 bg-gradient-to-br from-card via-card to-primary/[0.06]",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-primary/[0.07] blur-3xl",
          variant === "hero" && "size-44 bg-primary/[0.12]"
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute -bottom-8 -left-6 size-28 rounded-full bg-primary/[0.05] blur-2xl",
          variant === "hero" && "size-32 bg-primary/[0.08]"
        )}
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {badge}
          </div>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0 sm:pt-0.5">{action}</div> : null}
      </div>
      {children ? <div className="relative mt-4">{children}</div> : null}
    </section>
  );
}
