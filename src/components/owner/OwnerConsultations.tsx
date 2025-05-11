import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, isPast, isFuture } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoConsultation } from "@/types/telemedizin";
import { toast } from "@/hooks/use-toast";
import { Video, VideoOff, Clock, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const OwnerConsultations = () => {
  const [consultations, setConsultations] = useState<VideoConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        console.log("Fetching consultations for owner with auth_id:", user.id);

        // Get owner id based on auth_id
        const { data: ownerData, error: ownerError } = await supabase
          .from('besitzer')
          .select('id')
          .eq('auth_id', user.id)
          .single();

        if (ownerError || !ownerData) {
          console.error("Error fetching owner data:", ownerError);
          setLoading(false);
          return;
        }

        console.log("Owner ID:", ownerData.id);

        // Get patient IDs that belong to this owner
        const { data: patientData, error: patientError } = await supabase
          .from('patient')
          .select('id')
          .eq('besitzer_id', ownerData.id);

        if (patientError) {
          console.error("Error fetching patients:", patientError);
          setLoading(false);
          return;
        }

        if (!patientData || patientData.length === 0) {
          console.log("No patients found for this owner");
          setLoading(false);
          return;
        }

        const patientIds = patientData.map(p => p.id);
        console.log("Patient IDs:", patientIds);

        // Fetch consultations for owner's patients
        const { data, error } = await supabase
          .from('video_consultations')
          .select(`
            id,
            title,
            scheduled_start,
            scheduled_end,
            status,
            room_id,
            patient:patient_id (id, name, spezies),
            doctor:doctor_id (id, vorname, nachname)
          `)
          .in('patient_id', patientIds)
          .in('status', ['scheduled', 'in-progress'])
          .order('scheduled_start', { ascending: true });

        if (error) {
          console.error("Error fetching consultations:", error);
          toast({
            title: "Fehler",
            description: "Die Video-Konsultationen konnten nicht geladen werden.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        console.log("Fetched consultations:", data);
        setConsultations(data as VideoConsultation[]);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConsultations();
  }, []);

  const joinConsultation = async (consultationId: string) => {
    try {
      // Create session token for direct access
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: ownerData } = await supabase
        .from('besitzer')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!ownerData) return;

      // Create a session token for this consultation
      const { data: sessionToken, error: sessionError } = await supabase.rpc(
        'create_owner_session',
        { 
          besitzer_id_param: ownerData.id,
          consultation_id_param: consultationId
        }
      );

      if (sessionError || !sessionToken) {
        console.error("Error creating session:", sessionError);
        toast({
          title: "Fehler",
          description: "Es konnte keine Sitzung für den Besitzer erstellt werden.",
          variant: "destructive",
        });
        return;
      }

      // Store the token in session storage for use in the consultation room
      sessionStorage.setItem('owner_access_token', sessionToken);
      navigate(`/owner/room/${consultationId}`);

    } catch (error) {
      console.error("Error joining consultation:", error);
      toast({
        title: "Fehler",
        description: "Der Videosprechstunde konnte nicht beigetreten werden.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string, startTime: string) => {
    if (status === "cancelled") {
      return <Badge variant="destructive">Abgesagt</Badge>;
    }

    if (status === "completed") {
      return <Badge variant="secondary">Abgeschlossen</Badge>;
    }

    if (status === "in-progress") {
      return <Badge variant="default">Aktiv</Badge>;
    }

    // Status is 'scheduled'
    if (isPast(new Date(startTime)) && isFuture(new Date(new Date(startTime).getTime() + 30 * 60000))) {
      return <Badge variant="outline" className="bg-green-100">Jetzt verfügbar</Badge>;
    }

    return <Badge variant="outline">Geplant</Badge>;
  };

  if (loading) {
    return <div className="text-center">Laden...</div>;
  }

  if (consultations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keine Videosprechstunden</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            Sie haben derzeit keine geplanten Videosprechstunden.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {consultations.map((consultation) => {
        const startDate = new Date(consultation.scheduled_start);
        const canJoin = 
          (consultation.status === "scheduled" || consultation.status === "in-progress") && 
          isPast(startDate) && 
          isFuture(new Date(startDate.getTime() + 60 * 60000)); // 1 hour window
          
        return (
          <Card key={consultation.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{consultation.title}</CardTitle>
                {getStatusBadge(consultation.status, consultation.scheduled_start)}
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Patient</p>
                  <p>{consultation.patient.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tierarzt</p>
                  <p>{consultation.doctor.vorname} {consultation.doctor.nachname}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Datum
                  </p>
                  <p>{format(startDate, "dd.MM.yyyy")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Uhrzeit
                  </p>
                  <p>
                    {format(startDate, "HH:mm")} - 
                    {format(new Date(consultation.scheduled_end), "HH:mm")}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end mt-2">
                {canJoin ? (
                  <Button onClick={() => joinConsultation(consultation.id)}>
                    <Video className="mr-2 h-4 w-4" />
                    Videosprechstunde beitreten
                  </Button>
                ) : (
                  <Button variant="outline" disabled>
                    <VideoOff className="mr-2 h-4 w-4" />
                    Nicht verfügbar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default OwnerConsultations;
