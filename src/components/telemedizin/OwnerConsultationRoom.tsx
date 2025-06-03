
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
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
import { Message, TelemedizinFile } from "@/types/telemedizin";

interface OwnerConsultationRoomProps {
  sessionToken: string;
  consultation: any;
  owner: any;
}

const OwnerConsultationRoom = ({ sessionToken, consultation, owner }: OwnerConsultationRoomProps) => {
  const navigate = useNavigate();
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

  // Fetch messages for this consultation
  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('telemedizin_messages')
      .select("*")
      .eq("consultation_id", consultation.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    setMessages(data as unknown as Message[]);
  };
  
  // Fetch files for this consultation
  const fetchFiles = async () => {
    const { data, error } = await supabase
      .from('telemedizin_files')
      .select("*")
      .eq("consultation_id", consultation.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching files:", error);
      return;
    }

    setFiles(data as unknown as TelemedizinFile[]);
  };

  useEffect(() => {
    fetchMessages();
    fetchFiles();
  }, [consultation.id]);

  // Send message
  const sendMessage = async (messageContent?: string, fileId?: string) => {
    const content = messageContent || newMessage;
    if ((!content.trim() && !fileId) || !consultation || !owner) return;

    try {
      const messageData: any = {
        consultation_id: consultation.id,
        sender_id: owner.auth_id,
        recipient_id: consultation.doctor.id,
        content: content.trim()
      };
      
      if (fileId) {
        messageData.file_id = fileId;
      }

      console.log("Owner sending message with data:", messageData);

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

      setMessages(prev => [...prev, data as unknown as Message]);
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

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !consultation || !owner) {
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
        
        // Upload file to storage first
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
        
        // Store file metadata
        const fileData = {
          consultation_id: consultation.id,
          uploader_id: owner.auth_id,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: storagePath
        };
        
        console.log("Owner inserting file metadata:", fileData);
        
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
          console.log("Owner received new message:", payload.new);
          if (payload.new.sender_id !== owner?.auth_id) {
            setMessages(prev => [...prev, payload.new as unknown as Message]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultation, owner]);
  
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
          console.log("Owner received new file:", payload.new);
          if (payload.new.uploader_id !== owner?.auth_id) {
            setFiles(prev => [payload.new as unknown as TelemedizinFile, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultation, owner]);

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div className="container p-0 md:p-4">
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={() => navigate("/owner")}>
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
            onClick={() => navigate("/owner")}
          >
            <PhoneOff className="h-4 w-4 mr-2" />
            Beenden
          </Button>
        </div>
        
        <div className="flex-1 flex">
          <div className="flex-1 p-4">
            <div className="relative h-full rounded-lg overflow-hidden bg-black flex items-center justify-center">
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <Video className="h-12 w-12 mb-4" />
                <p className="font-medium">Video-Konsultation</p>
                <p className="text-sm opacity-75">Video-Chat wird geladen...</p>
              </div>
            </div>
          </div>
          
          <div className="w-80 border-l bg-background flex flex-col">
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
                    const isSender = message.sender_id === owner?.auth_id;
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

export default OwnerConsultationRoom;
