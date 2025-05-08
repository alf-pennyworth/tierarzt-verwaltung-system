
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
import { Loader2, Send } from "lucide-react";

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
      
      setSuccess(true);
      toast({
        title: "Einladung gesendet",
        description: `Einladung an ${ownerEmail} wurde erfolgreich erstellt.`,
      });
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
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      setOpen(value);
      if (!value) {
        setSuccess(false);
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
              <DialogTitle>Einladung an Besitzer senden</DialogTitle>
              <DialogDescription>
                Senden Sie eine Einladung an {ownerName} ({ownerEmail}), um sich im Portalsystem zu registrieren.
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
                        Wird gesendet...
                      </>
                    ) : (
                      "Einladung senden"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Einladung gesendet</DialogTitle>
              <DialogDescription>
                Die Einladung wurde erfolgreich an {ownerEmail} erstellt.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-6">
              <div className="rounded-full bg-green-100 p-3">
                <Send className="h-6 w-6 text-green-600" />
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
