import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { 
  Loader2, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Video, 
  VideoOff, 
  MessageSquare, 
  Paperclip, 
  Send, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Download,
  File,
  FileText,
  Image as ImageIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";

interface ConsultationDetails {
  id: string;
  title: string;
  doctorName: string;
  patientName: string;
  roomId: string;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  file_id?: string;
}

interface TelemedizinFile {
  id: string;
  consultation_id?: string;
  uploader_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  created_at: string;
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
  const [activeTab, setActiveTab] = useState<string>("video");
  
  // Camera controls
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isWideAngle, setIsWideAngle] = useState(false);
  const [cameraCapabilities, setCameraCapabilities] = useState<{
    hasZoom: boolean;
    hasWideAngle: boolean;
  }>({ hasZoom: false, hasWideAngle: false });
  
  // Messaging and file sharing
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [files, setFiles] = useState<TelemedizinFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<{
    name: string;
    progress: number;
    id: string;
  }[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  
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
      
      // Request advanced camera constraints for mobile devices
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: { ideal: "user" },
          // Request advanced camera controls explicitly
          advanced: [
            { zoom: true },
            { focusMode: "continuous" }
          ]
        },
        audio: true
      };
      
      console.log('📱 Requesting media with constraints:', JSON.stringify(constraints, null, 2));
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints as any);
      
      console.log('✅ Media permissions granted');
      setLocalStream(stream);
      
      // Check camera capabilities
      checkCameraCapabilities(stream);
      
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
      
      // Fetch messages and files if we have a consultation ID
      if (id) {
        fetchMessages(id);
        fetchFiles(id);
      }
      
      setLoading(false);
    } catch (err) {
      console.error("❌ Error accessing media devices:", err);
      setError("Zugriff auf Kamera und Mikrofon fehlgeschlagen. Bitte erteilen Sie die erforderlichen Berechtigungen.");
      setLoading(false);
    }
  };
  
  // Check camera capabilities (zoom, wide angle)
  const checkCameraCapabilities = async (stream: MediaStream) => {
    try {
      const videoTrack = stream.getVideoTracks()[0];
      
      if (videoTrack) {
        // Get device info
        const deviceId = videoTrack.getSettings().deviceId;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const currentDevice = devices.find(d => d.deviceId === deviceId);
        
        console.log('📱 Current video device:', currentDevice?.label || 'Unknown');
        console.log('📱 All available video devices:', 
          devices.filter(d => d.kind === 'videoinput').map(d => d.label || 'Unnamed camera')
        );
        
        const capabilities = videoTrack.getCapabilities() as any;
        const settings = videoTrack.getSettings() as any;
        
        // Log ALL track information for debugging
        console.log('📱 Video track:', videoTrack);
        console.log('📱 Track settings:', settings);
        console.log('📱 Track constraints:', videoTrack.getConstraints());
        
        // Check for zoom capability
        const hasZoom = capabilities.zoom !== undefined;
        
        // Check for wide angle capability (facing mode switching)
        // More reliable check for mobile devices - assume true if we have facingMode capability
        // or multiple video input devices
        const hasWideAngle = 
          (capabilities.facingMode !== undefined) ||
          (devices.filter(d => d.kind === 'videoinput').length > 1);
        
        // For debugging - force capabilities to true to test UI
        const forceCameraControls = true; // Change to false to use actual detection
        
        setCameraCapabilities({
          hasZoom: forceCameraControls ? true : hasZoom,
          hasWideAngle: forceCameraControls ? true : hasWideAngle
        });
        
        console.log('📷 Camera capabilities:', { 
          detected: { hasZoom, hasWideAngle },
          used: { 
            hasZoom: forceCameraControls ? true : hasZoom, 
            hasWideAngle: forceCameraControls ? true : hasWideAngle 
          },
          raw: capabilities 
        });
      }
    } catch (error) {
      console.error('❌ Error checking camera capabilities:', error);
    }
  };
  
  // Fetch messages
  const fetchMessages = async (consultationId: string) => {
    try {
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
        // Mark messages as read
        const unreadMessages = data
          .filter(msg => {
            const typedMsg = msg as unknown as Message;
            // Mark messages sent to the owner as read
            return !typedMsg.is_read && typedMsg.recipient_id !== typedMsg.sender_id;
          })
          .map(msg => (msg as unknown as Message).id);
          
        if (unreadMessages.length > 0) {
          await supabase
            .from('telemedizin_messages')
            .update({ is_read: true })
            .in("id", unreadMessages);
        }
      }
    } catch (error) {
      console.error("Error in fetchMessages:", error);
    }
  };
  
  // Fetch files
  const fetchFiles = async (consultationId: string) => {
    try {
      const { data, error } = await supabase
        .from('telemedizin_files')
        .select("*")
        .eq("consultation_id", consultationId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching files:", error);
        return;
      }

      setFiles(data as unknown as TelemedizinFile[]);
    } catch (error) {
      console.error("Error in fetchFiles:", error);
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

  // Camera zoom control
  const handleZoom = (direction: 'in' | 'out') => {
    if (!localStream) return;
    
    try {
      const videoTrack = localStream.getVideoTracks()[0];
      
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities() as any;
        const settings = videoTrack.getSettings() as any;
        
        console.log('🔍 Attempting to zoom', direction);
        console.log('🔍 Current settings:', settings);
        
        // Mobile-friendly zoom approach 1: Try standard zoom
        if (capabilities.zoom) {
          const currentZoom = settings.zoom || 1;
          const min = capabilities.zoom?.min || 1;
          const max = capabilities.zoom?.max || 10;
          const step = (max - min) / 10; // 10 steps from min to max
          
          let newZoom = currentZoom;
          if (direction === 'in') {
            newZoom = Math.min(currentZoom + step, max);
          } else {
            newZoom = Math.max(currentZoom - step, min);
          }
          
          console.log(`🔍 Applying zoom: ${currentZoom} → ${newZoom}`);
          
          // Use type assertion for the constraints
          videoTrack.applyConstraints({
            advanced: [{ zoom: newZoom } as any]
          }).then(() => {
            console.log('✅ Zoom applied successfully');
            setZoomLevel(newZoom);
          }).catch(err => {
            console.error('❌ Error applying zoom:', err);
          });
        } 
        // Mobile-friendly zoom approach 2: Try digital zoom through manipulation of width/height
        else {
          // Simulate zoom by requesting a different crop of the camera
          const zoomFactor = direction === 'in' ? 1.2 : 0.8;
          const newZoomLevel = direction === 'in' 
            ? Math.min(zoomLevel * zoomFactor, 5) 
            : Math.max(zoomLevel * zoomFactor, 1);
            
          console.log(`🔍 Applying digital zoom: ${zoomLevel} → ${newZoomLevel}`);
          
          // Calculate new width/height to simulate zoom
          const baseWidth = 1280;
          const baseHeight = 720;
          const scaledWidth = Math.round(baseWidth / newZoomLevel);
          const scaledHeight = Math.round(baseHeight / newZoomLevel);
          
          videoTrack.applyConstraints({
            width: { ideal: scaledWidth },
            height: { ideal: scaledHeight }
          }).then(() => {
            console.log('✅ Digital zoom applied successfully');
            setZoomLevel(newZoomLevel);
          }).catch(err => {
            console.error('❌ Error applying digital zoom:', err);
          });
        }
      }
    } catch (error) {
      console.error("Error controlling camera zoom:", error);
    }
  };
  
  // Toggle wide angle (switch between front/back camera on mobile)
  const toggleWideAngle = async () => {
    if (!localStream) return;
    
    try {
      console.log('📱 Toggling camera mode');
      console.log('📱 Current wide angle state:', isWideAngle);
      
      // Stop all tracks in the current stream
      localStream.getTracks().forEach(track => track.stop());
      
      // Request a new stream with the opposite facing mode
      const newFacingMode = isWideAngle ? "user" : "environment";
      console.log('📱 Requesting new camera with facing mode:', newFacingMode);
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });
      
      console.log('📱 New stream obtained:', newStream);
      
      // Log the new video track info
      const newVideoTrack = newStream.getVideoTracks()[0];
      console.log('📱 New video track:', newVideoTrack);
      console.log('📱 New track settings:', newVideoTrack.getSettings());
      
      // Replace tracks in the peer connection
      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        
        for (const sender of senders) {
          if (sender.track?.kind === 'video') {
            const newVideoTrack = newStream.getVideoTracks()[0];
            console.log('📱 Replacing track in peer connection');
            await sender.replaceTrack(newVideoTrack);
          }
        }
      }
      
      // Update local video
      if (localVideoRef.current) {
        console.log('📱 Updating local video ref');
        localVideoRef.current.srcObject = newStream;
      }
      
      setLocalStream(newStream);
      setIsWideAngle(!isWideAngle);
      console.log('📱 Camera switch completed');
      
      // Check capabilities of the new camera
      checkCameraCapabilities(newStream);
    } catch (error) {
      console.error("Error toggling camera mode:", error);
      toast({
        title: "Fehler",
        description: "Kamera konnte nicht umgeschaltet werden.",
        variant: "destructive",
      });
    }
  };
  
  // Send message
  const sendMessage = async (messageContent?: string, fileId?: string) => {
    const content = messageContent || newMessage;
    if ((!content.trim() && !fileId) || !consultation || !token) return;

    try {
      const { data: validationData } = await supabase
        .rpc('validate_owner_session', { token_param: token });
        
      if (!validationData || validationData.length === 0) {
        console.error('❌ Invalid token when trying to send message');
        return;
      }
      
      const besitzerId = validationData[0].besitzer_id;
      
      // Get the vet ID from the consultation
      const { data: consultationData } = await supabase
        .from('video_consultations')
        .select('doctor_id')
        .eq('id', consultation.id)
        .single();
        
      if (!consultationData) {
        console.error('❌ Could not find consultation when trying to send message');
        return;
      }
      
      const vetId = consultationData.doctor_id;
      
      const messageData: any = {
        consultation_id: consultation.id,
        sender_id: besitzerId,
        recipient_id: vetId,
        content: content.trim()
      };
      
      // If a file ID is provided, attach it to the message
      if (fileId) {
        messageData.file_id = fileId;
      }

      const { data, error } = await supabase
        .from('telemedizin_messages')
        .insert(messageData)
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
      console.error("Error sending message:", error);
    }
  };
  
  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !consultation || !token) {
      return;
    }
    
    try {
      const { data: validationData } = await supabase
        .rpc('validate_owner_session', { token_param: token });
        
      if (!validationData || validationData.length === 0) {
        console.error('❌ Invalid token when trying to upload file');
        return;
      }
      
      const besitzerId = validationData[0].besitzer_id;
      const filesArray = Array.from(event.target.files);
      
      for (const file of filesArray) {
        // Create a unique ID for tracking upload progress
        const uploadId = Math.random().toString(36).substring(2, 15);
        
        // Add to uploading files state
        setUploadingFiles(prev => [
          ...prev,
          {
            name: file.name,
            progress: 0,
            id: uploadId
          }
        ]);
        
        try {
          // First store the file metadata
          const fileData = {
            consultation_id: consultation.id,
            uploader_id: besitzerId,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            storage_path: `telemedizin/${consultation.id}/${Date.now()}_${file.name}`
          };
          
          const { data: metadataData, error: metadataError } = await supabase
            .from('telemedizin_files')
            .insert(fileData)
            .select()
            .single();
            
          if (metadataError) {
            console.error("Error storing file metadata:", metadataError);
            toast({
              title: "Fehler",
              description: "Datei konnte nicht hochgeladen werden.",
              variant: "destructive",
            });
            
            // Remove from uploading files
            setUploadingFiles(prev => prev.filter(item => item.id !== uploadId));
            continue;
          }
          
          // Then upload the actual file
          const { data: storageData, error: storageError } = await supabase
            .storage
            .from('telemedizin-files')
            .upload(fileData.storage_path, file, {
              // Use type assertion for the options
              onUploadProgress: (progress) => {
                const percent = Math.round((progress.loaded / progress.total) * 100);
                setUploadingFiles(prev => 
                  prev.map(item => 
                    item.id === uploadId 
                      ? { ...item, progress: percent } 
                      : item
                  )
                );
              }
            } as any);
            
          if (storageError) {
            console.error("Error uploading file:", storageError);
            
            // Delete the metadata since the upload failed
            await supabase
              .from('telemedizin_files')
              .delete()
              .eq('id', metadataData.id);
              
            toast({
              title: "Fehler",
              description: "Datei konnte nicht hochgeladen werden.",
              variant: "destructive",
            });
          } else {
            // Add the new file to the files list
            setFiles(prev => [metadataData as unknown as TelemedizinFile, ...prev]);
            
            // Send a message about the new file
            await sendMessage(`Datei hochgeladen: ${file.name}`, metadataData.id);
            
            toast({
              title: "Erfolg",
              description: "Datei wurde hochgeladen.",
            });
          }
        } catch (error) {
          console.error("Error in file upload process:", error);
          toast({
            title: "Fehler",
            description: "Beim Hochladen der Datei ist ein Fehler aufgetreten.",
            variant: "destructive",
          });
        } finally {
          // Remove from uploading files
          setUploadingFiles(prev => prev.filter(item => item.id !== uploadId));
        }
      }
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Error validating owner session:", error);
    }
  };
  
  // File download handler
  const handleFileDownload = async (file: TelemedizinFile) => {
    try {
      const { data, error } = await supabase
        .storage
        .from('telemedizin-files')
        .download(file.storage_path);
        
      if (error) {
        console.error("Error downloading file:", error);
        toast({
          title: "Fehler",
          description: "Datei konnte nicht heruntergeladen werden.",
          variant: "destructive",
        });
        return;
      }
      
      // Create a download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error in file download process:", error);
      toast({
        title: "Fehler",
        description: "Beim Herunterladen der Datei ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    }
  };

  // Listen for new messages
  useEffect(() => {
    if (!consultation) return;

    const channel = supabase
      .channel('owner_telemedizin_messages_changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'telemedizin_messages',
          filter: `consultation_id=eq.${consultation.id}` 
        }, 
        (payload) => {
          // Get owner ID from token
          const getOwnerId = async () => {
            try {
              const { data } = await supabase
                .rpc('validate_owner_session', { token_param: token });
                
              if (!data || data.length === 0) return;
              
              const besitzerId = data[0].besitzer_id;
              
              // Only add messages that weren't sent by this owner
              if (payload.new.sender_id !== besitzerId) {
                setMessages(prev => [...prev, payload.new as unknown as Message]);
                
                // Mark message as read
                await supabase
                  .from('telemedizin_messages')
                  .update({ is_read: true })
                  .eq("id", payload.new.id);
              }
            } catch (error) {
              console.error("Error in message listener:", error);
            }
          };
          
          getOwnerId();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultation, token]);
  
  // Listen for new files
  useEffect(() => {
    if (!consultation) return;

    const channel = supabase
      .channel('owner_telemedizin_files_changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'telemedizin_files',
          filter: `consultation_id=eq.${consultation.id}` 
        }, 
        (payload) => {
          // Get owner ID from token
          const getOwnerId = async () => {
            try {
              const { data } = await supabase
                .rpc('validate_owner_session', { token_param: token });
                
              if (!data || data.length === 0) return;
              
              const besitzerId = data[0].besitzer_id;
              
              // Only add files that weren't uploaded by this owner
              if (payload.new.uploader_id !== besitzerId) {
                setFiles(prev => [payload.new as unknown as TelemedizinFile, ...prev]);
              }
            } catch (error) {
              console.error("Error in file listener:", error);
            }
          };
          
          getOwnerId();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultation, token]);
  
  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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
          {/* Mobile tabs for switching between video and chat */}
          <div className="block md:hidden mb-4">
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Main video - Remote (doctor) */}
            <div className={`md:col-span-2 ${activeTab === "video" || window.innerWidth >= 768 ? "block" : "hidden"}`}>
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
                
                {/* Camera control buttons */}
                {connected && cameraCapabilities.hasZoom && (
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="secondary" 
                            size="icon"
                            className="rounded-full bg-black/50 hover:bg-black/70 text-white"
                            onClick={() => handleZoom('in')}
                          >
                            <ZoomIn className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Zoom In</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="secondary" 
                            size="icon"
                            className="rounded-full bg-black/50 hover:bg-black/70 text-white"
                            onClick={() => handleZoom('out')}
                          >
                            <ZoomOut className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Zoom Out</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
                
                {/* Wide angle toggle button */}
                {connected && cameraCapabilities.hasWideAngle && (
                  <div className="absolute top-4 left-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="secondary" 
                            size="icon"
                            className="rounded-full bg-black/50 hover:bg-black/70 text-white"
                            onClick={toggleWideAngle}
                          >
                            <Maximize className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isWideAngle ? "Frontkamera" : "Rückkamera"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>
              
              <div className="flex justify-center items-center space-x-4 mt-4">
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
            
            {/* Side panel - Self view, chat and controls */}
            <div className={`${activeTab === "chat" || window.innerWidth >= 768 ? "block" : "hidden"} space-y-4`}>
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
              
              {/* Chat section */}
              <div className="border rounded-lg flex flex-col h-[calc(30vh-2rem)]">
                <div className="p-3 border-b">
                  <h3 className="font-medium">Chat</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 && files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mb-2" />
                      <p>Keine Nachrichten</p>
                      <p className="text-sm">Beginnen Sie die Unterhaltung</p>
                    </div>
                  ) : (
                    <>
                      {/* Files list */}
                      {files.length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-medium text-sm mb-2">Dateien</h4>
                          <div className="space-y-2">
                            {files.map((file) => {
                              const isImage = file.file_type.startsWith('image/');
                              const isPdf = file.file_type === 'application/pdf';
                              
                              return (
                                <div 
                                  key={file.id}
                                  className="flex items-center p-2 rounded-md bg-muted hover:bg-muted/80 cursor-pointer"
                                  onClick={() => handleFileDownload(file)}
                                >
                                  <div className="h-8 w-8 flex items-center justify-center rounded-md bg-primary/10 mr-3">
                                    {isImage ? (
                                      <ImageIcon className="h-4 w-4 text-primary" />
                                    ) : isPdf ? (
                                      <FileText className="h-4 w-4 text-primary" />
                                    ) : (
                                      <File className="h-4 w-4 text-primary" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{file.file_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {(file.file_size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 ml-2"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Messages */}
                      {messages.map((message) => {
                        // Determine if message is from owner (current user) by checking if we have the token validation
                        const getIsOwnerMessage = async () => {
                          try {
                            const { data } = await supabase
                              .rpc('validate_owner_session', { token_param: token });
                              
                            if (!data || data.length === 0) return false;
                            
                            return message.sender_id === data[0].besitzer_id;
                          } catch (error) {
                            return false;
                          }
                        };
                        
                        // For simplicity in this UI, we'll just check if the message is from the doctor
                        // by comparing with the consultation doctor_id
                        const isFromDoctor = message.sender_id === consultation?.doctorName;
                        
                        return (
                          <div 
                            key={message.id}
                            className={`flex ${isFromDoctor ? "justify-start" : "justify-end"}`}
                          >
                            <div 
                              className={`max-w-[80%] p-3 rounded-lg ${
                                isFromDoctor 
                                  ? "bg-muted" 
                                  : "bg-primary text-primary-foreground"
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                              <p className="text-xs opacity-70 text-right mt-1">
                                {format(new Date(message.created_at), "HH:mm")}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Uploading files progress */}
                      {uploadingFiles.length > 0 && (
                        <div className="space-y-2 mt-4">
                          {uploadingFiles.map((file) => (
                            <div key={file.id} className="bg-muted p-2 rounded-md">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="truncate max-w-[80%]">{file.name}</span>
                                <span>{file.progress}%</span>
                              </div>
                              <Progress value={file.progress} className="h-1" />
                            </div>
                          ))}
                        </div>
                      )}
                    </>
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
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      multiple
                    />
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="ghost"
                      className="ml-1"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="submit" 
                      size="icon" 
                      disabled={!newMessage.trim()}
                      className="ml-1"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerConsultationRoom;
