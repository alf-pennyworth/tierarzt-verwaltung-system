
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "./ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Loader2, Copy, Check } from "lucide-react";

interface InviteVetFormProps {
  praxisId: string;
  praxisName: string;
}

const InviteVetForm = ({ praxisId, praxisName }: InviteVetFormProps) => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const generateToken = () => {
    // Generate a random token
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return token;
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = generateToken();
      const { error } = await supabase
        .from('invites')
        .insert([
          {
            email,
            token,
            praxis_id: praxisId,
            praxis_name: praxisName,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days expiry
          },
        ]);

      if (error) {
        throw error;
      }

      // Generate the invite link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/auth?token=${token}`;
      setInviteLink(link);

      toast({
        title: "Einladung erstellt",
        description: "Sie können den Link kopieren und an den Tierarzt senden.",
      });

      // Reset the form
      setEmail("");
    } catch (error: any) {
      console.error("Error creating invite:", error);
      toast({
        variant: "destructive",
        title: "Fehler beim Erstellen der Einladung",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      
      toast({
        title: "Link kopiert",
        description: "Der Einladungslink wurde in die Zwischenablage kopiert.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tierarzt einladen</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail-Adresse</Label>
            <Input
              id="email"
              type="email"
              placeholder="tierarzt@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird erstellt...
              </>
            ) : (
              "Einladung erstellen"
            )}
          </Button>
        </form>

        {inviteLink && (
          <div className="mt-6 space-y-2">
            <Label>Einladungslink</Label>
            <div className="flex">
              <Input value={inviteLink} readOnly className="rounded-r-none" />
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-l-none border-l-0"
                onClick={copyToClipboard}
              >
                {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Dieser Link ist 7 Tage gültig. Teilen Sie ihn nur mit dem eingeladenen Tierarzt.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InviteVetForm;
