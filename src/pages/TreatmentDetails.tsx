
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Calendar, User, FileText, Pill } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

interface TreatmentDetails {
  id: string;
  untersuchung_datum: string;
  diagnose_path: string[] | null;
  medikament_menge: string | null;
  medikament_typ: string | null;
  diagnose: { diagnose: string } | null;
  diagnose_fallback: string | null;
  soap: string | null;
  medikamente: { name: string } | null;
  patient: { name: string };
}

const TreatmentDetails = () => {
  const { id: treatmentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [treatment, setTreatment] = useState<TreatmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const { userInfo } = useAuth();

  useEffect(() => {
    const fetchTreatmentDetails = async () => {
      if (!treatmentId) return;

      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from("behandlungen")
          .select(`
            id,
            untersuchung_datum,
            diagnose_path,
            medikament_menge,
            medikament_typ,
            diagnose (
              diagnose
            ),
            diagnose_fallback,
            "SOAP",
            medikamente (
              name
            ),
            patient (
              name
            )
          `)
          .eq("id", treatmentId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching treatment details:", error);
          return;
        }

        if (data) {
          setTreatment({
            ...data,
            soap: data["SOAP"] || null,
            medikament_menge: data.medikament_menge?.toString() || null,
          });
        }
      } catch (err) {
        console.error("Error in fetchTreatmentDetails:", err);
      } finally {
        setLoading(false);
      }
    };

    if (userInfo?.praxisId) {
      fetchTreatmentDetails();
    }
  }, [treatmentId, userInfo?.praxisId]);

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (!treatment) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ChevronLeft className="mr-2" />
            Zurück
          </Button>
        </div>
        <div className="text-center my-12">
          Behandlung nicht gefunden oder Sie haben keine Berechtigung, diese Behandlung anzusehen.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ChevronLeft className="mr-2" />
          Zurück
        </Button>
        <h1 className="text-2xl font-bold">Behandlungsdetails</h1>
      </div>

      <div className="grid gap-4">
        {/* Treatment Date */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Behandlungsdatum
            </CardTitle>
          </CardHeader>
          <CardContent>
            {format(new Date(treatment.untersuchung_datum), "dd.MM.yyyy")}
          </CardContent>
        </Card>

        {/* Patient */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Patient
            </CardTitle>
          </CardHeader>
          <CardContent>{treatment.patient.name}</CardContent>
        </Card>

        {/* Diagnose */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Diagnose
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                {treatment.diagnose?.diagnose ||
                  treatment.diagnose_fallback ||
                  "Keine Diagnose vorhanden"}
              </div>
              {treatment.diagnose_path && (
                <div className="text-sm text-muted-foreground">
                  <div className="font-semibold mb-1">Diagnosepfad:</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {treatment.diagnose_path.map((path, index) => (
                      <div key={index} className="flex items-center">
                        {index > 0 && <span className="mx-2">→</span>}
                        <span>{path}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Medikation */}
        {treatment.medikamente && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5" />
                Medikation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="font-semibold">Medikament: </span>
                  {treatment.medikamente.name}
                </div>
                {treatment.medikament_menge && (
                  <div>
                    <span className="font-semibold">Menge: </span>
                    {treatment.medikament_menge}
                    {treatment.medikament_typ && ` ${treatment.medikament_typ}`}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* SOAP Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              SOAP Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {treatment.soap || "Keine SOAP Notes vorhanden"}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TreatmentDetails;
