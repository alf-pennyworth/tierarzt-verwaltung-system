
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { PatientConsultation } from "@/components/patient";
import { Loader2 } from "lucide-react";

const OwnerConsultations = () => {
  const [patientIds, setPatientIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerName, setOwnerName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOwnerPatients = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log("No authenticated user found");
          setLoading(false);
          setError("Bitte melden Sie sich an, um Ihre Sprechstunden zu sehen.");
          return;
        }

        console.log("Authenticated user ID:", user.id);

        // Get owner id based on auth_id
        const { data: ownerData, error: ownerError } = await supabase
          .from('besitzer')
          .select('id, name')
          .eq('auth_id', user.id)
          .single();

        if (ownerError) {
          console.error("Error fetching owner data:", ownerError);
          setLoading(false);
          setError("Besitzer-Daten konnten nicht geladen werden.");
          return;
        }

        if (!ownerData) {
          console.log("No owner data found for this auth user");
          setLoading(false);
          setError("Kein Besitzerprofil gefunden.");
          return;
        }

        setOwnerName(ownerData.name || "");
        console.log("Found owner:", ownerData.name, "with ID:", ownerData.id);

        // Get patient IDs that belong to this owner
        const { data: patientData, error: patientError } = await supabase
          .from('patient')
          .select('id, name, spezies')
          .eq('besitzer_id', ownerData.id);

        if (patientError) {
          console.error("Error fetching patients:", patientError);
          setLoading(false);
          setError("Patienten konnten nicht geladen werden.");
          return;
        }

        if (!patientData || patientData.length === 0) {
          console.log("No patients found for owner with ID:", ownerData.id);
          setLoading(false);
          return;
        }

        const ids = patientData.map(p => p.id);
        console.log("Found", patientData.length, "patients:", patientData.map(p => `${p.name} (${p.spezies})`));
        console.log("Patient IDs:", ids);
        setPatientIds(ids);
      } catch (error) {
        console.error("Unexpected error:", error);
        setError("Ein unerwarteter Fehler ist aufgetreten.");
      } finally {
        setLoading(false);
      }
    };

    fetchOwnerPatients();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fehler</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (patientIds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keine Videosprechstunden</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            Es konnten keine Tiere für Ihr Konto gefunden werden oder es sind keine Videosprechstunden geplant.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {patientIds.map((patientId) => (
        <PatientConsultation key={patientId} patientId={patientId} />
      ))}
    </div>
  );
};

export default OwnerConsultations;
