"use client";

import { useState, useEffect } from "react";

export function useSLATimer(deadline: string | null): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!deadline) {
      setRemaining(null);
      return;
    }

    function tick() {
      const diff = Math.floor(
        (new Date(deadline!).getTime() - Date.now()) / 1000
      );
      setRemaining(diff);
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return remaining;
}
