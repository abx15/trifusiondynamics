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
};

export function useWebSocket(url: string): WebSocketHookReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const connect = () => {
      const wsUrl = url || `${process.env.NEXT_PUBLIC_WS_URL || (process.env.NODE_ENV === "production" ? "wss://trifusiondynamics-api.onrender.com" : "ws://localhost:8000")}/ws`;
      
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("WebSocket connected");
          setIsConnected(true);
          
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
          console.error("WebSocket error:", error);
        };

        ws.onclose = () => {
          console.log("WebSocket disconnected");
          setIsConnected(false);
          
          // Attempt to reconnect after 5 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        };
      } catch (error) {
        console.error("Failed to connect to WebSocket:", error);
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

  return {
    isConnected,
    messages,
    sendMessage,
    lastMessage,
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
