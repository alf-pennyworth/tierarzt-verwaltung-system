
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
import { AddPatientDialog } from "@/components/patient";
import { Loader2, PawPrint, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const fetchPatients = async () => {
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // Filter patients by search term
  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.besitzer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.spezies.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Patientenliste</CardTitle>
          <AddPatientDialog onSuccess={fetchPatients} />
        </CardHeader>
        <CardContent>
          {/* Search Input */}
          {patients.length > 0 && (
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nach Name, Besitzer oder Spezies suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Patienten werden geladen...</p>
            </div>
          ) : patients.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <PawPrint className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Keine Patienten vorhanden</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Sie haben noch keine Patienten angelegt. Klicken Sie auf "Patient hinzufügen", um Ihren ersten Patienten anzulegen.
              </p>
              <AddPatientDialog onSuccess={fetchPatients} buttonVariant="outline" />
            </div>
          ) : filteredPatients.length === 0 ? (
            /* No Search Results */
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Keine Ergebnisse gefunden</h3>
              <p className="text-muted-foreground">
                Kein Patient gefunden f&uuml;r "{searchTerm}".
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Name</TableHead>
                    <TableHead className="whitespace-nowrap">Besitzer</TableHead>
                    <TableHead className="hidden sm:table-cell whitespace-nowrap">Spezies</TableHead>
                    <TableHead className="hidden md:table-cell whitespace-nowrap">Rasse</TableHead>
                    <TableHead className="whitespace-nowrap">Geburtsdatum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow
                      key={patient.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/patient/${patient.id}`)}
                    >
                      <TableCell className="whitespace-nowrap">{patient.name}</TableCell>
                      <TableCell className="whitespace-nowrap">
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
                      <TableCell className="hidden sm:table-cell">{patient.spezies}</TableCell>
                      <TableCell className="hidden md:table-cell">{patient.rasse || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {patient.geburtsdatum
                          ? format(new Date(patient.geburtsdatum), "dd.MM.yyyy")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientList;
