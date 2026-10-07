"use client";

import { useEffect, useRef, useState } from "react";

type WebSocketMessage = {
  type: string;
  data: any;
  timestamp: number;
};

type WebSocketHookReturn = {
  isConnected: boolean;
  messages: WebSocketMessage[];
  sendMessage: (message: any) => void;
  lastMessage: WebSocketMessage | null;
  subscribeToTicket: (ticketId: string) => void;
  unsubscribeFromTicket: (ticketId: string) => void;
};

export function useWebSocket(url: string): WebSocketHookReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 3;

  useEffect(() => {
    // Skip WebSocket connection if not enabled
    if (process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET !== "true") {
      console.log("WebSocket is disabled via NEXT_PUBLIC_ENABLE_WEBSOCKET");
      return;
    }

    const connect = () => {
      const wsUrl = url || `${process.env.NEXT_PUBLIC_WS_URL || (process.env.NODE_ENV === "production" ? "wss://trifusiondynamics-api.onrender.com" : "ws://localhost:8000")}/ws`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("WebSocket connected");
          setIsConnected(true);
          reconnectAttemptsRef.current = 0; // Reset on successful connection

          // Send authentication token if available
          const token = sessionStorage.getItem("accessToken");
          if (token) {
            ws.send(JSON.stringify({ type: "auth", token }));
          }
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            setLastMessage(message);
            setMessages((prev) => [...prev, message]);
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        };

        ws.onerror = (error) => {
          console.warn("WebSocket connection failed (non-critical):", error);
          setIsConnected(false);
        };

        ws.onclose = () => {
          console.log("WebSocket disconnected");
          setIsConnected(false);

          // Attempt to reconnect with exponential backoff, but limit attempts
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current += 1;
            const delay = Math.min(5000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            console.log("Max WebSocket reconnection attempts reached. Giving up.");
          }
        };
      } catch (error) {
        console.warn("Failed to initialize WebSocket (non-critical):", error);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url]);

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected");
    }
  };

  const subscribeToTicket = (ticketId: string) => {
    sendMessage({ type: "subscribe", ticketId });
  };

  const unsubscribeFromTicket = (ticketId: string) => {
    sendMessage({ type: "unsubscribe", ticketId });
  };

  return {
    isConnected,
    messages,
    sendMessage,
    lastMessage,
    subscribeToTicket,
    unsubscribeFromTicket,
  };
}

// Real-time event types
export const WebSocketEvents = {
  TICKET_ASSIGNED: "ticket.assigned",
  TICKET_UPDATED: "ticket.updated",
  NEW_MESSAGE: "message.new",
  TASK_ASSIGNED: "task.assigned",
  PROJECT_UPDATED: "project.updated",
  INVOICE_CREATED: "invoice.created",
  LEAD_CREATED: "lead.created",
  USER_ONLINE: "user.online",
  USER_OFFLINE: "user.offline",
  NOTIFICATION: "notification",
} as const;
