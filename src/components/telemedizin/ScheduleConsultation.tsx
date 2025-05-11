
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Calendar, ArrowLeft, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addHours, parse, isValid } from "date-fns";
import { de } from "date-fns/locale";

interface Patient {
  id: string;
  name: string;
  spezies: string;
  rasse: string | null;
  besitzer: {
    name: string;
  };
}

// Generate time slots every 5 minutes from 00:00 to 23:55
const timeSlots = [];
for (let hour = 0; hour < 24; hour++) {
  for (let minute = 0; minute < 60; minute += 5) {
    const formattedHour = hour.toString().padStart(2, '0');
    const formattedMinute = minute.toString().padStart(2, '0');
    timeSlots.push(`${formattedHour}:${formattedMinute}`);
  }
}

const formSchema = z.object({
  patientId: z.string({
    required_error: "Patient muss ausgewählt werden",
  }),
  title: z.string().min(5, {
    message: "Titel muss mindestens 5 Zeichen lang sein",
  }),
  description: z.string().optional(),
  date: z.string({
    required_error: "Datum muss ausgewählt werden",
  }),
  time: z.string({
    required_error: "Uhrzeit muss ausgewählt werden",
  }),
  durationMinutes: z.string().default("30"),
});

const ScheduleConsultation = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, userInfo } = useAuth();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      date: format(new Date(), "yyyy-MM-dd"),
      time: "09:00",
      durationMinutes: "30",
    },
  });

  useEffect(() => {
    const fetchPatients = async () => {
      if (!userInfo?.praxisId) return;

      const { data, error } = await supabase
        .from("patient")
        .select(`
          id,
          name,
          spezies,
          rasse,
          besitzer (
            name
          )
        `)
        .eq("praxis_id", userInfo.praxisId)
        .is("deleted_at", null);

      if (error) {
        console.error("Error fetching patients:", error);
        toast({
          title: "Fehler",
          description: "Die Patienten konnten nicht geladen werden.",
          variant: "destructive",
        });
        return;
      }

      setPatients(data || []);
    };

    fetchPatients();
  }, [userInfo]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      
      if (!user || !userInfo?.praxisId) {
        toast({
          title: "Fehler",
          description: "Sie müssen angemeldet sein, um eine Konsultation zu planen.",
          variant: "destructive",
        });
        return;
      }

      // Parse date and time
      const dateTimeString = `${values.date}T${values.time}:00`;
      const startDateTime = new Date(dateTimeString);
      
      if (!isValid(startDateTime)) {
        toast({
          title: "Fehler",
          description: "Ungültiges Datum oder Uhrzeit.",
          variant: "destructive",
        });
        return;
      }

      // Calculate end time based on duration
      const durationMinutes = parseInt(values.durationMinutes);
      const endDateTime = addHours(startDateTime, durationMinutes / 60);

      // Generate a random room ID
      const roomId = Math.random().toString(36).substring(2, 15);

      // Add owner_invited: true so it appears automatically in the owner's dashboard
      const { data, error } = await supabase
        .from('video_consultations')
        .insert({
          patient_id: values.patientId,
          doctor_id: user.id,
          praxis_id: userInfo.praxisId,
          title: values.title,
          description: values.description || "",
          scheduled_start: startDateTime.toISOString(),
          scheduled_end: endDateTime.toISOString(),
          room_id: roomId,
          owner_invited: true // Automatically mark as invited
        })
        .select()
        .single();

      if (error) {
        console.error("Error scheduling consultation:", error);
        toast({
          title: "Fehler",
          description: "Die Konsultation konnte nicht geplant werden.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Erfolg",
        description: "Die Video-Konsultation wurde erfolgreich geplant.",
      });

      navigate("/telemedizin");
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Fehler",
        description: "Es ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container p-4 space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Button variant="outline" size="icon" onClick={() => navigate("/telemedizin")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Video-Konsultation planen</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Neue Video-Konsultation</CardTitle>
          <CardDescription>
            Planen Sie einen Video-Termin mit einem Patienten
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                          <SelectValue placeholder="Patienten auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.name} ({patient.besitzer.name})
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
                      <Input 
                        placeholder="z.B. Nachkontrolle Impfung" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung (optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Fügen Sie zusätzliche Informationen zur Konsultation hinzu"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Datum</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type="date" 
                            {...field}
                          />
                          <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        </div>
                      </FormControl>
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
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <div className="relative">
                            <SelectTrigger>
                              <SelectValue placeholder="Uhrzeit wählen" />
                            </SelectTrigger>
                            <Clock className="absolute right-8 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          </div>
                        </FormControl>
                        <SelectContent className="h-[300px]">
                          {timeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time} Uhr
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dauer</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Dauer wählen" />
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
              
              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Konsultation planen
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScheduleConsultation;
