
import { useEffect, useState } from "react";
import { format, addHours, startOfDay, endOfDay, addDays } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, PlusCircle, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Appointment } from "@/types/appointments";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AppointmentCalendarProps {
  appointments: Appointment[];
  refreshCounter: number;
}

const HOURS = Array.from({ length: 10 }, (_, i) => i + 8); // 8AM to 6PM

const AppointmentCalendar = ({ appointments, refreshCounter }: AppointmentCalendarProps) => {
  const [date, setDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [fetchedAppointments, setFetchedAppointments] = useState<Appointment[]>([]);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showDebugDialog, setShowDebugDialog] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const { toast } = useToast();
  const { userInfo, user } = useAuth();

  // Collect debug information
  useEffect(() => {
    if (user) {
      const collectDebugInfo = async () => {
        try {
          // Fetch user profile details
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id);
            
          // For RLS policies info, we need to make a custom function or handle this on the server side
          // The RPC function is not properly typed, so we'll remove that call and handle it differently
          
          setDebugInfo({
            userInfo,
            user: {
              id: user.id,
              email: user.email,
            },
            profileData,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error collecting debug info:", error);
          setDebugInfo({
            error: "Failed to collect debug info",
            userInfo,
            timestamp: new Date().toISOString(),
          });
        }
      };
      
      collectDebugInfo();
    }
  }, [user, userInfo]);

  const loadAppointments = async (selectedDate: Date) => {
    try {
      if (!userInfo?.praxisId) {
        console.log("No praxis ID available, skipping appointment fetch");
        return;
      }
      
      const startTime = startOfDay(selectedDate).toISOString();
      const endTime = endOfDay(selectedDate).toISOString();
      
      console.log("Fetching appointments for", startTime, "to", endTime);
      console.log("Praxis ID:", userInfo.praxisId);
      console.log("User info:", userInfo);

      const { data, error } = await supabase
        .from("appointments" as any)
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
        .eq("praxis_id", userInfo.praxisId)
        .gte("start_time", startTime)
        .lte("start_time", endTime)
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Error details:", error);
        setErrorDetails(JSON.stringify({
          error,
          query: {
            praxisId: userInfo.praxisId,
            startTime,
            endTime
          },
          userInfo: userInfo
        }, null, 2));
        setShowErrorDialog(true);
        throw error;
      }
      
      console.log("Fetched appointments:", data);
      // First convert to unknown, then to Appointment[] to satisfy TypeScript
      setFetchedAppointments((data as unknown) as Appointment[] || []);
    } catch (error: any) {
      console.error("Error loading appointments:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Termine konnten nicht geladen werden.",
      });
    }
  };

  useEffect(() => {
    if (userInfo?.praxisId) {
      loadAppointments(date);
    }
  }, [date, refreshCounter, userInfo?.praxisId]);

  const handlePrevDay = () => setDate(prev => addDays(prev, -1));
  const handleNextDay = () => setDate(prev => addDays(prev, 1));

  const allAppointments = [...fetchedAppointments, ...appointments];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative">
          <Button
            variant="outline"
            className="w-[240px] justify-start text-left font-normal"
            onClick={() => setCalendarOpen(true)}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(date, "PPP", { locale: de })}
          </Button>
          {calendarOpen && (
            <div className="absolute top-full left-0 z-50 mt-2 bg-white border rounded-md shadow-md">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => {
                  if (newDate) {
                    setDate(newDate);
                    setCalendarOpen(false);
                  }
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setDate(new Date())}>
            Heute
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-primary" 
            onClick={() => setShowDebugDialog(true)}
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {HOURS.map((hour) => {
          const currentHourDate = addHours(startOfDay(date), hour);
          const hourAppointments = allAppointments.filter(
            (apt) => {
              if (!apt.start_time) return false;
              const aptDate = new Date(apt.start_time);
              return aptDate.getHours() === hour;
            }
          );

          return (
            <div key={hour} className="relative">
              <div className="flex items-center py-2 border-t">
                <span className="w-16 text-sm text-muted-foreground">
                  {hour}:00
                </span>
                <div className="flex-1 min-h-[60px]">
                  {hourAppointments.length > 0 ? (
                    <div className="grid gap-1">
                      {hourAppointments.map((apt) => (
                        <Card 
                          key={apt.id}
                          className="p-2 bg-primary/10 hover:bg-primary/20 cursor-pointer transition-colors"
                        >
                          <div className="text-sm font-medium">{apt.title}</div>
                          <div className="text-xs">
                            {apt.patient?.name} - {format(new Date(apt.start_time), "HH:mm")}
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <Button 
                        variant="ghost" 
                        className="h-full w-full rounded-sm flex items-center justify-center opacity-0 hover:opacity-100 hover:bg-secondary/20"
                      >
                        <PlusCircle className="h-4 w-4 mr-1" />
                        <span className="text-xs">Termin</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fehlerdetails</DialogTitle>
          </DialogHeader>
          <div className="bg-secondary p-4 rounded-md max-h-96 overflow-auto">
            <pre className="whitespace-pre-wrap text-xs">{errorDetails}</pre>
          </div>
          <p className="text-sm text-muted-foreground">
            Diese Informationen können für die Fehlerbehebung hilfreich sein.
          </p>
          <Button onClick={() => setShowErrorDialog(false)} className="w-full">
            Schließen
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showDebugDialog} onOpenChange={setShowDebugDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Debug-Informationen</DialogTitle>
          </DialogHeader>
          <div className="bg-secondary p-4 rounded-md max-h-96 overflow-auto">
            <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
          <p className="text-sm text-muted-foreground">
            Diese Informationen können für die Fehlerbehebung der RLS-Berechtigungen hilfreich sein.
          </p>
          <Button onClick={() => setShowDebugDialog(false)} className="w-full">
            Schließen
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentCalendar;
