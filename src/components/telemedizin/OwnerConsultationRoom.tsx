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
        initializeMedia();
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
    };
  }, [id, token]);

  const initializeMedia = async () => {
    try {
      console.log('🎥 Requesting media permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      
      console.log('✅ Media permissions granted');
      setLocalStream(stream);
      
      // Use a timeout to ensure the ref is available
      setTimeout(() => {
        if (localVideoRef.current) {
          console.log('🖥️ Setting local video stream', localVideoRef.current);
          localVideoRef.current.srcObject = stream;
          console.log('🖥️ Local video stream set:', stream.id);
        } else {
          console.error('❌ Local video reference is null (delayed check)');
        }
      }, 500);
      
      setLoading(false);
    } catch (err) {
      console.error("❌ Error accessing media devices:", err);
      setError("Zugriff auf Kamera und Mikrofon fehlgeschlagen. Bitte erteilen Sie die erforderlichen Berechtigungen.");
      setLoading(false);
    }
  };

  // Update the useEffect that initializes the WebRTC connection
  useEffect(() => {
    if (!consultation || !localStream) {
      return;
    }

    console.log('🔌 Initializing signaling connection with consultation:', consultation);
    
    // Create a new peer connection
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    peerConnectionRef.current = pc;
    setPeerConnection(pc);
    
    console.log('📡 Created RTCPeerConnection');

    // Add local stream tracks to peer connection
    if (localStream) {
      console.log('📤 Adding local stream tracks to peer connection');
      localStream.getTracks().forEach(track => {
        console.log(`Adding track: ${track.kind}`);
        pc.addTrack(track, localStream);
      });
    }

    // Set up event handlers
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 Generated ICE candidate:', event.candidate.candidate.substring(0, 50) + '...');
        
        // Send ICE candidate through Supabase channel
        sendSignal({
          type: 'ice-candidate',
          sender: 'owner',
          target: 'vet',
          candidate: event.candidate
        });
        console.log('🧊 Sent ICE candidate to vet');
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`📡 Connection state changed to: ${pc.connectionState}`);
      if (pc.connectionState === 'connected') {
        setConnected(true);
        console.log('✅ Peer connection established successfully!');
        
        // Explicitly check remoteStream again
        if (remoteVideoRef.current && remoteStream) {
          console.log('🖥️ Setting remote video stream after connection');
          remoteVideoRef.current.srcObject = remoteStream;
        }
      } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        setConnected(false);
      }
    };

    pc.ontrack = (event) => {
      console.log('📺 Received remote track:', event.track.kind);
      setRemoteStream(event.streams[0]);
      
      if (remoteVideoRef.current) {
        console.log('🖥️ Setting remote video stream');
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      
      // When we receive tracks, we're actually connected
      setConnected(true);
    };

    // Create a Supabase Realtime channel for signaling
    const channelName = `video-consultation-${consultation.roomId}`;
    console.log(`🔄 Creating channel: ${channelName}`);
    
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false }
      }
    });
    
    // Send a join message when owner connects
    const sendJoin = () => {
      sendSignal({
        type: 'join',
        sender: 'owner',
        roomId: consultation.roomId
      });
    };
    
    // Function to send signals through the channel
    const sendSignal = (message) => {
      try {
        console.log('📤 Sending signal:', message.type);
        channel.send({
          type: 'broadcast',
          event: 'video-signal',
          payload: message
        });
      } catch (error) {
        console.error('❌ Error sending signal:', error);
      }
    };
    
    // Handle incoming signaling messages
    const handleSignalingMessage = async (message) => {
      try {
        console.log('🛠️ Processing signal:', message.type, 'from', message.sender);
        
        switch (message.type) {
          case 'offer':
            console.log('📩 Processing offer from vet');
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
              console.log('✅ Remote description set for offer');
              
              const answer = await pc.createAnswer();
              console.log('📤 Created answer');
              await pc.setLocalDescription(answer);
              console.log('✅ Local description set for answer');
              
              // Short delay to ensure everything is set
              setTimeout(() => {
                sendSignal({
                  type: 'answer',
                  target: 'vet',
                  sender: 'owner',
                  sdp: pc.localDescription
                });
                console.log('📤 Sent answer to vet');
              }, 500);
            } catch (error) {
              console.error('❌ Error processing offer:', error);
            }
            break;
            
          case 'ice-candidate':
            if (message.sender === 'vet') {
              console.log('🧊 Received ICE candidate from vet:', message.candidate.candidate.substring(0, 50) + '...');
              if (pc && message.candidate) {
                await pc.addIceCandidate(message.candidate);
                console.log('✅ Added remote ICE candidate');
              }
            }
            break;
            
          case 'vet-connected':
            console.log('👨‍⚕️ Vet is connected and ready');
            break;
        }
      } catch (error) {
        console.error('❌ Error handling signaling message:', error);
      }
    };
    
    // Listen for signals on the channel
    channel.on('broadcast', { event: 'video-signal' }, (payload) => {
      const message = payload.payload;
      console.log('📨 Received signal:', message.type, message);
      
      if (message.target === 'owner' || !message.target) {
        handleSignalingMessage(message);
      }
    });
    
    // Subscribe to the channel
    channel.subscribe((status) => {
      console.log(`Channel status: ${status}`);
      if (status === 'SUBSCRIBED') {
        // Send join message when we're connected
        sendJoin();
        
        // Listen specifically for offer messages to ensure we don't miss them
        channel.on('broadcast', { event: 'video-signal' }, (payload) => {
          const message = payload.payload;
          if (message.type === 'offer' && message.sender === 'vet') {
            console.log('📩 Offer message detected in special listener');
            handleSignalingMessage(message);
          }
        });
      }
    });
    
    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up WebRTC resources...');
      if (pc) {
        pc.close();
      }
      
      // Unsubscribe from the channel
      supabase.removeChannel(channel);
    };
  }, [consultation, localStream]);

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
    if (peerConnection) {
      peerConnection.close();
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    navigate('/');
  };

  useEffect(() => {
    // After component mounts, check if video elements exist and set them
    if (localStream && localVideoRef.current) {
      console.log('🔍 Double-checking local video reference after mount');
      localVideoRef.current.srcObject = localStream;
    }
    
    if (remoteStream && remoteVideoRef.current) {
      console.log('🔍 Double-checking remote video reference after mount');
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);

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
                  ref={(el) => {
                    // Ensure the ref is properly set
                    remoteVideoRef.current = el;
                    
                    // If we have a stream and the element, set it immediately
                    if (el && remoteStream) {
                      console.log('🖥️ Setting remote video stream (inline ref)');
                      el.srcObject = remoteStream;
                    }
                  }}
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
                  ref={(el) => {
                    // Ensure the ref is properly set
                    localVideoRef.current = el;
                    
                    // If we have a stream and the element, set it immediately
                    if (el && localStream) {
                      console.log('🖥️ Setting local video stream (inline ref)');
                      el.srcObject = localStream;
                    }
                  }}
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
