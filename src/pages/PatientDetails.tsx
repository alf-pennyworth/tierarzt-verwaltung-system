import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Edit, Mic, Video, MessageSquare, Package, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import PatientInsights from "@/components/patient/PatientInsights";
import { SendOwnerInvite } from "@/components/owner";
import { PatientDialog } from "@/components/patient";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface PatientDetails {
  id: string;
  name: string;
  spezies: string;
  rasse: string | null;
  geburtsdatum: string | null;
  besitzer: {
    id: string;
    name: string;
    telefonnummer: string | null;
    email: string | null;
    auth_id: string | null;
  };
  behandlungen: {
    id: string;
    untersuchung_datum: string;
    diagnose: {
      diagnose: string;
    } | null;
    diagnose_fallback: string | null;
    medikamente: {
      name: string;
    } | null;
    medikament_typ: string | null;
    medikament_menge: string | null;
  }[];
}

const PatientDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const fetchPatientDetails = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("patient")
      .select(`
        id,
        name,
        spezies,
        rasse,
        geburtsdatum,
        besitzer (
          id,
          name,
          telefonnummer,
          email,
          auth_id
        ),
        behandlungen (
          id,
          untersuchung_datum,
          diagnose (
            diagnose
          ),
          diagnose_fallback,
          medikamente (
            name
          ),
          medikament_typ,
          medikament_menge
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching patient details:", error);
      return;
    }

    if (data) {
      setPatient({
        ...data,
        behandlungen: data.behandlungen.map(b => ({
          ...b,
          medikament_menge: b.medikament_menge?.toString() || null
        }))
      });
    }
  };

  useEffect(() => {
    fetchPatientDetails();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    try {
      const { error } = await supabase
        .from("patient")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Patient gelöscht",
        description: "Der Patient wurde erfolgreich archiviert.",
      });
      navigate("/patients");
    } catch (error) {
      console.error("Error deleting patient:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Patient konnte nicht gelöscht werden.",
      });
    }
  };

  if (!patient) {
    return <div className="p-8 text-center">Laden...</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{patient.name}</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-3 w-3" />
              Bearbeiten
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive">
                  <Trash2 className="mr-2 h-3 w-3" />
                  Löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Patient löschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Sind Sie sicher, dass Sie {patient.name} löschen möchten? Diese Aktion wird als Archivierung (deleted_at) durchgeführt.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={handleDelete}>Ja, löschen</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <Button
          onClick={() => navigate("/transcription", { state: { patientId: patient.id } })}
        >
          <Mic className="mr-2" />
          Aufnahme starten
        </Button>
      </div>

      {/* Add Patient Insights */}
      <PatientInsights patientId={id!} />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Schnellaktionen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate(`/transcription?patientId=${id}`)}>
              <Mic className="mr-2 h-4 w-4" />
              Neue Behandlung
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate(`/appointments?patientId=${id}`)}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Termin planen
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate(`/telemedizin/schedule?patientId=${id}`)}
            >
              <Video className="mr-2 h-4 w-4" />
              Video-Konsultation
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/inventory/medications')}
            >
              <Package className="mr-2 h-4 w-4" />
              Lagerbestand
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Patienteninformationen</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div>
                <dt className="font-semibold">Spezies</dt>
                <dd>{patient.spezies}</dd>
              </div>
              <div>
                <dt className="font-semibold">Rasse</dt>
                <dd>{patient.rasse || "-"}</dd>
              </div>
              <div>
                <dt className="font-semibold">Geburtsdatum</dt>
                <dd>
                  {patient.geburtsdatum
                    ? format(new Date(patient.geburtsdatum), "dd.MM.yyyy")
                    : "-"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Besitzerinformationen</CardTitle>
            {!patient.besitzer.auth_id && (
              <SendOwnerInvite 
                ownerId={patient.besitzer.id} 
                ownerEmail={patient.besitzer.email || undefined} 
                ownerName={patient.besitzer.name}
              />
            )}
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div>
                <dt className="font-semibold">Name</dt>
                <dd>{patient.besitzer.name}</dd>
              </div>
              <div>
                <dt className="font-semibold">Telefon</dt>
                <dd>{patient.besitzer.telefonnummer || "-"}</dd>
              </div>
              <div>
                <dt className="font-semibold">E-Mail</dt>
                <dd>{patient.besitzer.email || "-"}</dd>
              </div>
              <div>
                <dt className="font-semibold">Portal-Status</dt>
                <dd>
                  {patient.besitzer.auth_id ? (
                    <span className="text-green-600 font-medium">Registriert</span>
                  ) : (
                    <span className="text-gray-500">Nicht registriert</span>
                  )}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Behandlungshistorie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {patient.behandlungen.map((behandlung) => (
              <div
                key={behandlung.id}
                className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/treatment/${behandlung.id}`)}
              >
                <div className="font-semibold">
                  {format(new Date(behandlung.untersuchung_datum), "dd.MM.yyyy")}
                </div>
                <div>
                  Diagnose:{" "}
                  {behandlung.diagnose && behandlung.diagnose.diagnose
                    ? behandlung.diagnose.diagnose
                    : behandlung.diagnose_fallback || "-"}
                </div>
                {behandlung.medikamente && (
                  <div>
                    Medikament: {behandlung.medikamente.name}
                    {behandlung.medikament_menge !== null && behandlung.medikament_typ
                      ? ` (${behandlung.medikament_menge} - ${behandlung.medikament_typ})`
                      : ""}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isEditing && (
        <PatientDialog 
          patientId={id!} 
          onSuccess={() => {
            setIsEditing(false);
            fetchPatientDetails();
          }} 
        />
      )}
    </div>
  );
};

export default PatientDetails;
