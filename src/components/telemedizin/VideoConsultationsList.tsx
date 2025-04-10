
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, isPast, isFuture } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Clock, Video, VideoOff } from "lucide-react";

interface VideoConsultation {
  id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  patient: {
    name: string;
  };
  doctor: {
    vorname: string;
    nachname: string;
  };
}

const VideoConsultationsList = () => {
  const [consultations, setConsultations] = useState<VideoConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, userInfo } = useAuth();

  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        if (!user) return;
        
        const { data, error } = await supabase
          .from("video_consultations")
          .select(`
            id,
            title,
            scheduled_start,
            scheduled_end,
            status,
            patient:patient_id (name),
            doctor:doctor_id (vorname, nachname)
          `)
          .order("scheduled_start", { ascending: true });

        if (error) {
          console.error("Error fetching consultations:", error);
          toast({
            title: "Fehler",
            description: "Die Video-Konsultationen konnten nicht geladen werden.",
            variant: "destructive",
          });
          return;
        }

        setConsultations(data || []);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConsultations();
  }, [user, userInfo]);

  const joinConsultation = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("video_consultations")
        .update({ status: "in-progress", actual_start: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        toast({
          title: "Fehler",
          description: "Die Konsultation konnte nicht gestartet werden.",
          variant: "destructive",
        });
        return;
      }

      navigate(`/telemedizin/room/${id}`);
    } catch (error) {
      console.error("Error joining consultation:", error);
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
    return <div>Laden...</div>;
  }

  if (consultations.length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-muted-foreground">Keine Video-Konsultationen gefunden.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Titel</TableHead>
          <TableHead>Patient</TableHead>
          <TableHead>Arzt</TableHead>
          <TableHead>Datum & Uhrzeit</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Aktion</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {consultations.map((consultation) => {
          const startDate = new Date(consultation.scheduled_start);
          const canJoin = 
            (consultation.status === "scheduled" || consultation.status === "in-progress") && 
            isPast(startDate) && 
            isFuture(new Date(startDate.getTime() + 60 * 60000)); // 1 hour window
            
          return (
            <TableRow key={consultation.id}>
              <TableCell>{consultation.title}</TableCell>
              <TableCell>{consultation.patient.name}</TableCell>
              <TableCell>{`${consultation.doctor.vorname} ${consultation.doctor.nachname}`}</TableCell>
              <TableCell>
                {format(new Date(consultation.scheduled_start), "dd.MM.yyyy")}
                <br />
                <span className="text-muted-foreground flex items-center text-xs">
                  <Clock className="mr-1 h-3 w-3" />
                  {format(new Date(consultation.scheduled_start), "HH:mm")} - 
                  {format(new Date(consultation.scheduled_end), "HH:mm")}
                </span>
              </TableCell>
              <TableCell>
                {getStatusBadge(consultation.status, consultation.scheduled_start)}
              </TableCell>
              <TableCell className="text-right">
                {canJoin ? (
                  <Button
                    size="sm"
                    onClick={() => joinConsultation(consultation.id)}
                  >
                    <Video className="mr-1 h-4 w-4" />
                    Teilnehmen
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled>
                    <VideoOff className="mr-1 h-4 w-4" />
                    Nicht verfügbar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default VideoConsultationsList;
