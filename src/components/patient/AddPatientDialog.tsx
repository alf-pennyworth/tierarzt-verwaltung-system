
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";

interface Owner {
  id: string;
  name: string;
}

interface AddPatientDialogProps {
  ownerId?: string;
  onSuccess?: () => void;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link";
  buttonSize?: "default" | "sm" | "lg" | "icon";
}

const formSchema = z.object({
  name: z.string().min(2, { message: "Name muss mindestens 2 Zeichen lang sein" }),
  spezies: z.string().min(1, { message: "Spezies ist erforderlich" }),
  rasse: z.string().optional(),
  geburtsdatum: z.string().optional(),
  besitzer_id: z.string().min(1, { message: "Besitzer ist erforderlich" }),
});

type FormData = z.infer<typeof formSchema>;

const AddPatientDialog = ({ 
  ownerId, 
  onSuccess, 
  buttonVariant = "default", 
  buttonSize = "default" 
}: AddPatientDialogProps) => {
  const [open, setOpen] = useState(false);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { userInfo } = useAuth();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      spezies: "",
      rasse: "",
      geburtsdatum: "",
      besitzer_id: ownerId || "",
    },
  });

  useEffect(() => {
    // If an ownerId was provided as prop, set it in the form
    if (ownerId) {
      form.setValue("besitzer_id", ownerId);
    }
  }, [ownerId, form]);

  useEffect(() => {
    const fetchOwners = async () => {
      if (!userInfo?.praxisId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("besitzer")
          .select("id, name")
          .eq("praxis_id", userInfo.praxisId)
          .is("deleted_at", null)
          .order("name");

        if (error) throw error;
        setOwners(data || []);
      } catch (error) {
        console.error("Error fetching owners:", error);
        toast({
          variant: "destructive",
          title: "Fehler",
          description: "Besitzer konnten nicht geladen werden.",
        });
      } finally {
        setLoading(false);
      }
    };

    if (open && !ownerId) {
      fetchOwners();
    }
  }, [open, userInfo?.praxisId, toast, ownerId]);

  const onSubmit = async (data: FormData) => {
    if (!userInfo?.praxisId) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Praxis-ID nicht gefunden.",
      });
      return;
    }

    try {
      const { error } = await supabase.from("patient").insert({
        name: data.name,
        spezies: data.spezies,
        rasse: data.rasse || null,
        geburtsdatum: data.geburtsdatum || null,
        besitzer_id: data.besitzer_id,
        praxis_id: userInfo.praxisId,
      });

      if (error) throw error;

      toast({
        title: "Patient hinzugefügt",
        description: `${data.name} wurde erfolgreich angelegt.`,
      });

      form.reset();
      setOpen(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error adding patient:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Patient konnte nicht hinzugefügt werden. Bitte versuchen Sie es erneut.",
      });
    }
  };

  const speziesOptions = [
    "Hund",
    "Katze",
    "Pferd",
    "Vogel",
    "Kaninchen",
    "Meerschweinchen",
    "Reptil",
    "Sonstiges"
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize}>
          <UserPlus className="mr-2 h-4 w-4" />
          Patient hinzufügen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Neuen Patienten anlegen</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Name des Tieres" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="spezies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Spezies</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Spezies auswählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {speziesOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rasse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rasse (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Rasse" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="geburtsdatum"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geburtsdatum (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!ownerId && (
              <FormField
                control={form.control}
                name="besitzer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Besitzer</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={loading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Besitzer auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {owners.map((owner) => (
                          <SelectItem key={owner.id} value={owner.id}>
                            {owner.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Abbrechen
              </Button>
              <Button type="submit">Patient anlegen</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPatientDialog;
