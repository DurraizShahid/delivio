import type { WSEvent } from "@delivio/types";

type Unsubscribe = () => void;
type EventHandler<T = WSEvent> = (event: T) => void;

export interface WSClient {
  connect(): void;
  disconnect(): void;
  subscribe<T extends WSEvent["type"]>(
    eventType: T,
    handler: EventHandler<Extract<WSEvent, { type: T }>>
  ): Unsubscribe;
  send(data: Record<string, unknown>): void;
  isConnected(): boolean;
}

export function createWSClient(wsUrl: string): WSClient {
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectAttempt = 0;
  let intentionalClose = false;

  const listeners = new Map<string, Set<EventHandler<any>>>();

  function connect() {
    if (ws?.readyState === WebSocket.OPEN) return;
    intentionalClose = false;

    try {
      ws = new WebSocket(wsUrl);
    } catch {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      reconnectAttempt = 0;
      startHeartbeat();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "pong") return;
        const handlers = listeners.get(data.type);
        if (handlers) {
          handlers.forEach((h) => h(data));
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      stopHeartbeat();
      if (!intentionalClose) scheduleReconnect();
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  function disconnect() {
    intentionalClose = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    stopHeartbeat();
    ws?.close();
    ws = null;
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    const delay = Math.min(1000 * 2 ** reconnectAttempt, 30000);
    reconnectAttempt++;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 25000);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function subscribe<T extends WSEvent["type"]>(
    eventType: T,
    handler: EventHandler<Extract<WSEvent, { type: T }>>
  ): Unsubscribe {
    if (!listeners.has(eventType)) {
      listeners.set(eventType, new Set());
    }
    listeners.get(eventType)!.add(handler);
    return () => {
      listeners.get(eventType)?.delete(handler);
    };
  }

  function send(data: Record<string, unknown>) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  function isConnected() {
    return ws?.readyState === WebSocket.OPEN;
  }

  return { connect, disconnect, subscribe, send, isConnected };
}
