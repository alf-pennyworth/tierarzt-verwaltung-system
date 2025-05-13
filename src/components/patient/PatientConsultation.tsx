
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VideoConsultation } from "@/types/telemedizin";
import { format, isPast, isFuture } from "date-fns";
import { Button } from "@/components/ui/button";
import { Video, VideoOff, Clock, Calendar, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";

interface PatientConsultationProps {
  patientId: string;
}

const PatientConsultation = ({ patientId }: PatientConsultationProps) => {
  const [consultations, setConsultations] = useState<VideoConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        console.log("Fetching consultations for patient with ID:", patientId);
        
        // First get patient details
        const { data: patientData, error: patientError } = await supabase
          .from('patient')
          .select('name, spezies, besitzer_id')
          .eq('id', patientId)
          .single();
        
        if (patientError) {
          console.error("Error fetching patient details:", patientError);
          setError("Patientendaten konnten nicht geladen werden.");
        } else if (patientData) {
          setPatientName(patientData.name);
          console.log(`Patient name: ${patientData.name}, Species: ${patientData.spezies}, Owner ID: ${patientData.besitzer_id}`);
        }
        
        // Fetch consultations for this patient
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
          .eq('patient_id', patientId)
          .in('status', ['scheduled', 'in-progress']);

        if (error) {
          console.error("Error fetching consultations:", error);
          setError("Die Video-Konsultationen konnten nicht geladen werden.");
          setLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          console.log("No consultations found for patient:", patientId);
        } else {
          console.log(`Found ${data.length} consultations for patient:`, data);
          setConsultations(data as VideoConsultation[]);
        }
      } catch (error) {
        console.error("Error:", error);
        setError("Ein unerwarteter Fehler ist aufgetreten.");
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      fetchConsultations();
    } else {
      setLoading(false);
      setError("Keine Patienten-ID angegeben.");
    }
  }, [patientId]);

  const joinConsultation = async (consultationId: string) => {
    try {
      // Create session token for direct access
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Fehler",
          description: "Sie müssen angemeldet sein, um der Sprechstunde beizutreten.",
          variant: "destructive",
        });
        return;
      }
      
      const { data: ownerData, error: ownerError } = await supabase
        .from('besitzer')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!ownerData || ownerError) {
        console.error("Error getting owner data:", ownerError);
        toast({
          title: "Fehler",
          description: "Besitzerdaten konnten nicht gefunden werden.",
          variant: "destructive",
        });
        return;
      }

      console.log("Creating owner session with besitzer_id:", ownerData.id, "and consultation_id:", consultationId);
      
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

      console.log("Session token created successfully:", sessionToken);
      
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
    return (
      <div className="flex justify-center items-center p-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
        <span className="text-sm">Laden...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-3">
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (consultations.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-visible">
      {patientName && (
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-sm font-medium text-muted-foreground">Patient: {patientName}</h3>
        </div>
      )}
      <CardContent className="p-3">
        {consultations.map((consultation) => {
          const startDate = new Date(consultation.scheduled_start);
          const canJoin = 
            (consultation.status === "scheduled" || consultation.status === "in-progress") && 
            isPast(startDate) && 
            isFuture(new Date(startDate.getTime() + 60 * 60000)); // 1 hour window
            
          return (
            <div key={consultation.id} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-base font-medium">{consultation.title}</h3>
                {getStatusBadge(consultation.status, consultation.scheduled_start)}
              </div>
              
              <div className="text-sm space-y-1 mb-3">
                <div className="flex justify-between">
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(startDate, "dd.MM.yyyy")}
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    {format(startDate, "HH:mm")} - 
                    {format(new Date(consultation.scheduled_end), "HH:mm")}
                  </div>
                </div>
                <div className="text-muted-foreground">
                  Tierarzt: {consultation.doctor.vorname} {consultation.doctor.nachname}
                </div>
              </div>
              
              <div className="flex justify-end mt-2">
                {canJoin ? (
                  <Button size="sm" onClick={() => joinConsultation(consultation.id)}>
                    <Video className="mr-2 h-4 w-4" />
                    Beitreten
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled>
                    <VideoOff className="mr-2 h-4 w-4" />
                    Nicht verfügbar
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default PatientConsultation;
