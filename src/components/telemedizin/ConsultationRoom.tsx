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
  PhoneOff,
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
  File,
  FileText,
  Image as ImageIcon,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { VideoConsultation, Message, TelemedizinFile } from "@/types/telemedizin";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  
  // Camera controls
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isWideAngle, setIsWideAngle] = useState(false);
  const [cameraCapabilities, setCameraCapabilities] = useState<{
    hasZoom: boolean;
    hasWideAngle: boolean;
  }>({ hasZoom: false, hasWideAngle: false });
  
  // File sharing
  const [files, setFiles] = useState<TelemedizinFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<{
    name: string;
    progress: number;
    id: string;
  }[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Add heartbeat interval ref
  const heartbeatIntervalRef = useRef<number | null>(null);

  // Add connection attempt counter
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Add WebSocket URL to state
  const [wsUrl] = useState(`wss://hwdzrrhjjrnruyfyydmu.supabase.co/functions/v1/telemedizin-signaling`);

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
        
        // Fetch files for this consultation
        fetchFiles(data.id);
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
  
  // Fetch files
  const fetchFiles = async (consultationId: string) => {
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
  };

  // Replace the WebSocket initialization with Supabase Realtime channel
  useEffect(() => {
    if (!consultation) return;

    // First, we set up our media
    const initializeMedia = async () => {
      try {
        console.log('🎥 Initializing media devices...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        setLocalStream(stream);
        console.log('✅ Media permissions granted');
        
        // Check camera capabilities
        checkCameraCapabilities(stream);
        
        if (localVideoRef.current) {
          console.log('🖥️ Setting local video stream');
          localVideoRef.current.srcObject = stream;
          console.log('🖥️ Local video stream set:', stream.id);
        }
        
        // Initialize WebRTC after media is set up
        initializeRTC(stream);
      } catch (error) {
        console.error('❌ Error accessing media devices:', error);
        toast({
          title: 'Medienzugriffsfehler',
          description: 'Bitte überprüfen Sie, ob Sie Zugriff auf Kamera und Mikrofon gewährt haben.',
          variant: 'destructive',
        });
      }
    };
    
    // Check camera capabilities (zoom, wide angle)
    const checkCameraCapabilities = async (stream: MediaStream) => {
      try {
        const videoTrack = stream.getVideoTracks()[0];
        
        if (videoTrack) {
          const capabilities = videoTrack.getCapabilities() as any;
          const settings = videoTrack.getSettings() as any;
          
          // Check for zoom capability
          const hasZoom = capabilities.zoom !== undefined;
          
          // Check for wide angle capability (facing mode switching)
          const hasWideAngle = capabilities.facingMode !== undefined && 
                            Array.isArray(capabilities.facingMode) && 
                            capabilities.facingMode.length > 1;
          
          setCameraCapabilities({
            hasZoom,
            hasWideAngle
          });
          
          console.log('📷 Camera capabilities:', { hasZoom, hasWideAngle });
          console.log('📷 Camera full capabilities:', capabilities);
        }
      } catch (error) {
        console.error('❌ Error checking camera capabilities:', error);
      }
    };
    
    // Initialize the RTC connection
    const initializeRTC = (stream) => {
      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      peerConnectionRef.current = pc;
      
      console.log('📡 Created RTCPeerConnection');
      
      // Add local stream tracks to peer connection
      if (stream) {
        console.log('📤 Adding local stream tracks to peer connection');
        stream.getTracks().forEach(track => {
          console.log(`Adding track: ${track.kind}`);
          pc.addTrack(track, stream);
        });
      }
      
      // Set up event handlers
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 Generated ICE candidate:', event.candidate.candidate.substring(0, 50) + '...');
          
          // Send ICE candidate through Supabase channel
          sendSignal({
            type: 'ice-candidate',
            sender: 'vet',
            target: 'owner',
            candidate: event.candidate
          });
          console.log('🧊 Sent ICE candidate to owner');
        }
      };
      
      pc.onconnectionstatechange = () => {
        console.log(`📡 Connection state changed to: ${pc.connectionState}`);
        if (pc.connectionState === 'connected') {
          setIsConnected(true);
          setIsConnecting(false);
          console.log('✅ Peer connection established successfully!');
          
          // Explicitly check remoteStream again
          if (remoteVideoRef.current && remoteStream) {
            console.log('🖥️ Setting remote video stream after connection');
            remoteVideoRef.current.srcObject = remoteStream;
          }
        } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
          setIsConnected(false);
          setIsConnecting(false);
        } else if (pc.connectionState === 'connecting') {
          setIsConnecting(true);
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
        setIsConnected(true);
        setIsConnecting(false);
      };
      
      // Create a Supabase Realtime channel for signaling
      const channelName = `video-consultation-${consultation.room_id}`;
      console.log(`🔄 Creating channel: ${channelName}`);
      
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false }
        }
      });
      
      // Send a join message when vet connects
      const sendJoin = () => {
        sendSignal({
          type: 'join',
          sender: 'vet',
          roomId: consultation.room_id
        });
        
        // Notify that we're connected and ready
        sendSignal({
          type: 'vet-connected',
          sender: 'vet',
          target: 'owner'
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
      
      // Listen for signals on the channel
      channel.on('broadcast', { event: 'video-signal' }, (payload) => {
        const message = payload.payload;
        console.log('📨 Received signal:', message.type, message);
        
        if (message.target === 'vet' || !message.target) {
          handleSignalingMessage(message, pc, sendSignal);
        }
      });
      
      // Subscribe to the channel
      channel.subscribe((status) => {
        console.log(`Channel status: ${status}`);
        if (status === 'SUBSCRIBED') {
          // Send join message when we're connected
          sendJoin();
          
          // Listen specifically for owner join messages to ensure we don't miss them
          channel.on('broadcast', { event: 'video-signal' }, (payload) => {
            const message = payload.payload;
            if (message.type === 'join' && message.sender === 'owner') {
              console.log('👋 Owner join message detected in listener');
              handleSignalingMessage(message, pc, sendSignal);
            }
          });
        }
      });
      
      // Return cleanup function that will be used when the component unmounts
      return () => {
        console.log('🧹 Cleaning up WebRTC resources...');
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        
        if (pc) {
          pc.close();
        }
        
        // Unsubscribe from the channel
        supabase.removeChannel(channel);
      };
    };
    
    // Handle incoming signaling messages
    const handleSignalingMessage = async (message, pc, sendSignal) => {
      try {
        console.log('🛠️ Handling signal:', message.type, 'from', message.sender);
        
        switch (message.type) {
          case 'join':
            if (message.sender === 'owner') {
              console.log('👋 Owner joined, creating offer...');
              setIsConnecting(true);
              
              // Slight delay to ensure both sides are ready
              setTimeout(async () => {
                try {
                  // Create and send offer
                  const offer = await pc.createOffer();
                  await pc.setLocalDescription(offer);
                  
                  // Send the offer to the owner
                  sendSignal({
                    type: 'offer',
                    target: 'owner',
                    sender: 'vet',
                    sdp: pc.localDescription
                  });
                  console.log('✅ Offer sent successfully');
                } catch (error) {
                  console.error('❌ Error creating or sending offer:', error);
                  toast({
                    title: 'Verbindungsfehler',
                    description: 'Es gab einen Fehler beim Verbindungsaufbau. Bitte versuchen Sie es erneut.',
                    variant: 'destructive',
                  });
                  setIsConnecting(false);
                }
              }, 1000);
            }
            break;
            
          case 'answer':
            if (message.sender === 'owner') {
              console.log('📩 Received answer from owner');
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
                console.log('✅ Remote description set from answer');
              } catch (error) {
                console.error('❌ Error setting remote description from answer:', error);
              }
            }
            break;
            
          case 'ice-candidate':
            if (message.sender === 'owner') {
              console.log('🧊 Received ICE candidate from owner:', message.candidate.candidate.substring(0, 50) + '...');
              try {
                if (pc && message.candidate) {
                  await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
                  console.log('✅ Added remote ICE candidate');
                }
              } catch (error) {
                console.error('❌ Error adding ICE candidate:', error);
              }
            }
            break;
        }
      } catch (error) {
        console.error('❌ Error handling signaling message:', error);
      }
    };
    
    // Start initialization
    initializeMedia();
    
    // Cleanup will be handled by the function returned from initializeRTC
  }, [consultation]);

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
  const sendMessage = async (messageContent?: string, fileId?: string) => {
    const content = messageContent || newMessage;
    if ((!content.trim() && !fileId) || !consultation || !user) return;

    try {
      const recipientId = getOtherParticipantId();
      if (!recipientId) return;

      const messageData: any = {
        consultation_id: consultation.id,
        sender_id: user.id,
        recipient_id: recipientId,
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
  
  // Listen for new files
  useEffect(() => {
    if (!consultation) return;

    const channel = supabase
      .channel('telemedizin_files_changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'telemedizin_files',
          filter: `consultation_id=eq.${consultation.id}` 
        }, 
        (payload) => {
          // Only add the file if it wasn't uploaded by the current user
          if (payload.new.uploader_id !== user?.id) {
            setFiles(prev => [payload.new as unknown as TelemedizinFile, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultation, user]);

  // Add double-check for video elements after streams are set
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      console.log('🔍 Double-checking local video reference');
      localVideoRef.current.srcObject = localStream;
    }
    
    if (remoteStream && remoteVideoRef.current) {
      console.log('🔍 Double-checking remote video reference');
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !consultation || !user) {
      return;
    }
    
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
          uploader_id: user.id,
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
  
  // Camera zoom control
  const handleZoom = (direction: 'in' | 'out') => {
    if (!localStream) return;
    
    try {
      const videoTrack = localStream.getVideoTracks()[0];
      
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities() as any;
        const settings = videoTrack.getSettings() as any;
        
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
          
          // Use type assertion for the constraints
          videoTrack.applyConstraints({
            advanced: [{ zoom: newZoom } as any]
          });
          
          setZoomLevel(newZoom);
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
      // Stop all tracks in the current stream
      localStream.getTracks().forEach(track => track.stop());
      
      // Request a new stream with the opposite facing mode
      const newFacingMode = isWideAngle ? "user" : "environment";
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newFacingMode
        },
        audio: true
      });
      
      // Replace tracks in the peer connection
      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        
        for (const sender of senders) {
          if (sender.track?.kind === 'video') {
            const newVideoTrack = newStream.getVideoTracks()[0];
            await sender.replaceTrack(newVideoTrack);
          }
        }
      }
      
      // Update local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }
      
      setLocalStream(newStream);
      setIsWideAngle(!isWideAngle);
    } catch (error) {
      console.error("Error toggling camera mode:", error);
      toast({
        title: "Fehler",
        description: "Kamera konnte nicht umgeschaltet werden.",
        variant: "destructive",
      });
    }
  };

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
                ref={(el) => {
                  remoteVideoRef.current = el;
                  if (el && remoteStream) {
                    console.log('🖥️ Setting remote video stream (inline ref)');
                    el.srcObject = remoteStream;
                  }
                }}
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
                  ref={(el) => {
                    localVideoRef.current = el;
                    if (el && localStream) {
                      console.log('🖥️ Setting local video stream (inline ref)');
                      el.srcObject = localStream;
                    }
                  }}
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
              
              {/* Camera control buttons */}
              {isConnected && cameraCapabilities.hasZoom && (
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
              {isConnected && cameraCapabilities.hasWideAngle && (
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
                  })}
                </>
              )}
              
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
              
              <div ref={messagesEndRef} />
            </div>
            
            <div className="border-t p-3">
              <form 
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
              >
                <div className="flex">
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
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsultationRoom;
