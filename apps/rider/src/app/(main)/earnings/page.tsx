"use client";

import { useMemo } from "react";
import {
  Bike,
  CalendarRange,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardContent,
  Skeleton,
  Badge,
} from "@delivio/ui";
import { RiderPageHeader } from "@/components/rider-page-header";
import { useDeliveryHistory } from "@/hooks/use-deliveries";
import { useRiderTips } from "@/hooks/use-rider-earnings";
import type { Delivery } from "@delivio/types";

function formatGbp(cents: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(cents / 100);
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function weekKey(d: Date) {
  const s = startOfWeek(d);
  return s.toISOString().slice(0, 10);
}

function weeklyBuckets(deliveries: Delivery[] | undefined, weeks: number) {
  const thisMonday = startOfWeek(new Date());
  const keys: string[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const t = new Date(thisMonday);
    t.setDate(t.getDate() - i * 7);
    keys.push(t.toISOString().slice(0, 10));
  }
  const counts = new Map<string, number>();
  keys.forEach((k) => counts.set(k, 0));
  for (const d of deliveries ?? []) {
    const k = weekKey(new Date(d.createdAt));
    if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return keys.map((k) => ({ key: k, count: counts.get(k) ?? 0 }));
}

export default function EarningsPage() {
  const { data: tips, isLoading: tipsLoading } = useRiderTips();
  const { data: history, isLoading: historyLoading } = useDeliveryHistory();

  const totalCents = tips?.totalCents ?? 0;
  const completed = history?.length ?? 0;
  const avgTipPerDrop =
    completed > 0 && totalCents > 0 ? totalCents / completed : 0;

  const last4Weeks = useMemo(
    () => weeklyBuckets(history, 4),
    [history]
  );
  const maxWeek = Math.max(1, ...last4Weeks.map((w) => w.count));

  const thisWeekCompleted = useMemo(() => {
    const start = startOfWeek(new Date());
    return (
      history?.filter((d) => new Date(d.createdAt) >= start).length ?? 0
    );
  }, [history]);

  const loading = tipsLoading || historyLoading;

  return (
    <div className="space-y-5">
      <RiderPageHeader
        variant="hero"
        title="Earnings"
        description="Customer tips and your delivery streak — updated as you complete orders."
        badge={
          <Badge className="rounded-md border border-primary/20 bg-primary/10 text-primary hover:bg-primary/10">
            <Sparkles className="mr-1 size-3" />
            Live
          </Badge>
        }
      >
        {loading ? (
          <Skeleton className="h-28 w-full rounded-xl" />
        ) : (
          <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/15 via-primary/[0.08] to-transparent p-5 shadow-inner">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
            <div className="relative flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-primary/90">
                  Total tips
                </p>
                <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-foreground sm:text-5xl">
                  {formatGbp(totalCents)}
                </p>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Customer tips are added after orders complete. Keep your rating
                  high for more generous drops.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-4 py-3 shadow-sm backdrop-blur-sm sm:mt-0">
                <Wallet className="size-8 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">All time</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {completed} completed
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </RiderPageHeader>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[104px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4 sm:p-5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400">
                <Bike className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-semibold tabular-nums tracking-tight">
                  {completed}
                </p>
                <p className="text-xs text-muted-foreground">Completed drops</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4 sm:p-5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/80 dark:text-cyan-400">
                <TrendingUp className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-semibold tabular-nums tracking-tight">
                  {avgTipPerDrop > 0 ? formatGbp(Math.round(avgTipPerDrop)) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Avg tip / drop</p>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 border-border/60 shadow-sm sm:col-span-1">
            <CardContent className="flex items-center gap-3 p-4 sm:p-5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/80 dark:text-violet-400">
                <CalendarRange className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-semibold tabular-nums tracking-tight">
                  {thisWeekCompleted}
                </p>
                <p className="text-xs text-muted-foreground">This week</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-border/60 shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <CalendarRange className="size-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">
              Last 4 weeks
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Completed deliveries per week — a quick pulse on your consistency.
          </p>
          {loading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : (
            <div className="flex h-28 items-end justify-between gap-2 pt-2">
              {last4Weeks.map((w, i) => {
                const hPct = Math.round((w.count / maxWeek) * 100);
                return (
                  <div
                    key={w.key}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <div className="flex h-24 w-full flex-col justify-end">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-primary/80 to-primary/40 transition-all"
                        style={{ height: `${Math.max(hPct, 4)}%` }}
                        title={`${w.count} deliveries`}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      W{4 - i}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
