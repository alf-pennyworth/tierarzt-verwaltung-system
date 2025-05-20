import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface WebSocketClient extends WebSocket {
  roomId?: string;
  userId?: string;
}

type RoomClients = Map<string, WebSocketClient>;
const connectedClients: Map<string, RoomClients> = new Map();
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 35000; // 35 seconds

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  try {
    const { socket, response } = Deno.upgradeWebSocket(req);
    const wsClient = socket as WebSocketClient;
    
    let heartbeatInterval: number | undefined;
    let heartbeatTimeout: number | undefined;
    
    const setupHeartbeat = () => {
      // Clear any existing intervals/timeouts
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
      
      // Send heartbeat every 30 seconds
      heartbeatInterval = setInterval(() => {
        try {
          if (wsClient.readyState === WebSocket.OPEN) {
            console.log(`Sending heartbeat to user ${wsClient.userId || 'unknown'} in room ${wsClient.roomId || 'unknown'}`);
            wsClient.send(JSON.stringify({ type: 'heartbeat' }));
            
            // Set timeout for response - longer timeout to be more forgiving
            heartbeatTimeout = setTimeout(() => {
              console.log(`Heartbeat timeout for user ${wsClient.userId || 'unknown'} in room ${wsClient.roomId || 'unknown'}`);
              try {
                // Only close if still open
                if (wsClient.readyState === WebSocket.OPEN) {
                  wsClient.close(1001, "Heartbeat timeout");
                }
              } catch (error) {
                console.error("Error closing socket on heartbeat timeout:", error);
              }
            }, 15000); // Wait 15 seconds for a response (more forgiving)
          } else {
            // Socket not open, clear intervals
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
          }
        } catch (error) {
          console.error("Error sending heartbeat:", error);
          try {
            if (wsClient.readyState === WebSocket.OPEN) {
              wsClient.close(1001, "Heartbeat failed");
            }
          } catch (closeError) {
            console.error("Error closing socket after heartbeat failure:", closeError);
          }
        }
      }, 30000) as unknown as number;
    };
    
    wsClient.onopen = () => {
      console.log("WebSocket connection established");
      setupHeartbeat();
    };
    
    wsClient.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        // Log with better debugging
        console.log(`[${new Date().toISOString()}] Received message type: ${message.type} from user: ${wsClient.userId || 'unknown'} in room: ${wsClient.roomId || 'unknown'}`);
        
        switch(message.type) {
          case 'heartbeat-ack':
            // Reset heartbeat timeout
            if (heartbeatTimeout) {
              clearTimeout(heartbeatTimeout);
              heartbeatTimeout = undefined;
            }
            break;
            
          case 'join':
            wsClient.roomId = message.roomId;
            wsClient.userId = message.userId;
            
            if (!connectedClients.has(wsClient.roomId)) {
              connectedClients.set(wsClient.roomId, new Map());
            }
            
            // Clean up any existing connection for this user in this room
            const existingClient = connectedClients.get(wsClient.roomId)?.get(wsClient.userId);
            if (existingClient && existingClient !== wsClient) {
              try {
                console.log(`Closing existing connection for user ${wsClient.userId} in room ${wsClient.roomId}`);
                if (existingClient.readyState === WebSocket.OPEN) {
                  existingClient.close(1000, "New connection established");
                }
              } catch (error) {
                console.error(`Error closing existing connection for ${wsClient.userId}:`, error);
              }
            }
            
            connectedClients.get(wsClient.roomId)?.set(wsClient.userId, wsClient);
            console.log(`User ${wsClient.userId} joined room ${wsClient.roomId}`);
            
            // Inform everyone in the room about the new participant
            const roomClients = connectedClients.get(wsClient.roomId);
            roomClients?.forEach((clientSocket, clientId) => {
              if (clientId !== wsClient.userId) {
                try {
                  if (clientSocket.readyState === WebSocket.OPEN) {
                    clientSocket.send(JSON.stringify({
                      type: 'user-joined',
                      userId: wsClient.userId
                    }));
                    console.log(`Notified ${clientId} about ${wsClient.userId} joining`);
                  }
                } catch (error) {
                  console.error(`Error notifying ${clientId}:`, error);
                }
              }
            });
            break;
            
          // Pass other messages directly to target
          case 'offer':
          case 'answer':
          case 'ice-candidate':
            if (wsClient.roomId && message.target && connectedClients.has(wsClient.roomId)) {
              const targetClient = connectedClients.get(wsClient.roomId)?.get(message.target);
              if (targetClient && targetClient.readyState === WebSocket.OPEN) {
                // Add the sender ID if not present
                if (!message.sender) {
                  message.sender = wsClient.userId;
                }
                console.log(`Forwarding ${message.type} from ${wsClient.userId} to ${message.target}`);
                targetClient.send(JSON.stringify(message));
              } else {
                console.warn(`Target ${message.target} not found or not connected in room ${wsClient.roomId}`);
                // Inform sender that target is not available
                wsClient.send(JSON.stringify({
                  type: 'error',
                  error: `Target ${message.target} not found or not connected`
                }));
              }
            }
            break;
            
          case 'leave':
            if (wsClient.roomId && connectedClients.has(wsClient.roomId)) {
              connectedClients.get(wsClient.roomId)?.delete(wsClient.userId || "");
              
              if (connectedClients.get(wsClient.roomId)?.size === 0) {
                connectedClients.delete(wsClient.roomId);
              } else {
                // Inform others that user has left
                connectedClients.get(wsClient.roomId)?.forEach((clientSocket, clientId) => {
                  try {
                    clientSocket.send(JSON.stringify({
                      type: 'user-left',
                      userId: wsClient.userId
                    }));
                  } catch (error) {
                    console.error(`Error notifying ${clientId} about user leaving:`, error);
                  }
                });
              }
            }
            break;
            
          default:
            // Forward all other message types (offer, answer, ice-candidate) to the recipient
            if (message.target && wsClient.roomId && connectedClients.has(wsClient.roomId)) {
              const targetSocket = connectedClients.get(wsClient.roomId)?.get(message.target);
              if (targetSocket) {
                message.sender = wsClient.userId;
                try {
                  targetSocket.send(JSON.stringify(message));
                  console.log(`Forwarded ${message.type} from ${wsClient.userId} to ${message.target}`);
                } catch (error) {
                  console.error(`Error forwarding message to ${message.target}:`, error);
                  wsClient.send(JSON.stringify({
                    type: 'error',
                    error: 'Failed to forward message to recipient'
                  }));
                }
              } else {
                console.log(`Target ${message.target} not found in room ${wsClient.roomId}`);
                wsClient.send(JSON.stringify({
                  type: 'error',
                  error: 'Target user not found'
                }));
              }
            }
        }
      } catch (error) {
        console.error("Error processing message:", error);
        try {
          wsClient.send(JSON.stringify({
            type: 'error',
            error: 'Failed to process message'
          }));
        } catch (sendError) {
          console.error("Error sending error response:", sendError);
        }
      }
    };
    
    wsClient.onclose = () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
      
      if (wsClient.roomId && connectedClients.has(wsClient.roomId)) {
        connectedClients.get(wsClient.roomId)?.delete(wsClient.userId || "");
        
        if (connectedClients.get(wsClient.roomId)?.size === 0) {
          connectedClients.delete(wsClient.roomId);
        } else {
          // Inform others that user has left
          connectedClients.get(wsClient.roomId)?.forEach((clientSocket, clientId) => {
            try {
              clientSocket.send(JSON.stringify({
                type: 'user-left',
                userId: wsClient.userId
              }));
            } catch (error) {
              console.error(`Error notifying ${clientId} about user leaving:`, error);
            }
          });
        }
      }
      console.log(`WebSocket connection closed for user ${wsClient.userId} in room ${wsClient.roomId}`);
    };
    
    wsClient.onerror = (error) => {
      console.error(`WebSocket error for user ${wsClient.userId} in room ${wsClient.roomId}:`, error);
    };
    
    return response;
  } catch (error) {
    console.error("Error handling WebSocket connection:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
