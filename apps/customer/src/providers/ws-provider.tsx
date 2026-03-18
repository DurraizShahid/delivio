"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { createWSClient, type WSClient } from "@delivio/api";
import type { WSEvent } from "@delivio/types";
import { useQueryClient } from "@tanstack/react-query";

const WSContext = createContext<WSClient | null>(null);

const DEFAULT_API_URL =
  process.env.NODE_ENV === "production"
    ? "https://delivio-production.up.railway.app"
    : "http://localhost:8080";

const WS_URL = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).replace(
  /^http/,
  "ws"
) + "/ws";

export function WSProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const client = useMemo(() => createWSClient(WS_URL), []);

  useEffect(() => {
    client.connect();

    const unsubs = [
      client.subscribe("order:status_changed", () => {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      }),
      client.subscribe("order:rejected", () => {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      }),
      client.subscribe("order:delayed", () => {
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
  }, [client, queryClient]);

  return (
    <WSContext.Provider value={client}>
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
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  const stableHandler = useCallback(
    (event: Extract<WSEvent, { type: T }>) => handlerRef.current(event),
    []
  );

  useEffect(() => {
    if (!ws) return;
    return ws.subscribe(eventType, stableHandler);
  }, [ws, eventType, stableHandler]);
}
