
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const connectedClients = new Map();

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
    
    let roomId = "";
    let userId = "";
    
    socket.onopen = () => {
      console.log("WebSocket connection established");
    };
    
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch(message.type) {
          case 'join':
            roomId = message.roomId;
            userId = message.userId;
            
            if (!connectedClients.has(roomId)) {
              connectedClients.set(roomId, new Map());
            }
            
            connectedClients.get(roomId).set(userId, socket);
            
            // Inform everyone in the room about the new participant
            const roomClients = connectedClients.get(roomId);
            roomClients.forEach((clientSocket, clientId) => {
              if (clientId !== userId) {
                clientSocket.send(JSON.stringify({
                  type: 'user-joined',
                  userId: userId
                }));
              }
            });
            break;
            
          case 'leave':
            if (connectedClients.has(roomId)) {
              connectedClients.get(roomId).delete(userId);
              
              if (connectedClients.get(roomId).size === 0) {
                connectedClients.delete(roomId);
              } else {
                // Inform others that user has left
                connectedClients.get(roomId).forEach((clientSocket, clientId) => {
                  clientSocket.send(JSON.stringify({
                    type: 'user-left',
                    userId: userId
                  }));
                });
              }
            }
            break;
            
          default:
            // Forward all other message types (offer, answer, ice-candidate) to the recipient
            if (message.target && roomId && connectedClients.has(roomId)) {
              const targetSocket = connectedClients.get(roomId).get(message.target);
              if (targetSocket) {
                message.sender = userId;
                targetSocket.send(JSON.stringify(message));
              }
            }
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    };
    
    socket.onclose = () => {
      if (roomId && connectedClients.has(roomId)) {
        connectedClients.get(roomId).delete(userId);
        
        if (connectedClients.get(roomId).size === 0) {
          connectedClients.delete(roomId);
        } else {
          // Inform others that user has left
          connectedClients.get(roomId).forEach((clientSocket, clientId) => {
            clientSocket.send(JSON.stringify({
              type: 'user-left',
              userId: userId
            }));
          });
        }
      }
      console.log("WebSocket connection closed");
    };
    
    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
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
