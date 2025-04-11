
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = sessionStorage.getItem('owner_access_token');
  
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

  useEffect(() => {
    if (!token) {
      setError("Kein Zugriffstoken gefunden. Bitte überprüfen Sie den Link.");
      setLoading(false);
      return;
    }

    if (!id) {
      setError("Keine Konsultations-ID gefunden.");
      setLoading(false);
      return;
    }

    const fetchConsultationDetails = async () => {
      try {
        // Validate the token first
        const { data: validationData, error: validationError } = await supabase
          .rpc('validate_owner_session', { token_param: token });
        
        if (validationError || !validationData || validationData.length === 0) {
          setError("Der Zugangslink ist ungültig oder abgelaufen.");
          setLoading(false);
          return;
        }

        // Check if this token is for this consultation
        if (validationData[0].consultation_id !== id) {
          setError("Der Zugangslink ist für eine andere Konsultation.");
          setLoading(false);
          return;
        }
        
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
        
        if (consultationError || !consultationData) {
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
        
        // Initialize WebRTC connection
        initializeMediaDevices();
      } catch (err) {
        console.error("Error fetching consultation:", err);
        setError("Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.");
        setLoading(false);
      }
    };

    fetchConsultationDetails();

    return () => {
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Initialize WebSocket connection to the signaling server
      initializeSignalingConnection();
      
      setLoading(false);
    } catch (err) {
      console.error("Error accessing media devices:", err);
      setError("Zugriff auf Kamera und Mikrofon fehlgeschlagen. Bitte erteilen Sie die erforderlichen Berechtigungen.");
      setLoading(false);
    }
  };

  const initializeSignalingConnection = () => {
    if (!consultation) return;
    
    // Connect to Supabase Edge Function for WebRTC signaling
    const ws = new WebSocket('wss://hwdzrrhjjrnruyfyydmu.supabase.co/functions/v1/telemedizin-signaling');
    
    ws.onopen = () => {
      console.log("WebSocket connection established");
      // Join the room using the consultation room ID
      ws.send(JSON.stringify({
        type: 'join',
        roomId: consultation.roomId,
        userId: 'besitzer' // We identify the owner with a fixed ID
      }));
      
      initializePeerConnection(ws);
    };
    
    ws.onclose = () => {
      console.log("WebSocket connection closed");
      setConnected(false);
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setError("Verbindungsfehler zum Signalserver.");
    };
    
    setWsConnection(ws);
  };

  const initializePeerConnection = (ws: WebSocket) => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    const pc = new RTCPeerConnection(configuration);
    
    // Add local stream to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        ws.send(JSON.stringify({
          type: 'ice-candidate',
          target: 'doctor', // Send to the doctor
          candidate: event.candidate
        }));
      }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      if (pc.connectionState === 'connected') {
        setConnected(true);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setConnected(false);
      }
    };
    
    // Handle receiving remote stream
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    
    // Handle WebSocket messages for signaling
    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'offer':
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(message));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({
              type: 'answer',
              target: message.sender,
              answer
            }));
          } catch (error) {
            console.error("Error handling offer:", error);
          }
          break;
          
        case 'answer':
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(message));
          } catch (error) {
            console.error("Error handling answer:", error);
          }
          break;
          
        case 'ice-candidate':
          try {
            await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
          } catch (error) {
            console.error("Error adding ICE candidate:", error);
          }
          break;
          
        case 'user-joined':
          console.log("User joined:", message.userId);
          // When doctor joins, create an offer
          if (message.userId === 'doctor') {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              ws.send(JSON.stringify({
                type: 'offer',
                target: 'doctor',
                offer
              }));
            } catch (error) {
              console.error("Error creating offer:", error);
            }
          }
          break;
          
        case 'user-left':
          console.log("User left:", message.userId);
          if (message.userId === 'doctor') {
            toast({
              title: "Tierarzt hat die Konsultation verlassen",
              description: "Der Tierarzt hat die Videokonsultation verlassen."
            });
          }
          break;
      }
    };
    
    setPeerConnection(pc);
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
