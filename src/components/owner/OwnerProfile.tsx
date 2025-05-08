
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PatientList from "@/components/PatientList";
import { AddPatientDialog } from "@/components/patient";
import { Patient } from "@/pages/Profile";

interface OwnerProfileProps {
  ownerId: string;
}

interface Owner {
  id: string;
  name: string;
  email: string | null;
  telefonnummer: string | null;
  stadt: string | null;
  postleitzahl: string | null;
  strasse: string | null;
}

const OwnerProfile = ({ ownerId }: OwnerProfileProps) => {
  const [owner, setOwner] = useState<Owner | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOwnerDetails = async () => {
      setLoading(true);
      try {
        // Fetch owner details
        const { data: ownerData, error: ownerError } = await supabase
          .from("besitzer")
          .select("*")
          .eq("id", ownerId)
          .single();
        
        if (ownerError) throw ownerError;
        setOwner(ownerData);

        // Fetch owner's patients
        const { data: patientsData, error: patientsError } = await supabase
          .from("patient")
          .select(`
            id,
            name,
            spezies,
            rasse,
            geburtsdatum,
            bild_url
          `)
          .eq("besitzer_id", ownerId)
          .is("deleted_at", null);
        
        if (patientsError) throw patientsError;
        setPatients(patientsData);
      } catch (error) {
        console.error("Error fetching owner details:", error);
      } finally {
        setLoading(false);
      }
    };

    if (ownerId) {
      fetchOwnerDetails();
    }
  }, [ownerId]);

  const refreshPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("patient")
        .select(`
          id,
          name,
          spezies,
          rasse,
          geburtsdatum,
          bild_url
        `)
        .eq("besitzer_id", ownerId)
        .is("deleted_at", null);
      
      if (error) throw error;
      setPatients(data);
    } catch (error) {
      console.error("Error refreshing patients:", error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Laden...</div>;
  }

  if (!owner) {
    return <div className="p-8 text-center">Besitzer nicht gefunden.</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Besitzerdetails</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
              <p>{owner.name}</p>
            </div>
            {owner.email && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                <p>{owner.email}</p>
              </div>
            )}
            {owner.telefonnummer && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Telefon</h3>
                <p>{owner.telefonnummer}</p>
              </div>
            )}
            {owner.strasse && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Adresse</h3>
                <p>{owner.strasse}</p>
                <p>{owner.postleitzahl} {owner.stadt}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Patienten</CardTitle>
          <AddPatientDialog ownerId={ownerId} onSuccess={refreshPatients} />
        </CardHeader>
        <CardContent>
          <PatientList patients={patients} />
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerProfile;
