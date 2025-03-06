
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const InviteVetForm = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { userInfo } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userInfo?.isAdmin || !userInfo?.praxisId || !userInfo?.praxisName) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Sie haben nicht die Berechtigung, Einladungen zu senden.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate invite via RPC function
      const { data, error } = await supabase.rpc('create_invite', {
        email_param: email,
        praxis_id_param: userInfo.praxisId,
        praxis_name_param: userInfo.praxisName
      });

      if (error) throw error;

      toast({
        title: "Einladung gesendet",
        description: `Eine Einladung wurde an ${email} gesendet.`,
      });

      setEmail("");

      // Display the registration link that would normally be sent by email
      const inviteUrl = `${window.location.origin}/auth?token=${data.token}`;
      
      toast({
        title: "Einladungslink (für Testzwecke)",
        description: (
          <div className="mt-2 p-2 bg-slate-100 rounded text-xs break-all">
            <a 
              href={inviteUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="text-blue-600 hover:underline"
            >
              {inviteUrl}
            </a>
          </div>
        ),
        duration: 10000,
      });
    } catch (error: any) {
      console.error("Error sending invite:", error);
      toast({
        variant: "destructive",
        title: "Fehler beim Senden der Einladung",
        description: error.message || "Ein unbekannter Fehler ist aufgetreten.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="invite-email">E-Mail des Tierarztes</Label>
        <div className="flex gap-2">
          <Input
            id="invite-email"
            type="email"
            placeholder="tierarzt@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1"
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Einladen
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default InviteVetForm;
