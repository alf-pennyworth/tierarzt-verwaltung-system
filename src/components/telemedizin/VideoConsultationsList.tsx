import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, isPast, isFuture } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoConsultation } from "@/types/telemedizin";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Video, VideoOff, Clock, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const VideoConsultationsList = () => {
  const [consultations, setConsultations] = useState<VideoConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const { userInfo } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConsultations = async () => {
      if (!userInfo?.praxisId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('video_consultations')
          .select(`
            id,
            title,
            scheduled_start,
            scheduled_end,
            status,
            room_id,
            patient:patient_id (id, name, spezies, besitzer_id),
            doctor:doctor_id (id, vorname, nachname),
            owner_invited
          `)
          .eq('praxis_id', userInfo.praxisId)
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

        setConsultations(data as VideoConsultation[]);
      } catch (error) {
        console.error("Error:", error);
        toast({
          title: "Fehler",
          description: "Es ist ein unerwarteter Fehler aufgetreten.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConsultations();
  }, [userInfo]);

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

  const startConsultation = async (consultationId: string, roomId: string) => {
    try {
      // Update consultation status to 'in-progress'
      const { error } = await supabase
        .from('video_consultations')
        .update({ status: 'in-progress', actual_start: new Date().toISOString() })
        .eq('id', consultationId);

      if (error) {
        console.error("Error updating consultation status:", error);
        toast({
          title: "Fehler",
          description: "Der Status der Konsultation konnte nicht aktualisiert werden.",
          variant: "destructive",
        });
        return;
      }

      navigate(`/telemedizin/room/${consultationId}`);
    } catch (error) {
      console.error("Error starting consultation:", error);
      toast({
        title: "Fehler",
        description: "Die Konsultation konnte nicht gestartet werden.",
        variant: "destructive",
      });
    }
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
            Es sind derzeit keine Videosprechstunden geplant.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {consultations.map((consultation) => {
        const startDate = new Date(consultation.scheduled_start);
        const canStart =
          consultation.status === "scheduled" &&
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
                  <p className="text-sm font-medium text-muted-foreground">Tierart</p>
                  <p>{consultation.patient.spezies}</p>
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
                {canStart ? (
                  <Button onClick={() => startConsultation(consultation.id, consultation.room_id)}>
                    <Video className="mr-2 h-4 w-4" />
                    Sprechstunde starten
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

export default VideoConsultationsList;
