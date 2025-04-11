
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, isPast, isFuture } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Clock, Mail, Video, VideoOff } from "lucide-react";
import { VideoConsultation } from "@/types/telemedizin";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";

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
          .from('video_consultations')
          .select(`
            id,
            title,
            scheduled_start,
            scheduled_end,
            status,
            room_id,
            owner_invited,
            owner_joined,
            patient:patient_id (id, name, spezies),
            doctor:doctor_id (id, vorname, nachname)
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

        // Type assertion to help TypeScript recognize the data
        setConsultations(data as unknown as VideoConsultation[]);
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
        .from('video_consultations')
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

  const invitePatientOwner = async (consultation: VideoConsultation) => {
    try {
      // First, get the owner information from the patient
      const { data: patientData, error: patientError } = await supabase
        .from('patient')
        .select('besitzer_id')
        .eq('id', consultation.patient.id)
        .single();

      if (patientError || !patientData) {
        toast({
          title: "Fehler",
          description: "Der Patient konnte nicht gefunden werden.",
          variant: "destructive",
        });
        return;
      }

      // Get the owner information
      const { data: ownerData, error: ownerError } = await supabase
        .from('besitzer')
        .select('id, email, name')
        .eq('id', patientData.besitzer_id)
        .single();

      if (ownerError || !ownerData || !ownerData.email) {
        toast({
          title: "Fehler",
          description: "Der Besitzer konnte nicht gefunden werden oder hat keine E-Mail-Adresse.",
          variant: "destructive",
        });
        return;
      }

      // Generate a session token for this consultation
      const { data: sessionToken, error: sessionError } = await supabase.rpc(
        'create_owner_session',
        { 
          besitzer_id_param: ownerData.id,
          consultation_id_param: consultation.id
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

      // Update consultation as invited
      await supabase
        .from('video_consultations')
        .update({ owner_invited: true })
        .eq('id', consultation.id);

      // In a real application, this would send an email to the owner
      // For demonstration purposes, we'll just show the link in a toast
      const consultationUrl = `${window.location.origin}/telemedizin/owner/join?token=${sessionToken}`;
      
      toast({
        title: "Einladung erstellt",
        description: `Eine Einladung für ${ownerData.name} wurde erstellt.`,
      });

      // For testing, show the link in another toast
      toast({
        title: "Link für Besitzer (Testmodus)",
        description: (
          <div className="mt-2 p-2 bg-slate-100 rounded">
            <a 
              href={consultationUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="text-blue-600 hover:underline break-all text-xs"
            >
              {consultationUrl}
            </a>
          </div>
        ),
        duration: 10000,
      });

      // Update the local state
      setConsultations(prevConsultations => 
        prevConsultations.map(c => 
          c.id === consultation.id 
            ? { ...c, owner_invited: true } 
            : c
        )
      );

    } catch (error) {
      console.error("Error inviting owner:", error);
      toast({
        title: "Fehler",
        description: "Der Besitzer konnte nicht eingeladen werden.",
        variant: "destructive",
      });
    }
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
          <TableHead className="text-right">Aktionen</TableHead>
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
                {consultation.owner_invited && 
                  <Badge variant="outline" className="ml-2 bg-blue-50">
                    Besitzer eingeladen
                  </Badge>
                }
                {consultation.owner_joined && 
                  <Badge variant="outline" className="ml-2 bg-green-50">
                    Besitzer online
                  </Badge>
                }
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => invitePatientOwner(consultation)}
                    disabled={consultation.status === "cancelled" || consultation.status === "completed"}
                  >
                    <Mail className="mr-1 h-4 w-4" />
                    {consultation.owner_invited ? "Erneut einladen" : "Besitzer einladen"}
                  </Button>
                  
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
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default VideoConsultationsList;
