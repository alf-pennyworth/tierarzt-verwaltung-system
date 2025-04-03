
import { useState } from "react";
import { Calendar, CalendarPlus, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppointmentCalendar from "@/components/appointments/AppointmentCalendar";
import AppointmentForm from "@/components/appointments/AppointmentForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Appointment } from "@/types/appointments";

const AppointmentScheduling = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const handleAppointmentCreated = (appointment: Appointment) => {
    setAppointments((prev) => [...prev, appointment]);
    setRefreshCounter((prev) => prev + 1);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Terminplanung</h1>
      
      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Kalender</span>
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4" />
            <span>Neuer Termin</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Terminkalender</CardTitle>
            </CardHeader>
            <CardContent>
              <AppointmentCalendar 
                appointments={appointments} 
                refreshCounter={refreshCounter}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Neuen Termin erstellen</CardTitle>
            </CardHeader>
            <CardContent>
              <AppointmentForm onAppointmentCreated={handleAppointmentCreated} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AppointmentScheduling;
