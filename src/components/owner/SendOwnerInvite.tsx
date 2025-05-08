
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from "lucide-react";

// Define the invitation response type
interface OwnerInviteResponse {
  success: boolean;
  token: string;
  owner_id: string;
  owner_email: string;
  owner_name: string;
}

// Define the form schema
const inviteFormSchema = z.object({
  message: z.string().optional(),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

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

  // Create form with validation
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      message: `Sehr geehrte(r) ${ownerName},\n\nwir laden Sie ein, sich im Portal unserer Tierarztpraxis zu registrieren.\n\nMit freundlichen Grüßen,\nIhr Praxisteam`,
    },
  });

  const onSubmit = async (values: InviteFormValues) => {
    setLoading(true);
    try {
      // Call the RPC function to generate an invitation
      const { data, error } = await supabase.rpc('invite_owner', {
        besitzer_id: ownerId,
        clinic_user_id: null // This can be updated if needed
      });

      if (error) throw error;

      // Create a registration link from the token
      if (data && typeof data === 'object') {
        // First cast to unknown, then to the expected type to avoid TypeScript error
        const inviteResponse = data as unknown as OwnerInviteResponse;
        
        if (inviteResponse.token) {
          const baseUrl = window.location.origin;
          const registrationUrl = `${baseUrl}/auth?token=${inviteResponse.token}&type=owner-invitation`;
          setInviteLink(registrationUrl);
          setSuccess(true);
          toast({
            title: "Einladung erstellt",
            description: `Einladung für ${ownerEmail} wurde erfolgreich erstellt.`,
          });
        } else {
          throw new Error("Token not found in response");
        }
      } else {
        throw new Error("Invalid response format");
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
    form.reset();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: "Link kopiert",
      description: "Einladungslink wurde in die Zwischenablage kopiert.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      setOpen(value);
      if (!value) {
        setSuccess(false);
        setInviteLink("");
        form.reset();
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

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea 
                          rows={6} 
                          placeholder="Einladungsnachricht" 
                          className="resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Wird erstellt...
                      </>
                    ) : (
                      "Einladung erstellen"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Einladung erstellt</DialogTitle>
              <DialogDescription>
                Die Einladung wurde erfolgreich für {ownerEmail} erstellt. Da das E-Mail-System noch nicht konfiguriert ist, können Sie den Einladungslink direkt hier kopieren und dem Besitzer mitteilen.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center py-4 space-y-4">
              <div className="rounded-full bg-green-100 p-3">
                <Send className="h-6 w-6 text-green-600" />
              </div>
              
              <div className="w-full">
                <div className="text-sm text-muted-foreground mb-2">Einladungslink:</div>
                <div className="flex gap-2">
                  <Input 
                    value={inviteLink} 
                    readOnly 
                    className="w-full font-mono text-xs"
                  />
                  <Button onClick={copyToClipboard} size="sm">
                    Kopieren
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={resetAndClose}>Schließen</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SendOwnerInvite;
