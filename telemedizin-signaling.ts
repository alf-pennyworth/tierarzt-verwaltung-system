/// <reference lib="deno.ns" />
/// <reference lib="deno.unstable" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface WebSocketMessage {
  type: string;
  roomId?: string;
  userId?: string;
  target?: string;
  sender?: string;
  [key: string]: any;
}

// Store connected clients and their heartbeat timeouts
const connectedClients = new Map<string, Map<string, WebSocket>>();
const heartbeatTimeouts = new Map<string, number>();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 35000; // 35 seconds

function setupHeartbeat(socket: WebSocket, roomId: string, userId: string) {
  const timeoutKey = `${roomId}:${userId}`;
  
  // Clear any existing timeout
  if (heartbeatTimeouts.has(timeoutKey)) {
    clearTimeout(heartbeatTimeouts.get(timeoutKey));
  }

  // Set new timeout
  const timeout = setTimeout(() => {
    console.log(`Heartbeat timeout for user ${userId} in room ${roomId}`);
    socket.close(1000, "Heartbeat timeout");
  }, HEARTBEAT_TIMEOUT);

  heartbeatTimeouts.set(timeoutKey, timeout);
}

function cleanupClient(roomId: string, userId: string) {
  const timeoutKey = `${roomId}:${userId}`;
  
  // Clear heartbeat timeout
  if (heartbeatTimeouts.has(timeoutKey)) {
    clearTimeout(heartbeatTimeouts.get(timeoutKey));
    heartbeatTimeouts.delete(timeoutKey);
  }

  // Remove from connected clients
  if (connectedClients.has(roomId)) {
    connectedClients.get(roomId)?.delete(userId);
    if (connectedClients.get(roomId)?.size === 0) {
      connectedClients.delete(roomId);
    } else {
      // Inform others that user has left
      connectedClients.get(roomId)?.forEach((clientSocket: WebSocket, clientId: string) => {
        try {
          clientSocket.send(JSON.stringify({
            type: 'user-left',
            userId: userId
          }));
        } catch (error) {
          console.error(`Error sending user-left message to ${clientId}:`, error);
        }
      });
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";
  
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", {
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    const { socket, response } = Deno.upgradeWebSocket(req);
    let roomId = "";
    let userId = "";

    socket.onopen = () => {
      console.log("WebSocket connection established");
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        
        // Handle heartbeat messages
        if (message.type === 'heartbeat') {
          setupHeartbeat(socket, roomId, userId);
          socket.send(JSON.stringify({ type: 'heartbeat-ack' }));
          return;
        }

        switch (message.type) {
          case 'join':
            if (!message.roomId || !message.userId) {
              console.error("Missing roomId or userId in join message");
              return;
            }
            
            roomId = message.roomId;
            // Ensure consistent user IDs
            userId = ['owner', 'vet'].includes(message.userId) ? message.userId : 'unknown';
            
            if (!connectedClients.has(roomId)) {
              connectedClients.set(roomId, new Map());
            }
            
            const roomMap = connectedClients.get(roomId);
            if (roomMap) {
              roomMap.set(userId, socket);
              setupHeartbeat(socket, roomId, userId);

              // Inform everyone in the room about the new participant
              roomMap.forEach((clientSocket: WebSocket, clientId: string) => {
                if (clientId !== userId) {
                  try {
                    clientSocket.send(JSON.stringify({
                      type: 'user-joined',
                      userId: userId
                    }));
                  } catch (error) {
                    console.error(`Error sending user-joined message to ${clientId}:`, error);
                  }
                }
              });
            }
            break;

          case 'leave':
            cleanupClient(roomId, userId);
            break;

          default:
            // Forward all other message types (offer, answer, ice-candidate) to the recipient
            if (message.target && roomId && connectedClients.has(roomId)) {
              const targetSocket = connectedClients.get(roomId)?.get(message.target);
              if (targetSocket) {
                message.sender = userId;
                try {
                  targetSocket.send(JSON.stringify(message));
                } catch (error) {
                  console.error(`Error forwarding message to ${message.target}:`, error);
                }
              }
            }
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    };

    socket.onclose = (event) => {
      console.log(`WebSocket connection closed with code ${event.code}`);
      cleanupClient(roomId, userId);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return response;
  } catch (error) {
    console.error("Error handling WebSocket connection:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}); 