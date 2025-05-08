
import { useState } from "react";
import { Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createOwnerInvitation, generateInvitationLink, copyToClipboard } from "./utils/inviteUtils";
import InviteForm from "./InviteForm";
import InvitationSuccess from "./InvitationSuccess";

interface SendOwnerInviteProps {
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
}

const SendOwnerInvite = ({ ownerId, ownerEmail, ownerName }: SendOwnerInviteProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (values: { message?: string }) => {
    setLoading(true);
    try {
      const inviteResponse = await createOwnerInvitation(ownerId);
      
      if (inviteResponse && inviteResponse.token) {
        const registrationUrl = generateInvitationLink(inviteResponse.token);
        setInviteLink(registrationUrl);
        setSuccess(true);
        toast({
          title: "Einladung erstellt",
          description: `Einladung für ${ownerEmail} wurde erfolgreich erstellt.`,
        });
      } else {
        throw new Error("Token not found in response");
      }
    } catch (error: any) {
      console.error("Error sending invite:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message || "Es ist ein Fehler aufgetreten.",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setSuccess(false);
    setInviteLink("");
    setOpen(false);
  };

  const handleCopyToClipboard = () => {
    if (copyToClipboard(inviteLink)) {
      toast({
        title: "Link kopiert",
        description: "Einladungslink wurde in die Zwischenablage kopiert.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      setOpen(value);
      if (!value) {
        setSuccess(false);
        setInviteLink("");
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Send className="mr-2 h-4 w-4" />
          Einladung senden
        </Button>
      </DialogTrigger>
      <DialogContent>
        {!success ? (
          <>
            <DialogHeader>
              <DialogTitle>Einladung an Besitzer erstellen</DialogTitle>
              <DialogDescription>
                Erstellen Sie eine Einladung für {ownerName} ({ownerEmail}), um sich im Portalsystem zu registrieren.
              </DialogDescription>
            </DialogHeader>
            
            <InviteForm 
              onSubmit={handleSubmit} 
              loading={loading}
              ownerName={ownerName}
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Einladung erstellt</DialogTitle>
              <DialogDescription>
                Die Einladung wurde erfolgreich für {ownerEmail} erstellt. Da das E-Mail-System noch nicht konfiguriert ist, können Sie den Einladungslink direkt hier kopieren und dem Besitzer mitteilen.
              </DialogDescription>
            </DialogHeader>
            
            <InvitationSuccess 
              inviteLink={inviteLink} 
              onCopyLink={handleCopyToClipboard}
              onClose={resetAndClose}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SendOwnerInvite;
