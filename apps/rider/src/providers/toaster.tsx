"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useEffect, useState } from "react";

export function Toaster() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <SonnerToaster position="top-right" richColors />;
}
