import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";

interface ConsultationDetails {
  id: string;
  title: string;
  doctorName: string;
  patientName: string;
  roomId: string;
}

const OwnerConsultationRoom = () => {
  console.log('🏥 OWNER CONSULTATION ROOM MOUNTED');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = sessionStorage.getItem('owner_access_token');
  
  console.log('🔑 Token from session storage:', token ? 'Present' : 'Missing');
  console.log('🆔 Consultation ID:', id);

  const [loading, setLoading] = useState(true);
  const [consultation, setConsultation] = useState<ConsultationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // WebRTC variables
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  // Add heartbeat interval ref
  const heartbeatIntervalRef = useRef<number | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Add connection attempt counter
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Add WebSocket URL to state
  const [wsUrl] = useState(`wss://hwdzrrhjjrnruyfyydmu.supabase.co/functions/v1/telemedizin-signaling`);

  useEffect(() => {
    console.log('🔄 OWNER CONSULTATION ROOM EFFECT RUNNING');
    
    if (!token) {
      console.error('❌ No access token found');
      setError("Kein Zugriffstoken gefunden. Bitte überprüfen Sie den Link.");
      setLoading(false);
      return;
    }

    if (!id) {
      console.error('❌ No consultation ID found');
      setError("Keine Konsultations-ID gefunden.");
      setLoading(false);
      return;
    }

    const fetchConsultationDetails = async () => {
      try {
        console.log('🔍 Validating owner session token...');
        // Validate the token first
        const { data: validationData, error: validationError } = await supabase
          .rpc('validate_owner_session', { token_param: token });
        
        console.log('🔐 Token validation result:', { validationData, validationError });
        
        if (validationError || !validationData || validationData.length === 0) {
          console.error('❌ Invalid or expired token');
          setError("Der Zugangslink ist ungültig oder abgelaufen.");
          setLoading(false);
          return;
        }

        // Check if this token is for this consultation
        if (validationData[0].consultation_id !== id) {
          console.error('❌ Token is for a different consultation');
          setError("Der Zugangslink ist für eine andere Konsultation.");
          setLoading(false);
          return;
        }
        
        console.log('🔍 Fetching consultation details...');
        // Get consultation details
        const { data: consultationData, error: consultationError } = await supabase
          .from('video_consultations')
          .select(`
            id,
            title,
            room_id,
            doctor:doctor_id(vorname, nachname),
            patient:patient_id(name)
          `)
          .eq('id', id)
          .single();
        
        console.log('📊 Consultation data:', consultationData);
        console.log('❌ Consultation error:', consultationError);

        if (consultationError || !consultationData) {
          console.error('❌ Could not find consultation');
          setError("Die Konsultation konnte nicht gefunden werden.");
          setLoading(false);
          return;
        }

        setConsultation({
          id: consultationData.id,
          title: consultationData.title,
          doctorName: `${consultationData.doctor.vorname} ${consultationData.doctor.nachname}`,
          patientName: consultationData.patient.name,
          roomId: consultationData.room_id
        });
        
        console.log('🎥 Initializing media devices...');
        // Initialize WebRTC connection
        initializeMediaDevices();
      } catch (err) {
        console.error("❌ Error fetching consultation:", err);
        setError("Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.");
        setLoading(false);
      }
    };

    fetchConsultationDetails();

    return () => {
      console.log('🧹 Cleaning up WebRTC resources...');
      // Cleanup WebRTC resources
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnection) {
        peerConnection.close();
      }
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, [id, token]);

  const initializeMediaDevices = async () => {
    try {
      console.log('🎥 Requesting media permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log('✅ Media permissions granted');
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        console.log('🎥 Setting local video stream');
        localVideoRef.current.srcObject = stream;
      }
      
      setLoading(false);
    } catch (err) {
      console.error("❌ Error accessing media devices:", err);
      setError("Zugriff auf Kamera und Mikrofon fehlgeschlagen. Bitte erteilen Sie die erforderlichen Berechtigungen.");
      setLoading(false);
    }
  };

  // New useEffect to handle WebSocket initialization
  useEffect(() => {
    if (!consultation || !localStream) {
      return;
    }

    console.log('🔌 Initializing signaling connection with consultation:', consultation);
    initializeSignalingConnection();

    // Cleanup function
    return () => {
      if (wsConnection) {
        console.log('🧹 Cleaning up WebSocket connection');
        wsConnection.close();
      }
      // Clear heartbeat interval
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [consultation, localStream]); // Only run when consultation or localStream changes

  const initializeSignalingConnection = () => {
    console.log('🔌 Initializing signaling connection...');
    console.log('🔌 Connecting to signaling server:', wsUrl);
    const ws = new WebSocket(wsUrl);
    
    // Initialize peer connection first
    const peerConnection = initializePeerConnection(ws);
    peerConnectionRef.current = peerConnection;
    setPeerConnection(peerConnection);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connection established');
      reconnectAttemptRef.current = 0; // Reset reconnect counter on successful connection
      
      // Join the room
      const joinMessage = {
        type: 'join',
        roomId: consultation.roomId,
        userId: 'owner'
      };
      console.log('📤 Sending join message:', joinMessage);
      ws.send(JSON.stringify(joinMessage));

      // Start heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      heartbeatIntervalRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          console.log("💓 Sending heartbeat");
          try {
            ws.send(JSON.stringify({ type: "heartbeat" }));
          } catch (error) {
            console.error('❌ Error sending heartbeat:', error);
            ws.close(1006, "Heartbeat send failed");
          }
        }
      }, 30000); // Send heartbeat every 30 seconds
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      
      // Clear heartbeat interval
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      // Attempt to reconnect if connection was lost abnormally
      if (event.code === 1006 && reconnectAttemptRef.current < maxReconnectAttempts) {
        console.log(`🔄 Attempting to reconnect (${reconnectAttemptRef.current + 1}/${maxReconnectAttempts})...`);
        reconnectAttemptRef.current += 1;
        setTimeout(() => {
          if (wsConnection?.readyState !== WebSocket.OPEN) {
            console.log('🔄 Reconnecting...');
            initializeSignalingConnection();
          }
        }, 5000);
      } else if (reconnectAttemptRef.current >= maxReconnectAttempts) {
        console.log("❌ Max reconnection attempts reached");
        toast({
          title: "Verbindungsfehler",
          description: "Die Verbindung konnte nicht wiederhergestellt werden. Bitte laden Sie die Seite neu.",
          variant: "destructive",
        });
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Verbindungsfehler",
        description: "Es gab einen Problem mit der Verbindung zum Server.",
        variant: "destructive",
      });
    };
    
    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 Received WebSocket message:', message);
        
        switch (message.type) {
          case 'heartbeat':
            // Send heartbeat acknowledgment
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({ type: 'heartbeat-ack' }));
              } catch (error) {
                console.error('❌ Error sending heartbeat acknowledgment:', error);
              }
            }
            break;
            
          case 'error':
            console.error("❌ Signaling server error:", message.error);
            toast({
              title: "Verbindungsfehler",
              description: "Es gab einen Fehler bei der Signalisierung: " + message.error,
              variant: "destructive",
            });
            break;
            
          case 'offer':
            console.log('📩 Processing offer from vet');
            try {
              const pc = peerConnectionRef.current;
              if (!pc) {
                console.error('No peer connection available');
                return;
              }
              await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
              console.log('✅ Remote description set for offer');
              const answer = await pc.createAnswer();
              console.log('📤 Created answer');
              await pc.setLocalDescription(answer);
              console.log('✅ Local description set for answer');
              ws.send(JSON.stringify({
                type: 'answer',
                target: 'vet',
                sdp: pc.localDescription
              }));
              console.log('📤 Sent answer to vet');
            } catch (error) {
              console.error("❌ Error handling offer:", error);
            }
            break;
            
          case 'answer':
            console.log('📩 Processing answer from vet');
            try {
              const pc = peerConnectionRef.current;
              if (!pc) {
                console.error('No peer connection available');
                return;
              }
              await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
              console.log('✅ Remote description set for answer');
            } catch (error) {
              console.error("❌ Error handling answer:", error);
            }
            break;
            
          case 'ice-candidate':
            console.log('❄️ Processing ICE candidate from vet');
            try {
              const pc = peerConnectionRef.current;
              if (!pc) {
                console.error('No peer connection available');
                return;
              }
              if (message.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
                console.log('✅ Added ICE candidate successfully');
              }
            } catch (error) {
              console.error("❌ Error adding ICE candidate:", error);
            }
            break;
            
          case 'user-joined':
            console.log("👋 User joined:", message.userId);
            // Owner should only wait for offer from vet
            if (message.userId === 'vet') {
              console.log('👨‍⚕️ Vet joined, waiting for offer...');
            }
            break;
            
          case 'user-left':
            console.log("👋 User left:", message.userId);
            if (message.userId === 'vet') {
              toast({
                title: "Tierarzt hat die Konsultation verlassen",
                description: "Der Tierarzt hat die Videokonsultation verlassen."
              });
            }
            break;
        }
      } catch (error) {
        console.error('❌ Error handling WebSocket message:', error);
      }
    };
    
    setWsConnection(ws);
  };

  const initializePeerConnection = (ws: WebSocket) => {
    console.log('🔄 Initializing peer connection');
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    const pc = new RTCPeerConnection(configuration);
    console.log('📡 Created RTCPeerConnection with config:', configuration);
    
    // Add local stream to peer connection
    if (localStream) {
      console.log('📤 Adding local stream tracks to peer connection');
      localStream.getTracks().forEach(track => {
        console.log(`Adding track: ${track.kind}`);
        pc.addTrack(track, localStream);
      });
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('❄️ New ICE candidate:', event.candidate.type);
        ws.send(JSON.stringify({
          type: 'ice-candidate',
          target: 'vet',  // Changed from 'doctor' to 'vet' for consistency
          candidate: event.candidate
        }));
      }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log("🔌 Connection state changed to:", pc.connectionState);
      if (pc.connectionState === 'connected') {
        console.log('✅ Peer connection established successfully');
        setConnected(true);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        console.log('❌ Peer connection lost or failed');
        setConnected(false);
      }
    };

    // Log ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log('❄️ ICE connection state changed to:', pc.iceConnectionState);
    };

    // Log signaling state changes
    pc.onsignalingstatechange = () => {
      console.log('📡 Signaling state changed to:', pc.signalingState);
    };
    
    // Handle receiving remote stream
    pc.ontrack = (event) => {
      console.log('📥 Received remote track:', event.track.kind);
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        console.log('🎥 Setting remote video stream');
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    
    return pc;
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  const endCall = () => {
    if (wsConnection) {
      wsConnection.send(JSON.stringify({
        type: 'leave',
        roomId: consultation?.roomId
      }));
      wsConnection.close();
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnection) {
      peerConnection.close();
    }
    
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle>Verbinde mit Videokonsultation...</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center p-6">
            <Loader2 className="animate-spin h-16 w-16 text-blue-500" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-red-500">Zugangsfehler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center">{error}</p>
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => navigate("/")}>
                Zurück zur Startseite
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Card className="mx-auto max-w-6xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{consultation?.title}</CardTitle>
            <div className="flex items-center text-sm text-muted-foreground">
              <span className="mr-4">Tierarzt: {consultation?.doctorName}</span>
              <span>Patient: {consultation?.patientName}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main video - Remote (doctor) */}
            <div className="lg:col-span-2">
              <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ height: '60vh' }}>
                <video
                  ref={remoteVideoRef}
                  className="w-full h-full object-contain"
                  autoPlay
                  playsInline
                ></video>
                {!connected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white">
                    <div className="text-center">
                      <Loader2 className="animate-spin h-12 w-12 mx-auto mb-4" />
                      <p>Warte auf Tierarzt...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Side panel - Self view and controls */}
            <div className="space-y-4">
              {/* Self view video */}
              <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ height: '30vh' }}>
                <video
                  ref={localVideoRef}
                  className="w-full h-full object-contain mirror"
                  autoPlay
                  playsInline
                  muted
                ></video>
                {!isVideoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white">
                    <p>Video deaktiviert</p>
                  </div>
                )}
              </div>
              
              {/* Controls */}
              <div className="flex justify-center space-x-4">
                <Button
                  variant={isVideoEnabled ? "outline" : "destructive"}
                  onClick={toggleVideo}
                  className="rounded-full w-12 h-12 p-0"
                >
                  {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                </Button>
                <Button
                  variant={isAudioEnabled ? "outline" : "destructive"}
                  onClick={toggleAudio}
                  className="rounded-full w-12 h-12 p-0"
                >
                  {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                </Button>
                <Button
                  variant="destructive"
                  onClick={endCall}
                  className="rounded-full w-12 h-12 p-0"
                >
                  <PhoneOff size={20} />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerConsultationRoom;
