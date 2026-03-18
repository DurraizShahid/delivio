"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { createWSClient, type WSClient } from "@delivio/api";
import type { WSEvent } from "@delivio/types";
import { useQueryClient } from "@tanstack/react-query";

const WSContext = createContext<WSClient | null>(null);

const WS_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080")
    .replace(/^http/, "ws") + "/ws";

export function WSProvider({ children }: { children: React.ReactNode }) {
  const clientRef = useRef<WSClient | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const client = createWSClient(WS_URL);
    clientRef.current = client;
    client.connect();

    const unsubs = [
      client.subscribe("order:status_changed", () => {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      }),
      client.subscribe("chat:message", () => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }),
    ];

    return () => {
      unsubs.forEach((u) => u());
      client.disconnect();
    };
  }, [queryClient]);

  return (
    <WSContext.Provider value={clientRef.current}>
      {children}
    </WSContext.Provider>
  );
}

export function useWS() {
  return useContext(WSContext);
}

export function useWSEvent<T extends WSEvent["type"]>(
  eventType: T,
  handler: (event: Extract<WSEvent, { type: T }>) => void
) {
  const ws = useWS();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const stableHandler = useCallback(
    (event: Extract<WSEvent, { type: T }>) => handlerRef.current(event),
    []
  );

  useEffect(() => {
    if (!ws) return;
    return ws.subscribe(eventType, stableHandler);
  }, [ws, eventType, stableHandler]);
}
