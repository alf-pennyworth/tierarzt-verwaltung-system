
import { useState, useEffect } from "react";
import { format, addMinutes } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Appointment } from "@/types/appointments";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Patient {
  id: string;
  name: string;
  spezies: string;
  rasse: string | null;
}

const formSchema = z.object({
  patientId: z.string({
    required_error: "Bitte Patient auswählen",
  }),
  title: z.string().min(2, {
    message: "Titel muss mindestens 2 Zeichen lang sein",
  }),
  date: z.date({
    required_error: "Bitte Datum auswählen",
  }),
  time: z.string().regex(/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Zeit im Format HH:MM",
  }),
  duration: z.enum(["15", "30", "45", "60"], {
    required_error: "Bitte Dauer auswählen",
  }),
  description: z.string().optional(),
});

interface AppointmentFormProps {
  onAppointmentCreated: (appointment: Appointment) => void;
}

const AppointmentForm = ({ onAppointmentCreated }: AppointmentFormProps) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(null);
  const { userInfo, user } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      time: "09:00",
      duration: "30",
      description: "",
    },
  });

  useEffect(() => {
    // Fetch and display user details for debugging
    const fetchUserDetails = async () => {
      if (!user) return;
      
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError) throw profileError;
        
        setUserDetails({
          userId: user.id,
          userEmail: user.email,
          profile: profileData,
        });
      } catch (error) {
        console.error("Error fetching user details:", error);
      }
    };
    
    fetchUserDetails();
  }, [user]);

  useEffect(() => {
    const fetchPatients = async () => {
      if (!userInfo?.praxisId) {
        console.log("No praxis ID available, skipping patient fetch");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("patient")
          .select("id, name, spezies, rasse")
          .eq("praxis_id", userInfo.praxisId)
          .is("deleted_at", null)
          .order("name");

        if (error) throw error;
        setPatients(data || []);
      } catch (error) {
        console.error("Error fetching patients:", error);
        toast({
          variant: "destructive",
          title: "Fehler",
          description: "Patienten konnten nicht geladen werden.",
        });
      }
    };

    fetchPatients();
  }, [userInfo?.praxisId, toast]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userInfo?.praxisId || !user?.id) {
      setErrorDetails(JSON.stringify({ 
        error: "User not authenticated properly",
        userInfo: userInfo,
        userId: user?.id
      }, null, 2));
      setShowErrorDialog(true);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Benutzer nicht identifiziert.",
      });
      return;
    }

    setIsLoading(true);
    setErrorDetails(null);
    
    try {
      // Combine date and time
      const [hours, minutes] = values.time.split(':').map(Number);
      const startTime = new Date(values.date);
      startTime.setHours(hours, minutes, 0, 0);
      
      // Calculate end time based on duration
      const durationMinutes = parseInt(values.duration, 10);
      const endTime = addMinutes(startTime, durationMinutes);

      const newAppointment = {
        praxis_id: userInfo.praxisId,
        patient_id: values.patientId,
        title: values.title,
        description: values.description || "",
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        created_by: user.id,
      };

      console.log("Creating appointment with data:", newAppointment);
      
      // Use type assertion to tell TypeScript that this is a valid table
      const { data, error } = await supabase
        .from("appointments" as any)
        .insert(newAppointment)
        .select(`
          id, 
          start_time, 
          end_time, 
          title,
          description,
          patient_id,
          patient:patient_id (
            id,
            name,
            spezies,
            rasse
          )
        `)
        .single();

      if (error) {
        console.error("Error details:", error);
        setErrorDetails(JSON.stringify({
          error,
          userDetails: userDetails,
          appointmentData: newAppointment
        }, null, 2));
        throw error;
      }

      toast({
        title: "Termin erstellt",
        description: `Termin für ${format(startTime, "dd.MM.yyyy HH:mm")} wurde erstellt.`,
      });

      // First convert to unknown, then to Appointment to satisfy TypeScript
      onAppointmentCreated((data as unknown) as Appointment);
      form.reset({
        title: "",
        time: "09:00",
        duration: "30",
        description: "",
      });
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      setShowErrorDialog(true);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Termin konnte nicht erstellt werden.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="patientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Patient</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Patient auswählen" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name} {patient.rasse ? `(${patient.rasse})` : `(${patient.spezies})`}
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
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Titel</FormLabel>
                <FormControl>
                  <Input placeholder="z.B. Routineuntersuchung" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Datum</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd.MM.yyyy")
                          ) : (
                            <span>Datum auswählen</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Uhrzeit</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-10" placeholder="HH:MM" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dauer</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Dauer auswählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="15">15 Minuten</SelectItem>
                      <SelectItem value="30">30 Minuten</SelectItem>
                      <SelectItem value="45">45 Minuten</SelectItem>
                      <SelectItem value="60">60 Minuten</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Beschreibung</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Weitere Informationen zum Termin"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Wird gespeichert..." : "Termin erstellen"}
          </Button>
        </form>
      </Form>

      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fehlerdetails</DialogTitle>
          </DialogHeader>
          <div className="bg-secondary p-4 rounded-md max-h-96 overflow-auto">
            <pre className="whitespace-pre-wrap text-xs">{errorDetails}</pre>
          </div>
          <div className="bg-muted p-3 rounded-md mt-2">
            <h4 className="font-semibold mb-2">Benutzerdetails</h4>
            <pre className="whitespace-pre-wrap text-xs">{userDetails ? JSON.stringify(userDetails, null, 2) : "Keine Benutzerdetails verfügbar"}</pre>
          </div>
          <p className="text-sm text-muted-foreground">
            Diese Informationen können für die Fehlerbehebung hilfreich sein. Möglicherweise gibt es ein Problem mit der Datenbank-Konfiguration oder den Berechtigungen.
          </p>
          <Button onClick={() => setShowErrorDialog(false)} className="w-full">
            Schließen
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AppointmentForm;
