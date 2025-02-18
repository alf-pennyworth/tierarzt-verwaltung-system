
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Mic } from "lucide-react";

interface PatientDetails {
  id: string;
  name: string;
  spezies: string;
  rasse: string | null;
  geburtsdatum: string | null;
  besitzer: {
    name: string;
    telefonnummer: string | null;
    email: string | null;
  };
  behandlungen: {
    id: string;
    untersuchung_datum: string;
    diagnose: {
      diagnose: string;
    } | null;
    medikamente: {
      name: string;
    } | null;
    medikament_typ: string | null;
    medikament_menge: string | null;  // Changed from number to string
  }[];
}

const PatientDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientDetails | null>(null);

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
          name,
          telefonnummer,
          email
        ),
        behandlungen (
          id,
          untersuchung_datum,
          diagnose (
            diagnose
          ),
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
      setPatient(data);
    }
  };

  useEffect(() => {
    fetchPatientDetails();
  }, [id]);

  if (!patient) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{patient.name}</h1>
        <Button
          onClick={() => navigate("/transcription", { state: { patientId: patient.id } })}
        >
          <Mic className="mr-2" />
          Aufnahme starten
        </Button>
      </div>

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
          <CardHeader>
            <CardTitle>Besitzerinformationen</CardTitle>
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
                {behandlung.diagnose && (
                  <div>Diagnose: {behandlung.diagnose.diagnose}</div>
                )}
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
    </div>
  );
};

export default PatientDetails;
