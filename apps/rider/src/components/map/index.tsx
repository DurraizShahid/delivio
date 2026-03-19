"use client";

import dynamic from "next/dynamic";

export const GeofenceDrawerMap = dynamic(
  () => import("./geofence-drawer-map"),
  { ssr: false, loading: () => <div className="h-[500px] rounded-xl bg-muted animate-pulse" /> }
);
