
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { PatientConsultation } from "@/components/patient";

const OwnerConsultations = () => {
  const [patientIds, setPatientIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerName, setOwnerName] = useState("");

  useEffect(() => {
    const fetchOwnerPatients = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        console.log("Fetching patients for owner with auth_id:", user.id);

        // Get owner id based on auth_id
        const { data: ownerData, error: ownerError } = await supabase
          .from('besitzer')
          .select('id, name')
          .eq('auth_id', user.id)
          .single();

        if (ownerError || !ownerData) {
          console.error("Error fetching owner data:", ownerError);
          setLoading(false);
          return;
        }

        setOwnerName(ownerData.name || "");
        console.log("Owner ID:", ownerData.id);

        // Get patient IDs that belong to this owner
        const { data: patientData, error: patientError } = await supabase
          .from('patient')
          .select('id, name')
          .eq('besitzer_id', ownerData.id);

        if (patientError) {
          console.error("Error fetching patients:", patientError);
          setLoading(false);
          return;
        }

        if (!patientData || patientData.length === 0) {
          console.log("No patients found for this owner");
          setLoading(false);
          return;
        }

        const ids = patientData.map(p => p.id);
        console.log("Patient IDs:", ids);
        setPatientIds(ids);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOwnerPatients();
  }, []);

  if (loading) {
    return <div className="text-center">Laden...</div>;
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
