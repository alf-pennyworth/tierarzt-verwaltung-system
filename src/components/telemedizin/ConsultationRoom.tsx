import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { 
  ArrowLeft, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  MessageSquare, 
  Users,
  Settings,
  Paperclip,
  Send,
  X,
  PhoneOff
} from "lucide-react";
import { format } from "date-fns";
import { VideoConsultation, Message } from "@/types/telemedizin";

const ConsultationRoom = () => {
  const { id } = useParams<{ id: string }>();
  const { user, userInfo } = useAuth();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState<VideoConsultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState<string>("video");
  
  // Video chat state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch consultation details
  useEffect(() => {
    const fetchConsultation = async () => {
      try {
        if (!id) return;

        const { data, error } = await supabase
          .from('video_consultations')
          .select(`
            id,
            title,
            description,
            scheduled_start,
            scheduled_end,
            status,
            room_id,
            patient:patient_id (
              id,
              name,
              spezies
            ),
            doctor:doctor_id (
              id,
              vorname,
              nachname
            )
          `)
          .eq("id", id)
          .single();

        if (error) {
          console.error("Error fetching consultation:", error);
          toast({
            title: "Fehler",
            description: "Die Konsultation konnte nicht geladen werden.",
            variant: "destructive",
          });
          navigate("/telemedizin");
          return;
        }

        setConsultation(data as unknown as VideoConsultation);

        // Fetch messages for this consultation
        fetchMessages(data.id);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConsultation();
  }, [id, navigate]);

  // Fetch messages
  const fetchMessages = async (consultationId: string) => {
    const { data, error } = await supabase
      .from('telemedizin_messages')
      .select("*")
      .eq("consultation_id", consultationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    setMessages(data as unknown as Message[]);
    
    if (data && data.length > 0) {
      const unreadMessages = data
        .filter(msg => {
          const typedMsg = msg as unknown as Message;
          return typedMsg.recipient_id === user?.id && !typedMsg.is_read;
        })
        .map(msg => (msg as unknown as Message).id);
        
      if (unreadMessages.length > 0) {
        await supabase
          .from('telemedizin_messages')
          .update({ is_read: true })
          .in("id", unreadMessages);
      }
    }
  };

  // Set up WebRTC
  useEffect(() => {
    if (!consultation || !user) return;

    // Initialize WebRTC
    const setupWebRTC = async () => {
      try {
        // Get user media
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        setLocalStream(stream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        // Set up WebSocket connection to signaling server
        const wsUrl = `wss://hwdzrrhjjrnruyfyydmu.supabase.co/functions/v1/telemedizin-signaling`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        ws.onopen = () => {
          console.log("WebSocket connection established");
          
          // Join the room
          ws.send(JSON.stringify({
            type: "join",
            roomId: consultation.room_id,
            userId: user.id
          }));
        };
        
        ws.onmessage = async (event) => {
          const message = JSON.parse(event.data);
          
          switch(message.type) {
            case "user-joined":
              console.log(`User ${message.userId} joined the room`);
              // Create and send an offer when a new user joins
              await createPeerConnection();
              await createAndSendOffer(message.userId);
              break;
              
            case "offer":
              console.log("Received offer");
              await handleOffer(message);
              break;
              
            case "answer":
              console.log("Received answer");
              await handleAnswer(message);
              break;
              
            case "ice-candidate":
              console.log("Received ICE candidate");
              await handleIceCandidate(message);
              break;
              
            case "user-left":
              console.log(`User ${message.userId} left the room`);
              handleUserLeft();
              break;
          }
        };
        
        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          toast({
            title: "Verbindungsfehler",
            description: "Es konnte keine Verbindung zum Signalisierungsserver hergestellt werden.",
            variant: "destructive",
          });
        };
        
        ws.onclose = () => {
          console.log("WebSocket connection closed");
        };

        return () => {
          // Clean up
          stream.getTracks().forEach(track => track.stop());
          if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
          }
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: "leave",
              roomId: consultation.room_id,
              userId: user.id
            }));
            ws.close();
          }
        };
      } catch (error) {
        console.error("Error setting up WebRTC:", error);
        toast({
          title: "Medienzugriffsfehler",
          description: "Zugriff auf Kamera und Mikrofon nicht möglich. Bitte Berechtigungen überprüfen.",
          variant: "destructive",
        });
      }
    };

    setupWebRTC();

    return () => {
      // Clean up
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "leave",
          roomId: consultation.room_id,
          userId: user.id
        }));
        wsRef.current.close();
      }
    };
  }, [consultation, user]);

  // Create a new RTCPeerConnection
  const createPeerConnection = async () => {
    try {
      setIsConnecting(true);
      
      const configuration = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }
        ]
      };
      
      const pc = new RTCPeerConnection(configuration);
      peerConnectionRef.current = pc;
      
      // Add local stream tracks to peer connection
      if (localStream) {
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
      }
      
      // Set up event handlers
      pc.onicecandidate = handleICECandidateEvent;
      pc.ontrack = handleTrackEvent;
      pc.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
      pc.onsignalingstatechange = handleSignalingStateChangeEvent;
      
      return pc;
    } catch (error) {
      console.error("Error creating peer connection:", error);
      setIsConnecting(false);
      throw error;
    }
  };
  
  // Create and send an offer
  const createAndSendOffer = async (targetUserId: string) => {
    try {
      if (!peerConnectionRef.current) {
        throw new Error("No peer connection");
      }
      
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      
      wsRef.current?.send(JSON.stringify({
        type: "offer",
        target: targetUserId,
        sdp: peerConnectionRef.current.localDescription
      }));
    } catch (error) {
      console.error("Error creating offer:", error);
      setIsConnecting(false);
    }
  };
  
  // Handle an incoming offer
  const handleOffer = async (message: any) => {
    try {
      if (!peerConnectionRef.current) {
        await createPeerConnection();
      }
      
      const pc = peerConnectionRef.current;
      if (!pc) {
        throw new Error("No peer connection");
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      wsRef.current?.send(JSON.stringify({
        type: "answer",
        target: message.sender,
        sdp: pc.localDescription
      }));
    } catch (error) {
      console.error("Error handling offer:", error);
      setIsConnecting(false);
    }
  };
  
  // Handle an incoming answer
  const handleAnswer = async (message: any) => {
    try {
      const pc = peerConnectionRef.current;
      if (!pc) {
        throw new Error("No peer connection");
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
    } catch (error) {
      console.error("Error handling answer:", error);
      setIsConnecting(false);
    }
  };
  
  // Handle an incoming ICE candidate
  const handleIceCandidate = async (message: any) => {
    try {
      const pc = peerConnectionRef.current;
      if (!pc) {
        throw new Error("No peer connection");
      }
      
      await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
    } catch (error) {
      console.error("Error handling ICE candidate:", error);
    }
  };
  
  // Handle when a user leaves
  const handleUserLeft = () => {
    setRemoteStream(null);
    setIsConnected(false);
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    toast({
      title: "Verbindung getrennt",
      description: "Der andere Teilnehmer hat die Konsultation verlassen.",
    });
  };
  
  // Event handlers for RTCPeerConnection
  const handleICECandidateEvent = (event: RTCPeerConnectionIceEvent) => {
    if (event.candidate && wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: "ice-candidate",
        target: getOtherParticipantId(),
        candidate: event.candidate
      }));
    }
  };
  
  const handleTrackEvent = (event: RTCTrackEvent) => {
    setRemoteStream(event.streams[0]);
    setIsConnected(true);
    setIsConnecting(false);
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = event.streams[0];
    }
  };
  
  const handleICEConnectionStateChangeEvent = () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    
    switch(pc.iceConnectionState) {
      case "connected":
        setIsConnected(true);
        setIsConnecting(false);
        break;
      case "disconnected":
      case "failed":
      case "closed":
        setIsConnected(false);
        setIsConnecting(false);
        break;
    }
  };
  
  const handleSignalingStateChangeEvent = () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    
    switch(pc.signalingState) {
      case "stable":
        break;
      case "closed":
        setIsConnected(false);
        setIsConnecting(false);
        break;
    }
  };

  // Get the ID of the other participant in the consultation
  const getOtherParticipantId = () => {
    if (!consultation || !user) return null;
    
    return user.id === consultation.doctor.id ? consultation.patient.id : consultation.doctor.id;
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };
  
  // Toggle audio
  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };
  
  // End call
  const endCall = async () => {
    try {
      if (consultation) {
        await supabase
          .from('video_consultations')
          .update({ 
            status: "completed",
            actual_end: new Date().toISOString()
          })
          .eq("id", consultation.id);
      }
      
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "leave",
          roomId: consultation?.room_id,
          userId: user?.id
        }));
        wsRef.current.close();
      }
      
      navigate("/telemedizin");
    } catch (error) {
      console.error("Error ending call:", error);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !consultation || !user) return;

    try {
      const recipientId = getOtherParticipantId();
      if (!recipientId) return;

      const { data, error } = await supabase
        .from('telemedizin_messages')
        .insert({
          consultation_id: consultation.id,
          sender_id: user.id,
          recipient_id: recipientId,
          content: newMessage.trim()
        })
        .select()
        .single();

      if (error) {
        console.error("Error sending message:", error);
        toast({
          title: "Fehler",
          description: "Die Nachricht konnte nicht gesendet werden.",
          variant: "destructive",
        });
        return;
      }

      setMessages([...messages, data as unknown as Message]);
      setNewMessage("");
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current && activeTab === "chat") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  // Listen for new messages
  useEffect(() => {
    if (!consultation) return;

    const channel = supabase
      .channel('telemedizin_messages_changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'telemedizin_messages',
          filter: `consultation_id=eq.${consultation.id}` 
        }, 
        (payload) => {
          if (payload.new.sender_id !== user?.id) {
            setMessages(prev => [...prev, payload.new as unknown as Message]);
            
            supabase
              .from('telemedizin_messages')
              .update({ is_read: true })
              .eq("id", payload.new.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultation, user]);

  if (loading) {
    return (
      <div className="container flex items-center justify-center h-screen">
        <p>Laden...</p>
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="container p-4">
        <div className="text-center">
          <p className="text-muted-foreground">Konsultation nicht gefunden.</p>
          <Button 
            variant="outline" 
            onClick={() => navigate("/telemedizin")}
            className="mt-4"
          >
            Zurück zur Übersicht
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container p-0 md:p-4">
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={() => navigate("/telemedizin")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="font-medium">{consultation.title}</h1>
              <p className="text-sm text-muted-foreground">
                {format(new Date(consultation.scheduled_start), "dd.MM.yyyy HH:mm")} - 
                {format(new Date(consultation.scheduled_end), "HH:mm")}
              </p>
            </div>
          </div>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={endCall}
          >
            <PhoneOff className="h-4 w-4 mr-2" />
            Beenden
          </Button>
        </div>
        
        <div className="flex-1 flex flex-col md:flex-row">
          <div className="md:hidden border-b">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="video">
                  <Video className="h-4 w-4 mr-2" />
                  Video
                </TabsTrigger>
                <TabsTrigger value="chat">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div 
            className={`flex-1 ${activeTab === "video" || window.innerWidth >= 768 ? "block" : "hidden"} md:block p-4`}
          >
            <div className="relative h-full rounded-lg overflow-hidden bg-black flex items-center justify-center">
              <video 
                ref={remoteVideoRef}
                autoPlay 
                playsInline 
                className={`w-full h-full object-cover ${isConnected ? "block" : "hidden"}`}
              />
              
              {!isConnected && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  {isConnecting ? (
                    <>
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                      <p className="font-medium">Verbindung wird hergestellt...</p>
                      <p className="text-sm opacity-75">Bitte warten Sie einen Moment</p>
                    </>
                  ) : (
                    <>
                      <Video className="h-12 w-12 mb-4" />
                      <p className="font-medium">Warten auf andere Teilnehmer</p>
                      <p className="text-sm opacity-75">Sie sind bereit, wenn jemand beitritt</p>
                    </>
                  )}
                </div>
              )}
              
              <div className="absolute bottom-4 right-4 w-1/4 max-w-[180px] h-auto rounded-lg overflow-hidden border-2 border-white shadow-lg">
                <video 
                  ref={localVideoRef}
                  autoPlay 
                  playsInline 
                  muted 
                  className={`w-full h-full object-cover ${!isVideoEnabled ? "hidden" : ""}`}
                />
                {!isVideoEnabled && (
                  <div className="bg-slate-800 w-full h-full flex items-center justify-center">
                    <VideoOff className="text-white h-6 w-6" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-center items-center space-x-4 mt-4">
              <Button 
                variant={isVideoEnabled ? "default" : "outline"} 
                size="icon"
                className="rounded-full h-12 w-12"
                onClick={toggleVideo}
              >
                {isVideoEnabled ? <Video /> : <VideoOff />}
              </Button>
              <Button 
                variant={isAudioEnabled ? "default" : "outline"} 
                size="icon"
                className="rounded-full h-12 w-12"
                onClick={toggleAudio}
              >
                {isAudioEnabled ? <Mic /> : <MicOff />}
              </Button>
              <Button 
                variant="destructive" 
                size="icon"
                className="rounded-full h-12 w-12"
                onClick={endCall}
              >
                <PhoneOff />
              </Button>
            </div>
          </div>
          
          <div 
            className={`${activeTab === "chat" || window.innerWidth >= 768 ? "block" : "hidden"} md:block w-full md:w-80 border-l bg-background flex flex-col`}
          >
            <div className="p-3 border-b">
              <h3 className="font-medium">Chat</h3>
              <p className="text-xs text-muted-foreground">
                {consultation.patient.name} | {consultation.patient.spezies}
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mb-2" />
                  <p>Keine Nachrichten</p>
                  <p className="text-sm">Beginnen Sie die Unterhaltung</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isSender = message.sender_id === user?.id;
                  return (
                    <div 
                      key={message.id}
                      className={`flex ${isSender ? "justify-end" : "justify-start"}`}
                    >
                      <div 
                        className={`max-w-[80%] p-3 rounded-lg ${
                          isSender 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 text-right mt-1">
                          {format(new Date(message.created_at), "HH:mm")}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="border-t p-3">
              <form 
                className="flex"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
              >
                <Input
                  placeholder="Nachricht eingeben..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!newMessage.trim()}
                  className="ml-2"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsultationRoom;
