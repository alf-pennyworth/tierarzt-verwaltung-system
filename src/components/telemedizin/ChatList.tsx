
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { MessageSquareText, User } from "lucide-react";
import { Message } from "@/types/telemedizin";

interface ChatGroup {
  participantId: string;
  participantName: string;
  lastMessage: Message;
  unreadCount: number;
}

const ChatList = () => {
  const [chats, setChats] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchChats = async () => {
      try {
        if (!user) return;
        
        // Using the Supabase client with explicit typing
        const { data: sentMessages, error: sentError } = await supabase
          .from('telemedizin_messages')
          .select(`
            id,
            sender_id,
            recipient_id,
            content,
            created_at,
            is_read,
            sender:sender_id(vorname, nachname),
            recipient:recipient_id(vorname, nachname)
          `)
          .eq("sender_id", user.id)
          .order("created_at", { ascending: false });

        const { data: receivedMessages, error: receivedError } = await supabase
          .from('telemedizin_messages')
          .select(`
            id,
            sender_id,
            recipient_id,
            content,
            created_at,
            is_read,
            sender:sender_id(vorname, nachname),
            recipient:recipient_id(vorname, nachname)
          `)
          .eq("recipient_id", user.id)
          .order("created_at", { ascending: false });

        if (sentError || receivedError) {
          console.error("Error fetching messages:", sentError || receivedError);
          toast({
            title: "Fehler",
            description: "Die Nachrichten konnten nicht geladen werden.",
            variant: "destructive",
          });
          return;
        }

        // Combine and organize messages by participant
        const allMessages = [...(sentMessages || []), ...(receivedMessages || [])];
        const chatGroups = new Map<string, ChatGroup>();

        allMessages.forEach(message => {
          // Type assertion to help TypeScript recognize message as Message type
          const typedMessage = message as unknown as Message;
          
          const isUserSender = typedMessage.sender_id === user.id;
          const participantId = isUserSender ? typedMessage.recipient_id : typedMessage.sender_id;
          
          const senderData = typedMessage.sender || { vorname: "", nachname: "" };
          const recipientData = typedMessage.recipient || { vorname: "", nachname: "" };
          
          const participantName = isUserSender 
            ? `${recipientData.vorname} ${recipientData.nachname}`
            : `${senderData.vorname} ${senderData.nachname}`;
          
          if (!chatGroups.has(participantId)) {
            chatGroups.set(participantId, {
              participantId,
              participantName,
              lastMessage: typedMessage,
              unreadCount: (typedMessage.recipient_id === user.id && !typedMessage.is_read) ? 1 : 0
            });
          } else {
            const group = chatGroups.get(participantId)!;
            
            // Update last message if this message is newer
            if (new Date(typedMessage.created_at) > new Date(group.lastMessage.created_at)) {
              group.lastMessage = typedMessage;
            }
            
            // Update unread count
            if (typedMessage.recipient_id === user.id && !typedMessage.is_read) {
              group.unreadCount++;
            }
          }
        });

        // Convert Map to array and sort by last message date
        const sortedChats = Array.from(chatGroups.values())
          .sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());

        setChats(sortedChats);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();

    // Set up realtime subscription for new messages
    const channel = supabase
      .channel('telemedizin_messages_changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'telemedizin_messages',
          filter: `recipient_id=eq.${user?.id}` 
        }, 
        () => {
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const openChat = (participantId: string) => {
    // For now we'll just navigate to a dummy route - we'll implement this in the ConsultationRoom component
    navigate(`/telemedizin/chat/${participantId}`);
  };

  if (loading) {
    return <div>Laden...</div>;
  }

  if (chats.length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-muted-foreground">Keine Konversationen gefunden.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {chats.map((chat) => (
        <Card 
          key={chat.participantId} 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => openChat(chat.participantId)}
        >
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="bg-primary/10 rounded-full p-2">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">{chat.participantName}</h3>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(chat.lastMessage.created_at), "dd.MM. HH:mm")}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                  <span className="font-medium">
                    {chat.lastMessage.sender_id === user?.id ? "Sie: " : ""}
                  </span>
                  {chat.lastMessage.content}
                </p>
                {chat.unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    <MessageSquareText className="h-3 w-3 mr-1" />
                    {chat.unreadCount}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ChatList;
