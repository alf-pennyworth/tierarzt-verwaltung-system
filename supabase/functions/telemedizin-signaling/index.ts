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
          wsClient.send(JSON.stringify({ type: 'heartbeat' }));
          
          // Set timeout for response
          heartbeatTimeout = setTimeout(() => {
            console.log(`Heartbeat timeout for user ${wsClient.userId} in room ${wsClient.roomId}`);
            wsClient.close(1001, "Heartbeat timeout");
          }, HEARTBEAT_TIMEOUT - HEARTBEAT_INTERVAL);
        } catch (error) {
          console.error("Error sending heartbeat:", error);
          wsClient.close(1001, "Heartbeat failed");
        }
      }, HEARTBEAT_INTERVAL) as unknown as number;
    };
    
    wsClient.onopen = () => {
      console.log("WebSocket connection established");
      setupHeartbeat();
    };
    
    wsClient.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log(`Received message type: ${message.type} from user: ${wsClient.userId} in room: ${wsClient.roomId}`);
        
        switch(message.type) {
          case 'heartbeat-ack':
            // Reset heartbeat timeout
            if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
            break;
            
          case 'join':
            wsClient.roomId = message.roomId;
            wsClient.userId = message.userId;
            
            if (!connectedClients.has(wsClient.roomId)) {
              connectedClients.set(wsClient.roomId, new Map());
            }
            
            connectedClients.get(wsClient.roomId)?.set(wsClient.userId, wsClient);
            console.log(`User ${wsClient.userId} joined room ${wsClient.roomId}`);
            
            // Inform everyone in the room about the new participant
            const roomClients = connectedClients.get(wsClient.roomId);
            roomClients?.forEach((clientSocket, clientId) => {
              if (clientId !== wsClient.userId) {
                try {
                  clientSocket.send(JSON.stringify({
                    type: 'user-joined',
                    userId: wsClient.userId
                  }));
                  console.log(`Notified ${clientId} about ${wsClient.userId} joining`);
                } catch (error) {
                  console.error(`Error notifying ${clientId}:`, error);
                }
              }
            });
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
        console.error("Error handling WebSocket message:", error);
        wsClient.send(JSON.stringify({
          type: 'error',
          error: 'Failed to process message'
        }));
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
