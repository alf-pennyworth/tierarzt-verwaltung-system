import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Activity,
  Calendar,
  Clock,
  FileText,
  Pill,
  Stethoscope,
  Syringe,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Dog,
  Cat,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface TimelineEvent {
  id: string;
  type: "treatment" | "medication" | "vaccination" | "appointment" | "note" | "lab";
  date: string;
  title: string;
  description: string;
  details?: Record<string, string>;
  icon: React.ReactNode;
  color: string;
}

export default function PatientTimelinePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userInfo } = useAuth();
  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState("");
  const [patientSpecies, setPatientSpecies] = useState("");
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  const fetchTimeline = useCallback(async () => {
    if (!id || !userInfo?.praxisId) return;

    setLoading(true);
    try {
      // Get patient info
      const { data: patient } = await supabase
        .from("patient")
        .select("name, spezies")
        .eq("id", id)
        .eq("praxis_id", userInfo.praxisId)
        .single();

      if (patient) {
        setPatientName(patient.name);
        setPatientSpecies(patient.spezies);
      }

      const timelineEvents: TimelineEvent[] = [];

      // Fetch treatments
      const { data: treatments } = await supabase
        .from("behandlungen")
        .select(`
          id,
          untersuchung_datum,
          diagnose_fallback,
          behandlung,
          notizen,
          medikament:medikament_id(name),
          vet:vet_id(name)
        `)
        .eq("patient_id", id)
        .eq("praxis_id", userInfo.praxisId)
        .order("untersuchung_datum", { ascending: false });

      treatments?.forEach((t) => {
        timelineEvents.push({
          id: `treatment-${t.id}`,
          type: "treatment",
          date: t.untersuchung_datum,
          title: t.diagnose_fallback || "Behandlung",
          description: t.behandlung || "Keine Details",
          details: {
            Medikament: t.medikament?.name || "Keines",
            Tierarzt: t.vet?.name || "Unbekannt",
            Notizen: t.notizen || "",
          },
          icon: <Stethoscope className="h-4 w-4" />,
          color: "bg-blue-500",
        });
      });

      // Fetch antibiotic prescriptions (TAMG)
      const { data: prescriptions } = await supabase
        .from("antibiotic_prescriptions")
        .select(`
          id,
          prescription_date,
          antibiotic_name,
          dosage,
          duration_days,
          indication,
          vet:vet_id(name)
        `)
        .eq("patient_id", id)
        .eq("praxis_id", userInfo.praxisId)
        .order("prescription_date", { ascending: false });

      prescriptions?.forEach((p) => {
        timelineEvents.push({
          id: `prescription-${p.id}`,
          type: "medication",
          date: p.prescription_date,
          title: `Antibiotika: ${p.antibiotic_name}`,
          description: `${p.dosage} für ${p.duration_days} Tage`,
          details: {
            Indikation: p.indication || "",
            Tierarzt: p.vet?.name || "Unbekannt",
          },
          icon: <Pill className="h-4 w-4" />,
          color: "bg-amber-500",
        });
      });

      // Fetch appointments
      const { data: appointments } = await supabase
        .from("appointments")
        .select(`
          id,
          start_time,
          title,
          description,
          status
        `)
        .eq("patient_id", id)
        .eq("praxis_id", userInfo.praxisId)
        .order("start_time", { ascending: false });

      appointments?.forEach((a) => {
        timelineEvents.push({
          id: `appointment-${a.id}`,
          type: "appointment",
          date: a.start_time,
          title: a.title || "Termin",
          description: a.description || "",
          details: {
            Status: a.status || "Geplant",
          },
          icon: <Calendar className="h-4 w-4" />,
          color: "bg-green-500",
        });
      });

      // Sort all events by date (newest first)
      timelineEvents.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setEvents(timelineEvents);
    } catch (error) {
      console.error("Error fetching timeline:", error);
    } finally {
      setLoading(false);
    }
  }, [id, userInfo?.praxisId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case "treatment":
        return <Stethoscope className="h-5 w-5" />;
      case "medication":
        return <Pill className="h-5 w-5" />;
      case "vaccination":
        return <Syringe className="h-5 w-5" />;
      case "appointment":
        return <Calendar className="h-5 w-5" />;
      case "lab":
        return <ClipboardList className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "treatment":
        return "bg-blue-500";
      case "medication":
        return "bg-amber-500";
      case "vaccination":
        return "bg-green-500";
      case "appointment":
        return "bg-purple-500";
      case "lab":
        return "bg-cyan-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {patientSpecies === "Hund" ? (
            <Dog className="h-8 w-8 text-blue-500" />
          ) : patientSpecies === "Katze" ? (
            <Cat className="h-8 w-8 text-amber-500" />
          ) : (
            <Activity className="h-8 w-8 text-green-500" />
          )}
          <div>
            <h1 className="text-2xl font-bold">{patientName}</h1>
            <p className="text-muted-foreground">
              {patientSpecies} • {events.length} Ereignisse
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate(`/patient/${id}`)}>
          Zurück zum Patienten
        </Button>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Behandlungsverlauf
          </CardTitle>
          <CardDescription>
            Chronologische Übersicht aller Behandlungen, Medikationen und Termine
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Keine Ereignisse</h3>
              <p className="text-muted-foreground">
                Für diesen Patienten wurden noch keine Behandlungen oder Termine erfasst.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="relative space-y-6 pl-8">
                {/* Timeline line */}
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />

                {events.map((event, index) => (
                  <div key={event.id} className="relative">
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        "absolute -left-8 top-0 w-6 h-6 rounded-full flex items-center justify-center text-white",
                        getEventColor(event.type)
                      )}
                    >
                      {getEventIcon(event.type)}
                    </div>

                    <Card className="ml-4">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">
                                {format(new Date(event.date), "dd.MM.yyyy", {
                                  locale: de,
                                })}
                              </Badge>
                              <Badge className={getEventColor(event.type)}>
                                {event.type === "treatment"
                                  ? "Behandlung"
                                  : event.type === "medication"
                                  ? "Medikation"
                                  : event.type === "vaccination"
                                  ? "Impfung"
                                  : event.type === "appointment"
                                  ? "Termin"
                                  : event.type === "lab"
                                  ? "Labor"
                                  : "Sonstiges"}
                              </Badge>
                            </div>

                            <h3 className="font-semibold text-lg mb-1">
                              {event.title}
                            </h3>
                            <p className="text-muted-foreground mb-2">
                              {event.description}
                            </p>

                            {event.details && Object.keys(event.details).length > 0 && (
                              <div className="mt-3 p-3 bg-muted rounded-lg space-y-1">
                                {Object.entries(event.details).map(
                                  ([key, value]) =>
                                    value ? (
                                      <div
                                        key={key}
                                        className="flex justify-between text-sm"
                                      >
                                        <span className="text-muted-foreground">
                                          {key}:
                                        </span>
                                        <span>{value}</span>
                                      </div>
                                    ) : null
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
