
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Define the form schema
const inviteFormSchema = z.object({
  ownerId: z.string().min(1, "Bitte wählen Sie einen Besitzer aus."),
  sendEmail: z.boolean().default(false),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

type JsonResponse = {
  [key: string]: any;
} | null;

interface SendOwnerInviteProps {
  ownerId?: string;
  ownerEmail?: string;
  ownerName?: string;
}

export const SendOwnerInvite = ({ ownerId, ownerEmail, ownerName }: SendOwnerInviteProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [owners, setOwners] = useState<any[]>([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Create form with validation
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      ownerId: ownerId || "",
      sendEmail: false,
    },
  });

  // Load owners when dialog opens
  const loadOwners = async () => {
    if (owners.length > 0) return;
    
    setOwnersLoading(true);
    try {
      const { data, error } = await supabase
        .from('besitzer')
        .select('id, name, email')
        .is('auth_id', null)
        .not('email', 'is', null)
        .order('name');

      if (error) throw error;
      setOwners(data || []);
    } catch (error) {
      console.error("Error loading owners:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Besitzer konnten nicht geladen werden.",
      });
    } finally {
      setOwnersLoading(false);
    }
  };

  const onSubmit = async (values: InviteFormValues) => {
    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Sie müssen angemeldet sein, um Einladungen zu versenden.",
      });
      return;
    }
    
    setLoading(true);
    try {
      // Call the RPC function to create an owner invitation
      const { data, error } = await supabase.rpc('invite_owner', {
        besitzer_id: values.ownerId,
        clinic_user_id: user.id
      });

      if (error) {
        throw error;
      }
      
      // Convert data to correct type (JsonResponse)
      const jsonData = data as JsonResponse;
      
      if (!jsonData || jsonData.success !== true) {
        throw new Error(jsonData?.message || "Fehler beim Versenden der Einladung");
      }

      // Generate the invitation link
      const invitationUrl = `${window.location.origin}/owner?token=${jsonData.token}`;
      setInviteLink(invitationUrl);

      // If we want to send an email, we would do that here
      // Currently not implemented - would require an edge function

      toast({
        title: "Einladung erstellt",
        description: "Die Einladung wurde erfolgreich erstellt.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message || "Bei der Erstellung der Einladung ist ein Fehler aufgetreten.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Separate views for form and success state
  const InviteFormView = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="ownerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Besitzer</FormLabel>
              <Select
                disabled={ownersLoading || !!ownerId}
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue 
                      placeholder={ownersLoading ? "Besitzer werden geladen..." : "Bitte wählen Sie einen Besitzer"} 
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.name} {owner.email && `(${owner.email})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Einladung wird erstellt...
              </>
            ) : (
              "Einladung erstellen"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  const SuccessView = () => (
    <div className="space-y-4">
      <Alert>
        <AlertTitle>Einladung erstellt</AlertTitle>
        <AlertDescription>
          Die Einladung wurde erfolgreich erstellt. Bitte teilen Sie den folgenden Link mit dem Besitzer:
        </AlertDescription>
      </Alert>
      <div className="flex flex-col space-y-2">
        <FormLabel>Einladungslink</FormLabel>
        <Input 
          value={inviteLink || ""} 
          readOnly 
          onClick={(e) => {
            (e.target as HTMLInputElement).select();
            navigator.clipboard.writeText(inviteLink || "");
            toast({
              title: "Link kopiert",
              description: "Der Einladungslink wurde in die Zwischenablage kopiert.",
            });
          }}
        />
        <FormDescription>
          Klicken Sie auf den Link, um ihn in die Zwischenablage zu kopieren.
        </FormDescription>
      </div>
      <DialogFooter>
        <Button onClick={() => setOpen(false)}>Schließen</Button>
      </DialogFooter>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) {
        loadOwners();
        setInviteLink(null);
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="mr-2 h-4 w-4" />
          Einladen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Besitzer zum Portal einladen</DialogTitle>
          <DialogDescription>
            Erstellen Sie eine Einladung für einen Tierbesitzer, damit dieser sich im Portal anmelden kann.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? <SuccessView /> : <InviteFormView />}
      </DialogContent>
    </Dialog>
  );
};

export default SendOwnerInvite;
