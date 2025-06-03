import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { VideoConsultation, Message, TelemedizinFile } from "@/types/telemedizin";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  MessageSquare, 
  Paperclip,
  Send,
  PhoneOff,
  Download,
  File,
  FileText,
  Image as ImageIcon
} from "lucide-react";
import { format } from "date-fns";

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

  // Get the ID of the other participant in the consultation
  const getOtherParticipantId = () => {
    if (!consultation || !user) return null;
    
    return user.id === consultation.doctor.id ? consultation.patient.id : consultation.doctor.id;
  };

  // Send message
  const sendMessage = async (messageContent?: string, fileId?: string) => {
    const content = messageContent || newMessage;
    if ((!content.trim() && !fileId) || !consultation || !user) return;

    try {
      let recipientId: string;
      
      if (userInfo?.isAdmin || user.id === consultation.doctor.id) {
        const { data: patientData, error: patientError } = await supabase
          .from('patient')
          .select('besitzer:besitzer_id(auth_id)')
          .eq('id', consultation.patient.id)
          .single();
          
        if (patientError || !patientData?.besitzer?.auth_id) {
          console.error("Error getting owner auth_id:", patientError);
          toast({
            title: "Fehler",
            description: "Empfänger konnte nicht gefunden werden.",
            variant: "destructive",
          });
          return;
        }
        
        recipientId = patientData.besitzer.auth_id;
      } else {
        recipientId = consultation.doctor.id;
      }

      const messageData: any = {
        consultation_id: consultation.id,
        sender_id: user.id,
        recipient_id: recipientId,
        content: content.trim()
      };
      
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
      
      toast({
        title: "Erfolg",
        description: "Nachricht wurde gesendet.",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Fehler",
        description: "Beim Senden der Nachricht ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
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

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !consultation || !user) {
      return;
    }
    
    const filesArray = Array.from(event.target.files);
    
    for (const file of filesArray) {
      const uploadId = Math.random().toString(36).substring(2, 15);
      
      setUploadingFiles(prev => [
        ...prev,
        {
          name: file.name,
          progress: 0,
          id: uploadId
        }
      ]);
      
      try {
        const storagePath = `telemedizin/${consultation.id}/${Date.now()}_${file.name}`;
        
        const { data: storageData, error: storageError } = await supabase
          .storage
          .from('telemedizin-files')
          .upload(storagePath, file, {
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
          console.error("Error uploading file to storage:", storageError);
          toast({
            title: "Fehler",
            description: "Datei konnte nicht hochgeladen werden.",
            variant: "destructive",
          });
          setUploadingFiles(prev => prev.filter(item => item.id !== uploadId));
          continue;
        }
        
        const fileData = {
          consultation_id: consultation.id,
          uploader_id: user.id,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: storagePath
        };
        
        const { data: metadataData, error: metadataError } = await supabase
          .from('telemedizin_files')
          .insert(fileData)
          .select()
          .single();
          
        if (metadataError) {
          console.error("Error storing file metadata:", metadataError);
          await supabase
            .storage
            .from('telemedizin-files')
            .remove([storagePath]);
          toast({
            title: "Fehler",
            description: "Datei-Metadaten konnten nicht gespeichert werden.",
            variant: "destructive",
          });
          setUploadingFiles(prev => prev.filter(item => item.id !== uploadId));
          continue;
        }
        
        setFiles(prev => [metadataData as unknown as TelemedizinFile, ...prev]);
        await sendMessage(`Datei hochgeladen: ${file.name}`, metadataData.id);
        
        toast({
          title: "Erfolg",
          description: "Datei wurde hochgeladen.",
        });
      } catch (error) {
        console.error("Error in file upload process:", error);
        toast({
          title: "Fehler",
          description: "Beim Hochladen der Datei ist ein Fehler aufgetreten.",
          variant: "destructive",
        });
      } finally {
        setUploadingFiles(prev => prev.filter(item => item.id !== uploadId));
      }
    }
    
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
            onClick={() => navigate("/telemedizin")}
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
            </div>
            
            <div className="flex justify-center items-center space-x-4 mt-4">
              <Button 
                variant={isVideoEnabled ? "default" : "outline"} 
                size="icon"
                className="rounded-full h-12 w-12"
                onClick={() => {
                  if (localStream) {
                    localStream.getVideoTracks().forEach(track => {
                      track.enabled = !isVideoEnabled;
                    });
                    setIsVideoEnabled(!isVideoEnabled);
                  }
                }}
              >
                {isVideoEnabled ? <Video /> : <VideoOff />}
              </Button>
              <Button 
                variant={isAudioEnabled ? "default" : "outline"} 
                size="icon"
                className="rounded-full h-12 w-12"
                onClick={() => {
                  if (localStream) {
                    localStream.getAudioTracks().forEach(track => {
                      track.enabled = !isAudioEnabled;
                    });
                    setIsAudioEnabled(!isAudioEnabled);
                  }
                }}
              >
                {isAudioEnabled ? <Mic /> : <MicOff />}
              </Button>
              <Button 
                variant="destructive" 
                size="icon"
                className="rounded-full h-12 w-12"
                onClick={() => {
                  if (consultation) {
                    supabase
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
                  navigate("/telemedizin");
                }}
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
