"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
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
  const [client, setClient] = useState<WSClient | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const wsClient = createWSClient(WS_URL);
    wsClient.connect();
    setClient(wsClient);

    const unsubs = [
      wsClient.subscribe("order:status_changed", () => {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      }),
      wsClient.subscribe("chat:message", () => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }),
    ];

    return () => {
      unsubs.forEach((u) => u());
      wsClient.disconnect();
      setClient(null);
    };
  }, [queryClient]);

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
