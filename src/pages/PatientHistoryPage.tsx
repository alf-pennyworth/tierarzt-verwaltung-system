import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Calendar, 
  Edit, 
  Mic, 
  Pill, 
  User, 
  FileText, 
  Activity,
  Clock,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Loader2 } from "lucide-react";

interface PatientInfo {
  id: string;
  name: string;
  spezies: string;
  rasse: string | null;
  geschlecht: string | null;
  geburtsdatum: string | null;
  besitzer: {
    id: string;
    name: string;
    telefonnummer: string | null;
    email: string | null;
  } | null;
}

interface Treatment {
  id: string;
  untersuchung_datum: string;
  diagnose: { diagnose: string } | null;
  diagnose_fallback: string | null;
  soap: string | null;
  medikamente: { name: string } | null;
  medikament_typ: string | null;
  medikament_menge: string | null;
  notizen: string | null;
}

interface AntibioticPrescription {
  id: string;
  drug_name: string;
  amount: number | null;
  unit: string | null;
  treatment_duration_days: number | null;
  treatment_purpose: string | null;
  prescribed_at: string;
  animal_count: number | null;
}

const PatientHistoryPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [prescriptions, setPrescriptions] = useState<AntibioticPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"liste" | "timeline">("liste");

  useEffect(() => {
    if (!id) return;
    fetchPatientData();
  }, [id]);

  const fetchPatientData = async () => {
    setLoading(true);
    try {
      // Fetch patient info
      const { data: patientData, error: patientError } = await supabase
        .from("patient")
        .select(`
          id,
          name,
          spezies,
          rasse,
          geschlecht,
          geburtsdatum,
          besitzer:besitzer_id (
            id,
            name,
            telefonnummer,
            email
          )
        `)
        .eq("id", id)
        .is("deleted_at", null)
        .single();

      if (patientError) throw patientError;
      if (!patientData) {
        navigate("/patients");
        return;
      }

      setPatient(patientData as PatientInfo);

      // Fetch treatments
      const { data: treatmentsData, error: treatmentsError } = await supabase
        .from("behandlungen")
        .select(`
          id,
          untersuchung_datum,
          diagnose (
            diagnose
          ),
          diagnose_fallback,
          soap,
          medikamente (
            name
          ),
          medikament_typ,
          medikament_menge,
          notizen
        `)
        .eq("patient_id", id)
        .order("untersuchung_datum", { ascending: false });

      if (treatmentsError) {
        console.error("Error fetching treatments:", treatmentsError);
      } else {
        setTreatments((treatmentsData || []).map((t: any) => ({
          ...t,
          medikament_menge: t.medikament_menge?.toString() || null
        })));
      }

      // Fetch antibiotic prescriptions
      const { data: prescriptionsData, error: prescriptionsError } = await supabase
        .from("antibiotic_prescriptions")
        .select(`
          id,
          drug_name,
          amount,
          unit,
          treatment_duration_days,
          treatment_purpose,
          prescribed_at,
          animal_count
        `)
        .eq("patient_id", id)
        .order("prescribed_at", { ascending: false });

      if (prescriptionsError) {
        console.error("Error fetching prescriptions:", prescriptionsError);
      } else {
        setPrescriptions(prescriptionsData || []);
      }
    } catch (error) {
      console.error("Error fetching patient data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Patientendaten werden geladen...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-12">
          <p>Patient nicht gefunden.</p>
          <Button className="mt-4" onClick={() => navigate("/patients")}>
            Zurück zur Patientenliste
          </Button>
        </div>
      </div>
    );
  }

  // Calculate patient age
  const calculateAge = (birthDate: string | null): string => {
    if (!birthDate) return "Unbekannt";
    const birth = new Date(birthDate);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      years--;
    }
    return years < 0 ? "Unbekannt" : `${years} Jahre`;
  };

  // Format date for display
  const formatDate = (dateStr: string): string => {
    try {
      return format(new Date(dateStr), "dd.MM.yyyy", { locale: de });
    } catch {
      return dateStr;
    }
  };

  // Merge treatments and prescriptions for timeline
  const timelineEvents = [
    ...treatments.map(t => ({
      type: "treatment" as const,
      date: t.untersuchung_datum,
      data: t
    })),
    ...prescriptions.map(p => ({
      type: "prescription" as const,
      date: p.prescribed_at,
      data: p
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/patients")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{patient.name}</h1>
            <p className="text-muted-foreground">
              {patient.spezies} {patient.rasse && `• ${patient.rasse}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => navigate(`/patient/${id}`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Bearbeiten
          </Button>
          <Button onClick={() => navigate(`/transcription?patientId=${id}`)}>
            <Mic className="mr-2 h-4 w-4" />
            Neue Behandlung
          </Button>
        </div>
      </div>

      {/* Patient Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Patienteninformationen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Spezies:</span>
                <span className="font-medium">{patient.spezies}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rasse:</span>
                <span className="font-medium">{patient.rasse || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Geschlecht:</span>
                <span className="font-medium">{patient.geschlecht || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Alter:</span>
                <span className="font-medium">{calculateAge(patient.geburtsdatum)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Geburtsdatum:</span>
                <span className="font-medium">
                  {patient.geburtsdatum ? formatDate(patient.geburtsdatum) : "-"}
                </span>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Besitzer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {patient.besitzer ? (
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span 
                    className="font-medium cursor-pointer hover:underline"
                    onClick={() => navigate(`/owners/${patient.besitzer?.id}`)}
                  >
                    {patient.besitzer.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telefon:</span>
                  <span className="font-medium">{patient.besitzer.telefonnummer || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">E-Mail:</span>
                  <span className="font-medium">{patient.besitzer.email || "-"}</span>
                </div>
              </dl>
            ) : (
              <p className="text-muted-foreground text-sm">Kein Besitzer zugeordnet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Übersicht
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Behandlungen:</span>
                <span className="font-medium">{treatments.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Antibiotika-Verschreibungen:</span>
                <span className="font-medium">{prescriptions.length}</span>
              </div>
              {treatments.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Letzte Behandlung:</span>
                  <span className="font-medium">
                    {formatDate(treatments[0].untersuchung_datum)}
                  </span>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={activeView === "liste" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveView("liste")}
        >
          <FileText className="mr-2 h-4 w-4" />
          Liste
        </Button>
        <Button
          variant={activeView === "timeline" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveView("timeline")}
        >
          <Clock className="mr-2 h-4 w-4" />
          Zeitstrahl
        </Button>
      </div>

      {/* Content */}
      {activeView === "liste" ? (
        <div className="space-y-6">
          {/* Treatments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Behandlungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {treatments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Keine Behandlungen vorhanden</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate(`/transcription?patientId=${id}`)}
                  >
                    <Mic className="mr-2 h-4 w-4" />
                    Erste Behandlung starten
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {treatments.map((treatment) => (
                    <div
                      key={treatment.id}
                      className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/treatment/${treatment.id}`)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold">
                          {formatDate(treatment.untersuchung_datum)}
                        </span>
                        {treatment.medikamente && (
                          <Badge variant="secondary">
                            <Pill className="mr-1 h-3 w-3" />
                            Medikament
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="mb-1">
                          <span className="font-medium">Diagnose: </span>
                          {treatment.diagnose?.diagnose ||
                            treatment.diagnose_fallback ||
                            "Keine Diagnose"}
                        </div>
                        {treatment.medikamente && (
                          <div>
                            <span className="font-medium">Medikament: </span>
                            {treatment.medikamente.name}
                            {treatment.medikament_menge &&
                              ` (${treatment.medikament_menge}${
                                treatment.medikament_typ
                                  ? ` ${treatment.medikament_typ}`
                                  : ""
                              })`}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Antibiotic Prescriptions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5" />
                Antibiotika-Verschreibungen (TAMG)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {prescriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Keine Antibiotika-Verschreibungen vorhanden</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {prescriptions.map((rx) => (
                    <div
                      key={rx.id}
                      className="p-4 border rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold">{rx.drug_name}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(rx.prescribed_at)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex gap-4">
                          {rx.amount && (
                            <span>Menge: {rx.amount} {rx.unit || "Stück"}</span>
                          )}
                          {rx.treatment_duration_days && (
                            <span>Dauer: {rx.treatment_duration_days} Tage</span>
                          )}
                        </div>
                        {rx.treatment_purpose && (
                          <div>Grund: {rx.treatment_purpose}</div>
                        )}
                        {rx.animal_count && rx.animal_count > 1 && (
                          <div>Anzahl Tiere: {rx.animal_count}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Timeline View */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Behandlungsverlauf
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timelineEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Keine Behandlungsdaten vorhanden</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                
                <div className="space-y-6">
                  {timelineEvents.map((event, index) => (
                    <div key={`${event.type}-${event.data.id}`} className="relative pl-10">
                      {/* Timeline dot */}
                      <div className={`absolute left-2 top-1 w-4 h-4 rounded-full border-2 ${
                        event.type === "treatment" 
                          ? "bg-blue-500 border-blue-200" 
                          : "bg-amber-500 border-amber-200"
                      }`} />
                      
                      <div
                        className={`p-4 border rounded-lg ${
                          event.type === "treatment"
                            ? "cursor-pointer hover:bg-muted/50 transition-colors"
                            : ""
                        }`}
                        onClick={() => {
                          if (event.type === "treatment") {
                            navigate(`/treatment/${event.data.id}`);
                          }
                        }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            {event.type === "treatment" ? (
                              <Calendar className="h-4 w-4 text-blue-500" />
                            ) : (
                              <Pill className="h-4 w-4 text-amber-500" />
                            )}
                            <span className="font-semibold">
                              {event.type === "treatment" ? "Behandlung" : "Antibiotika-Verschreibung"}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(event.date)}
                          </span>
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          {event.type === "treatment" ? (
                            <>
                              <div className="mb-1">
                                <span className="font-medium">Diagnose: </span>
                                {event.data.diagnose?.diagnose ||
                                  event.data.diagnose_fallback ||
                                  "Keine Diagnose"}
                              </div>
                              {event.data.medikamente && (
                                <div>
                                  <span className="font-medium">Medikament: </span>
                                  {event.data.medikamente.name}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="mb-1">
                                <span className="font-medium">Präparat: </span>
                                {event.data.drug_name}
                              </div>
                              {event.data.treatment_duration_days && (
                                <div>
                                  <span className="font-medium">Dauer: </span>
                                  {event.data.treatment_duration_days} Tage
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PatientHistoryPage;