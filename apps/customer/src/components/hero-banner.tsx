"use client";

import { Sparkles } from "lucide-react";

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden border-b border-border/40">
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/[0.12] via-background to-accent/[0.14]"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-[0.45] motion-reduce:opacity-20 [background-size:44px_44px] [mask-image:radial-gradient(ellipse_85%_55%_at_50%_18%,black,transparent)]"
        style={{
          backgroundImage: `linear-gradient(to right, color-mix(in oklab, var(--foreground) 7%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--foreground) 7%, transparent) 1px, transparent 1px)`,
        }}
        aria-hidden
      />
      <div
        className="absolute -left-24 top-1/2 size-[min(55vw,420px)] -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,oklch(0.72_0.2_352_/_0.32),transparent_68%)] blur-3xl motion-safe:animate-ambient-drift"
        aria-hidden
      />
      <div
        className="absolute -right-16 top-8 size-[min(48vw,380px)] rounded-full bg-[radial-gradient(circle_at_center,oklch(0.78_0.14_55_/_0.28),transparent_70%)] blur-3xl motion-safe:animate-ambient-drift-reverse"
        aria-hidden
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary shadow-sm shadow-primary/10 backdrop-blur-sm dark:bg-primary/15">
            <Sparkles className="size-3.5 shrink-0 opacity-90" aria-hidden />
            Fast delivery · Local favourites
          </p>

          <h1 className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl lg:leading-[1.08]">
            Delicious food,{" "}
            <span className="text-primary">delivered to you</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
            Discover standout restaurants near you. Crave-it-now energy, without
            the clutter — order in seconds and track every step.
          </p>
        </div>
      </div>
    </section>
  );
}
