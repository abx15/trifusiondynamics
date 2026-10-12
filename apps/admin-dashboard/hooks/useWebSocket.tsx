"use client";

/**
 * useWebSocket — AgencyOS real-time WebSocket hook
 *
 * Connects to the backend WebSocket server at /ws, authenticates with the
 * stored JWT, and provides:
 *   - Automatic reconnection with exponential back-off
 *   - Room subscription for ticket-specific events
 *   - Global notification handler
 *   - Typed event dispatch via React Query cache invalidation
 *
 * Usage:
 *   const { connected, subscribe, unsubscribe } = useWebSocket();
 *
 * Listen for events:
 *   useWebSocketEvent('ticket.updated', (payload) => { ... });
 *   useWebSocketEvent('notification', (payload) => { ... });
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useQueryClient } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WsEventType =
  | "ticket.created"
  | "ticket.updated"
  | "ticket.status_changed"
  | "ticket.assigned"
  | "ticket.message"
  | "notification"
  | "lead.created"
  | "lead.stage_changed"
  | "ping"
  | "pong";

export interface WsEvent<T = unknown> {
  type: WsEventType;
  payload: T;
  ticketId?: string;
  organizationId?: string;
  timestamp?: string;
}

export type WsEventHandler<T = unknown> = (event: WsEvent<T>) => void;

// ─── Context ──────────────────────────────────────────────────────────────────

interface WebSocketContextValue {
  connected: boolean;
  connecting: boolean;
  /** Subscribe to a specific ticket room for real-time updates */
  subscribe: (ticketId: string) => void;
  /** Unsubscribe from a ticket room */
  unsubscribe: (ticketId: string) => void;
  /** Send a raw message (low-level) */
  send: (message: object) => void;
  /** Register a typed event handler */
  on: <T = unknown>(type: WsEventType, handler: WsEventHandler<T>) => () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

// ─── Constants ────────────────────────────────────────────────────────────────

const WS_RECONNECT_BASE_MS = 1_000;
const WS_RECONNECT_MAX_MS = 30_000;
const WS_PING_INTERVAL_MS = 25_000;

function getWsUrl(): string {
  if (typeof window === "undefined") return "";
  const wsUrl =
    process.env.NEXT_PUBLIC_WS_URL ||
    `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}:8000/ws`;
  return wsUrl;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const handlersRef = useRef<Map<WsEventType, Set<WsEventHandler<any>>>>(new Map());

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // ── Dispatch event to all registered handlers ─────────────────────────────
  const dispatch = useCallback((event: WsEvent) => {
    // Type-based React Query cache invalidation
    switch (event.type) {
      case "ticket.created":
      case "ticket.updated":
      case "ticket.status_changed":
      case "ticket.assigned":
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
        if (event.ticketId) {
          queryClient.invalidateQueries({ queryKey: ["ticket", event.ticketId] });
        }
        break;
      case "ticket.message":
        if (event.ticketId) {
          queryClient.invalidateQueries({
            queryKey: ["ticket-messages", event.ticketId],
          });
        }
        break;
      case "lead.created":
      case "lead.stage_changed":
        queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
        queryClient.invalidateQueries({ queryKey: ["leads-inbox-count"] });
        break;
      default:
        break;
    }

    // Notify type-specific handlers
    const handlers = handlersRef.current.get(event.type);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(event);
        } catch (err) {
          console.error("[WS] Handler error for", event.type, err);
        }
      });
    }
  }, [queryClient]);

  // ── Connect ───────────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!isAuthenticated || !accessToken) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    const url = getWsUrl();
    if (!url) return;

    setConnecting(true);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      // Authenticate immediately after connecting
      ws.send(JSON.stringify({ type: "auth", token: accessToken }));
    };

    ws.onmessage = (event) => {
      try {
        const data: WsEvent = JSON.parse(event.data as string);
        if (data.type === "pong") {
          // Heartbeat response — connection alive
          return;
        }
        if (data.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
          return;
        }
        // If this is an auth_ok we know we're authenticated
        if ((data as any).type === "auth_ok") {
          setConnected(true);
          setConnecting(false);
          reconnectAttemptRef.current = 0;
          return;
        }
        dispatch(data);
      } catch {
        // Ignore malformed frames
      }
    };

    ws.onerror = () => {
      setConnected(false);
      setConnecting(false);
    };

    ws.onclose = (event) => {
      setConnected(false);
      setConnecting(false);
      wsRef.current = null;

      // Don't reconnect if intentionally closed (code 1000) or auth failed (4001)
      if (event.code === 1000 || event.code === 4001) return;

      // Exponential back-off reconnect
      const attempt = reconnectAttemptRef.current++;
      const delay = Math.min(
        WS_RECONNECT_BASE_MS * Math.pow(2, attempt),
        WS_RECONNECT_MAX_MS,
      );
      reconnectTimerRef.current = setTimeout(connect, delay);
    };
  }, [isAuthenticated, accessToken, dispatch]);

  // ── Ping loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!connected) return;
    pingTimerRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, WS_PING_INTERVAL_MS);

    return () => {
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
    };
  }, [connected]);

  // ── Connect on auth ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connect();
    } else {
      // Disconnect on logout
      wsRef.current?.close(1000);
      wsRef.current = null;
      setConnected(false);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    }

    return () => {
      wsRef.current?.close(1000);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [isAuthenticated, accessToken, connect]);

  // ── Public API ────────────────────────────────────────────────────────────
  const subscribe = useCallback((ticketId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "subscribe", ticketId }));
    }
  }, []);

  const unsubscribe = useCallback((ticketId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "unsubscribe", ticketId }));
    }
  }, []);

  const send = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const on = useCallback(
    <T = unknown>(type: WsEventType, handler: WsEventHandler<T>) => {
      if (!handlersRef.current.has(type)) {
        handlersRef.current.set(type, new Set());
      }
      handlersRef.current.get(type)!.add(handler as WsEventHandler<any>);
      return () => {
        handlersRef.current.get(type)?.delete(handler as WsEventHandler<any>);
      };
    },
    [],
  );

  const value: WebSocketContextValue = {
    connected,
    connecting,
    subscribe,
    unsubscribe,
    send,
    on,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useWebSocket(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    throw new Error("useWebSocket must be used inside <WebSocketProvider>");
  }
  return ctx;
}

/**
 * Subscribe to a typed WebSocket event.
 * Handler is stable-referenced and cleaned up on unmount.
 */
export function useWebSocketEvent<T = unknown>(
  type: WsEventType,
  handler: WsEventHandler<T>,
) {
  const { on } = useWebSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const stableHandler: WsEventHandler<T> = (e) => handlerRef.current(e);
    const unsubscribe = on<T>(type, stableHandler);
    return unsubscribe;
  }, [type, on]);
}

/**
 * Automatically subscribe to a ticket room and clean up on unmount.
 */
export function useTicketRoom(ticketId: string | undefined) {
  const { subscribe, unsubscribe, connected } = useWebSocket();

  useEffect(() => {
    if (!ticketId || !connected) return;
    subscribe(ticketId);
    return () => unsubscribe(ticketId);
  }, [ticketId, connected, subscribe, unsubscribe]);
}

/**
 * Returns a simple boolean for whether the WS is live.
 */
export function useIsRealtimeConnected(): boolean {
  const { connected } = useWebSocket();
  return connected;
}
