
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { PatientDialog } from "@/components/patient";

interface Patient {
  id: string;
  name: string;
  spezies: string;
  rasse: string | null;
  geburtsdatum: string | null;
  besitzer: {
    id: string;
    name: string;
  };
}

const PatientList = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const navigate = useNavigate();

  const fetchPatients = async () => {
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
          name
        )
      `)
      .is("deleted_at", null);

    if (error) {
      console.error("Error fetching patients:", error);
      return;
    }

    if (data) {
      setPatients(data);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Patientenliste</CardTitle>
          <AddPatientDialog onSuccess={fetchPatients} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Besitzer</TableHead>
                <TableHead>Spezies</TableHead>
                <TableHead>Rasse</TableHead>
                <TableHead>Geburtsdatum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Keine Patienten gefunden. Legen Sie einen neuen Patienten an.
                  </TableCell>
                </TableRow>
              ) : (
                patients.map((patient) => (
                  <TableRow
                    key={patient.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/patient/${patient.id}`)}
                  >
                    <TableCell>{patient.name}</TableCell>
                    <TableCell>
                      <span 
                        className="cursor-pointer hover:underline" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/owner/${patient.besitzer.id}`);
                        }}
                      >
                        {patient.besitzer.name}
                      </span>
                    </TableCell>
                    <TableCell>{patient.spezies}</TableCell>
                    <TableCell>{patient.rasse || "-"}</TableCell>
                    <TableCell>
                      {patient.geburtsdatum
                        ? format(new Date(patient.geburtsdatum), "dd.MM.yyyy")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientList;
