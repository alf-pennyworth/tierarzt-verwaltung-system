
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VideoConsultation } from "@/types/telemedizin";
import { format, isPast, isFuture } from "date-fns";
import { Button } from "@/components/ui/button";
import { Video, VideoOff, Clock, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface PatientConsultationProps {
  patientId: string;
}

const PatientConsultation = ({ patientId }: PatientConsultationProps) => {
  const [consultations, setConsultations] = useState<VideoConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        console.log("Fetching consultations for patient with ID:", patientId);
        
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

        console.log("Fetched consultations for patient:", data);
        setConsultations(data as VideoConsultation[]);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      fetchConsultations();
    } else {
      setLoading(false);
    }
  }, [patientId]);

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
    return <div className="text-center text-sm">Laden...</div>;
  }

  if (consultations.length === 0) {
    return null;
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
    </div>
  );
};

export default PatientConsultation;
