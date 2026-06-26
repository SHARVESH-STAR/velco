import { WebSocketServer, WebSocket } from "ws";
import { type IncomingMessage, type Server } from "http";
import { parse } from "url";
import jwt from "jsonwebtoken";
import { config } from "./config.js";

interface DecodedToken {
  id: string;
  role: string;
}

class SocketManager {
  private wss: WebSocketServer | null = null;
  // Map delivery rider ID -> WebSocket connection
  private riderConnections = new Map<string, WebSocket>();
  // Set of connected admin WebSocket connections
  private adminConnections = new Set<WebSocket>();

  public initialize(server: Server): void {
    this.wss = new WebSocketServer({ server });
    console.log("WebSocket Server initialized.");

    this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
      try {
        const parsedUrl = parse(req.url || "", true);
        const token = parsedUrl.query.token as string;

        if (!token) {
          console.warn("WS Connection rejected: Missing token");
          ws.close(4001, "Unauthorized: Missing token");
          return;
        }

        const decoded = jwt.verify(token, config.JWT_SECRET) as DecodedToken;
        const { id, role } = decoded;

        if (role === "Admin") {
          this.adminConnections.add(ws);
          console.log(`WS Connection: Admin connected. Active admins: ${this.adminConnections.size}`);
        } else if (role === "delivery") {
          this.riderConnections.set(id, ws);
          console.log(`WS Connection: Rider [${id}] connected. Active riders: ${this.riderConnections.size}`);
        } else {
          console.warn(`WS Connection rejected: Role [${role}] not authorized`);
          ws.close(4003, "Forbidden: Invalid role");
          return;
        }

        // Keep-alive/ping-pong setup
        let isAlive = true;
        ws.on("pong", () => {
          isAlive = true;
        });

        const pingInterval = setInterval(() => {
          if (!isAlive) {
            ws.terminate();
            clearInterval(pingInterval);
            return;
          }
          isAlive = false;
          ws.ping();
        }, 30000);

        // Message handler
        ws.on("message", (message: string) => {
          try {
            const data = JSON.parse(message.toString());
            
            // Handle GPS location updates from riders
            if (data.type === "location_update") {
              const { orderId, lat, lng } = data;
              if (role === "delivery" && orderId && lat !== undefined && lng !== undefined) {
                // Relay rider location update to all connected admins
                this.broadcastToAdmins({
                  type: "rider_location",
                  orderId,
                  riderId: id,
                  lat,
                  lng
                });
              }
            }
          } catch (err) {
            console.error("Error parsing WS message:", err);
          }
        });

        // Connection close handler
        ws.on("close", () => {
          clearInterval(pingInterval);
          if (role === "Admin") {
            this.adminConnections.delete(ws);
            console.log(`WS Connection: Admin disconnected. Active admins: ${this.adminConnections.size}`);
          } else if (role === "delivery") {
            this.riderConnections.delete(id);
            console.log(`WS Connection: Rider [${id}] disconnected. Active riders: ${this.riderConnections.size}`);
          }
        });

      } catch (error) {
        console.error("WS Connection authentication failed:", error);
        ws.close(4002, "Unauthorized: Invalid token");
      }
    });
  }

  /**
   * Send a real-time message to a specific delivery rider
   */
  public sendToRider(riderId: string, data: any): boolean {
    const ws = this.riderConnections.get(riderId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  /**
   * Broadcast a message to all connected admin panels
   */
  public broadcastToAdmins(data: any): void {
    const messageStr = JSON.stringify(data);
    for (const adminWs of this.adminConnections) {
      if (adminWs.readyState === WebSocket.OPEN) {
        adminWs.send(messageStr);
      }
    }
  }
}

export const socketManager = new SocketManager();
