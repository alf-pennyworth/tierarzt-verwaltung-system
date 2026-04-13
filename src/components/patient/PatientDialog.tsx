import { useState } from "react";
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
import { UserPlus, Pencil } from "lucide-react";

interface Owner {
  id: string;
  name: string;
}

interface Patient {
  id: string;
  name: string;
  spezies: string;
  rasse: string | null;
  geburtsdatum: string | null;
  besitzer_id: string;
}

interface PatientDialogProps {
  patientId?: string;
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

const PatientDialog = ({ 
  patientId,
  ownerId, 
  onSuccess, 
  buttonVariant = "default", 
  buttonSize = "default" 
}: PatientDialogProps) => {
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
    if (patientId) {
      const fetchPatient = async () => {
        setLoading(true);
        const { data } = await supabase.from("patient").select("*").eq("id", patientId).single();
        if (data) {
          form.reset({
            name: data.name,
            spezies: data.spezies,
            rasse: data.rasse || "",
            geburtsdatum: data.geburtsdatum || "",
            besitzer_id: data.besitzer_id,
          });
        }
        setLoading(false);
      };
      fetchPatient();
    } else if (ownerId) {
      form.setValue("besitzer_id", ownerId);
    }
  }, [patientId, ownerId, form]);

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
      } finally {
        setLoading(false);
      }
    };

    if (open && !patientId) {
      fetchOwners();
    }
  }, [open, userInfo?.praxisId, toast, patientId]);

  const onSubmit = async (data: FormData) => {
    if (!userInfo?.praxisId) return;

    try {
      if (patientId) {
        const { error } = await supabase.from("patient").update({
          name: data.name,
          spezies: data.spezies,
          rasse: data.rasse || null,
          geburtsdatum: data.geburtsdatum || null,
          besitzer_id: data.besitzer_id,
        }).eq("id", patientId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("patient").insert({
          name: data.name,
          spezies: data.spezies,
          rasse: data.rasse || null,
          geburtsdatum: data.geburtsdatum || null,
          besitzer_id: data.besitzer_id,
          praxis_id: userInfo.praxisId,
        });
        if (error) throw error;
      }

      toast({
        title: patientId ? "Patient aktualisiert" : "Patient hinzugefügt",
        description: `${data.name} wurde erfolgreich gespeichert.`,
      });

      setOpen(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Aktion konnte nicht ausgeführt werden.",
      });
    }
  };

  const speziesOptions = ["Hund", "Katze", "Pferd", "Vogel", "Kaninchen", "Meerschweinchen", "Reptil", "Sonstiges"];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize}>
          {patientId ? <Pencil className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
          {patientId ? "Bearbeiten" : "Patient hinzufügen"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{patientId ? "Patient bearbeiten" : "Neuen Patienten anlegen"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl><Input placeholder="Name des Tieres" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="spezies" render={({ field }) => (
              <FormItem>
                <FormLabel>Spezies</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Spezies auswählen" /></SelectTrigger></FormControl>
                  <SelectContent>{speziesOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="rasse" render={({ field }) => (
              <FormItem>
                <FormLabel>Rasse (optional)</FormLabel>
                <FormControl><Input placeholder="Rasse" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="geburtsdatum" render={({ field }) => (
              <FormItem>
                <FormLabel>Geburtsdatum (optional)</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {!patientId && (
              <FormField control={form.control} name="besitzer_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Besitzer</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Besitzer auswählen" /></SelectTrigger></FormControl>
                    <SelectContent>{owners.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
              <Button type="submit">Speichern</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PatientDialog;
