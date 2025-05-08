
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
import { Loader2, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";

// Define the form schema
const ownerFormSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  email: z.string().email("Gültige Email-Adresse erforderlich").optional().or(z.literal("")),
  telefonnummer: z.string().optional(),
  stadt: z.string().optional(),
  postleitzahl: z.string().optional(),
  strasse: z.string().optional(),
});

type OwnerFormValues = z.infer<typeof ownerFormSchema>;

export const AddOwnerDialog = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { userInfo } = useAuth();

  // Create form with validation
  const form = useForm<OwnerFormValues>({
    resolver: zodResolver(ownerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      telefonnummer: "",
      stadt: "",
      postleitzahl: "",
      strasse: ""
    },
  });

  const onSubmit = async (values: OwnerFormValues) => {
    if (!userInfo?.praxisId) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Praxis ID konnte nicht gefunden werden.",
      });
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('besitzer')
        .insert({
          name: values.name,
          email: values.email || null,
          telefonnummer: values.telefonnummer || null,
          stadt: values.stadt || null,
          postleitzahl: values.postleitzahl || null,
          strasse: values.strasse || null,
          praxis_id: userInfo.praxisId
        })
        .select();

      if (error) throw error;
      
      toast({
        title: "Besitzer hinzugefügt",
        description: `${values.name} wurde erfolgreich hinzugefügt.`,
      });
      
      form.reset();
      setOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message || "Es ist ein Fehler aufgetreten.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Neuer Besitzer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Neuen Besitzer hinzufügen</DialogTitle>
          <DialogDescription>
            Fügen Sie einen neuen Tierbesitzer zur Praxis-Datenbank hinzu.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name*</FormLabel>
                  <FormControl>
                    <Input placeholder="Vollständiger Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@beispiel.de" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="telefonnummer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefonnummer</FormLabel>
                  <FormControl>
                    <Input placeholder="+49 123 4567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stadt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stadt</FormLabel>
                    <FormControl>
                      <Input placeholder="Stadt" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="postleitzahl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PLZ</FormLabel>
                    <FormControl>
                      <Input placeholder="12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="strasse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Straße</FormLabel>
                  <FormControl>
                    <Input placeholder="Musterstraße 123" {...field} />
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
                    Wird hinzugefügt...
                  </>
                ) : (
                  "Besitzer hinzufügen"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddOwnerDialog;
