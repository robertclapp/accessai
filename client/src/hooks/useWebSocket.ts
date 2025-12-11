/**
 * WebSocket Client Hook for Real-Time Activity Notifications
 * 
 * Provides real-time updates for collection activities, digest notifications,
 * and system announcements.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";

export interface ActivityNotification {
  type: "activity";
  collectionId: number;
  collectionName: string;
  collectionColor: string | null;
  activityType: string;
  userId: number;
  userName: string | null;
  actionDetails?: {
    templateId?: number;
    templateName?: string;
    collaboratorId?: number;
    collaboratorName?: string;
    collaboratorEmail?: string;
    fieldChanged?: string;
    oldValue?: string;
    newValue?: string;
  };
  activityMessage?: string;
  timestamp: number;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface UseWebSocketOptions {
  onActivity?: (notification: ActivityNotification) => void;
  onMessage?: (message: WebSocketMessage) => void;
  showToasts?: boolean;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onActivity,
    onMessage,
    showToasts = true,
    autoReconnect = true,
    reconnectInterval = 5000,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastActivity, setLastActivity] = useState<ActivityNotification | null>(null);

  // Get the session token from cookies
  const getSessionToken = useCallback(() => {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split("=");
      if (name === "session") {
        return value;
      }
    }
    return null;
  }, []);

  // Format activity message for toast
  const formatActivityMessage = useCallback((activity: ActivityNotification): string => {
    const userName = activity.userName || "Someone";
    const details = activity.actionDetails || {};

    switch (activity.activityType) {
      case "template_added":
        return `${userName} added "${details.templateName || "a template"}" to ${activity.collectionName}`;
      case "template_removed":
        return `${userName} removed "${details.templateName || "a template"}" from ${activity.collectionName}`;
      case "collaborator_invited":
        return `${userName} invited ${details.collaboratorName || details.collaboratorEmail || "someone"} to ${activity.collectionName}`;
      case "collaborator_joined":
        return `${userName} joined ${activity.collectionName}`;
      case "collaborator_left":
        return `${userName} left ${activity.collectionName}`;
      case "collaborator_removed":
        return `${userName} removed ${details.collaboratorName || "a collaborator"} from ${activity.collectionName}`;
      case "collection_updated":
        return `${userName} updated ${activity.collectionName}`;
      case "collection_shared":
        return `${userName} made ${activity.collectionName} public`;
      case "collection_unshared":
        return `${userName} made ${activity.collectionName} private`;
      default:
        return `Activity in ${activity.collectionName}`;
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    const token = getSessionToken();
    if (!token) {
      console.log("[WebSocket] No session token, skipping connection");
      return;
    }

    // Determine WebSocket URL
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WebSocket] Connected");
        setIsConnected(true);
        
        // Clear any pending reconnect
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Handle activity notifications
          if (message.type === "activity") {
            const activity = message as ActivityNotification;
            setLastActivity(activity);
            
            // Show toast notification
            if (showToasts) {
              toast.info(formatActivityMessage(activity), {
                description: new Date(activity.timestamp).toLocaleTimeString(),
                action: {
                  label: "View",
                  onClick: () => {
                    window.location.href = "/followed-collections";
                  },
                },
              });
            }
            
            // Call custom handler
            onActivity?.(activity);
          }
          
          // Call general message handler
          onMessage?.(message);
        } catch (error) {
          console.error("[WebSocket] Error parsing message:", error);
        }
      };

      ws.onclose = (event) => {
        console.log(`[WebSocket] Disconnected: ${event.code} ${event.reason}`);
        setIsConnected(false);
        wsRef.current = null;

        // Auto-reconnect if enabled and not a deliberate close
        if (autoReconnect && event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("[WebSocket] Attempting to reconnect...");
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error("[WebSocket] Error:", error);
      };
    } catch (error) {
      console.error("[WebSocket] Connection error:", error);
    }
  }, [getSessionToken, showToasts, formatActivityMessage, onActivity, onMessage, autoReconnect, reconnectInterval]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnected");
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  // Send a message through WebSocket
  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // Send ping to keep connection alive
  const ping = useCallback(() => {
    return send({ type: "ping" });
  }, [send]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    
    // Set up ping interval to keep connection alive
    const pingInterval = setInterval(() => {
      if (isConnected) {
        ping();
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      disconnect();
    };
  }, [connect, disconnect, isConnected, ping]);

  return {
    isConnected,
    lastActivity,
    connect,
    disconnect,
    send,
    ping,
  };
}

export default useWebSocket;
