/**
 * WebSocket Server for Real-Time Activity Notifications
 * 
 * Provides real-time updates for:
 * - Collection activity (template added/removed, collaborator changes)
 * - Digest notifications
 * - System announcements
 */

import { Server as HttpServer, IncomingMessage } from "http";
import { WebSocketServer, WebSocket, RawData } from "ws";
import { sdk } from "./sdk";
import * as db from "../db";

// Store connected clients by user ID
const clients = new Map<number, Set<WebSocket>>();

// Store WebSocket server instance
let wss: WebSocketServer | null = null;

/**
 * Initialize WebSocket server
 */
export function initializeWebSocket(server: HttpServer): WebSocketServer {
  wss = new WebSocketServer({ 
    server,
    path: "/ws",
  });

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    console.log("[WebSocket] New connection attempt");
    
    // Extract session token from query string or cookie
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    
    if (!token) {
      console.log("[WebSocket] No token provided, closing connection");
      ws.close(4001, "Authentication required");
      return;
    }

    try {
      // Verify the session token
      const session = await sdk.verifySession(token);
      
      if (!session) {
        console.log("[WebSocket] Invalid session, closing connection");
        ws.close(4002, "Invalid session");
        return;
      }
      
      // Get user from database
      const user = await db.getUserByOpenId(session.openId);
      
      if (!user) {
        console.log("[WebSocket] User not found, closing connection");
        ws.close(4003, "User not found");
        return;
      }

      const userId = user.id;
      console.log(`[WebSocket] User ${userId} connected`);

      // Add client to the map
      if (!clients.has(userId)) {
        clients.set(userId, new Set());
      }
      clients.get(userId)!.add(ws);

      // Send welcome message
      ws.send(JSON.stringify({
        type: "connected",
        message: "Connected to AccessAI real-time notifications",
        userId,
      }));

      // Handle incoming messages
      ws.on("message", (data: RawData) => {
        try {
          const message = JSON.parse(data.toString());
          handleClientMessage(userId, ws, message);
        } catch (error) {
          console.error("[WebSocket] Error parsing message:", error);
        }
      });

      // Handle disconnection
      ws.on("close", () => {
        console.log(`[WebSocket] User ${userId} disconnected`);
        const userClients = clients.get(userId);
        if (userClients) {
          userClients.delete(ws);
          if (userClients.size === 0) {
            clients.delete(userId);
          }
        }
      });

      // Handle errors
      ws.on("error", (error: Error) => {
        console.error(`[WebSocket] Error for user ${userId}:`, error);
      });

    } catch (error) {
      console.error("[WebSocket] Authentication error:", error);
      ws.close(4003, "Authentication failed");
    }
  });

  console.log("[WebSocket] Server initialized on /ws");
  return wss;
}

/**
 * Handle messages from clients
 */
function handleClientMessage(userId: number, ws: WebSocket, message: any) {
  switch (message.type) {
    case "ping":
      ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
      break;
    
    case "subscribe":
      // Client wants to subscribe to specific channels
      console.log(`[WebSocket] User ${userId} subscribed to:`, message.channels);
      break;
    
    default:
      console.log(`[WebSocket] Unknown message type from user ${userId}:`, message.type);
  }
}

/**
 * Send a message to a specific user
 */
export function sendToUser(userId: number, message: any): boolean {
  const userClients = clients.get(userId);
  if (!userClients || userClients.size === 0) {
    return false;
  }

  const payload = JSON.stringify(message);
  let sent = false;

  userClients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
      sent = true;
    }
  });

  return sent;
}

/**
 * Send a message to multiple users
 */
export function sendToUsers(userIds: number[], message: any): number {
  let sentCount = 0;
  
  for (const userId of userIds) {
    if (sendToUser(userId, message)) {
      sentCount++;
    }
  }

  return sentCount;
}

/**
 * Broadcast a message to all connected users
 */
export function broadcast(message: any): number {
  const payload = JSON.stringify(message);
  let sentCount = 0;

  clients.forEach((userClients) => {
    userClients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
        sentCount++;
      }
    });
  });

  return sentCount;
}

/**
 * Notify users about a new activity in a collection
 */
export async function notifyCollectionActivity(
  collectionId: number,
  activity: {
    type: string;
    userId: number;
    userName: string | null;
    actionType: string;
    actionDetails?: any;
    message?: string;
  }
): Promise<number> {
  // Import here to avoid circular dependency
  const { getCollectionCollaborators, getCollectionWithTemplates } = await import("../db");
  
  // Get collection info
  const collection = await getCollectionWithTemplates(collectionId);
  if (!collection) return 0;

  // Get all collaborators and the owner
  const collaborators = await getCollectionCollaborators(collectionId);
  const userIds = new Set<number>();
  
  // Add owner
  if (collection.collection.userId) {
    userIds.add(collection.collection.userId);
  }
  
  // Add collaborators
  for (const collab of collaborators) {
    if (collab.status === 'accepted') {
      userIds.add(collab.userId);
    }
  }
  
  // Remove the user who performed the action
  userIds.delete(activity.userId);

  // Send notification to all relevant users
  const message = {
    type: "activity",
    collectionId,
    collectionName: collection.collection.name,
    collectionColor: collection.collection.color,
    activityType: activity.actionType,
    userId: activity.userId,
    userName: activity.userName,
    actionDetails: activity.actionDetails,
    activityMessage: activity.message,
    timestamp: Date.now(),
  };

  return sendToUsers(Array.from(userIds), message);
}

/**
 * Get the number of connected clients
 */
export function getConnectedClientsCount(): number {
  let count = 0;
  clients.forEach((userClients) => {
    count += userClients.size;
  });
  return count;
}

/**
 * Get the number of connected users
 */
export function getConnectedUsersCount(): number {
  return clients.size;
}

/**
 * Check if a user is connected
 */
export function isUserConnected(userId: number): boolean {
  const userClients = clients.get(userId);
  return userClients !== undefined && userClients.size > 0;
}
