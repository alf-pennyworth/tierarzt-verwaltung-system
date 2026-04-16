
import { useEffect, useState } from "react";
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
import { SendOwnerInvite, AddOwnerDialog } from "@/components/owner";
import { useToast } from "@/components/ui/use-toast";

interface Owner {
  id: string;
  name: string;
  email: string | null;
  telefonnummer: string | null;
  stadt: string | null;
  auth_id: string | null;
}

const Owners = () => {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOwners = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("besitzer")
        .select(`
          id,
          name,
          email,
          telefonnummer,
          stadt,
          auth_id
        `)
        .is("deleted_at", null)
        .order("name");

      if (error) {
        throw error;
      }

      setOwners(data || []);
    } catch (error: any) {
      console.error("Error fetching owners:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Besitzer konnten nicht geladen werden.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Besitzerverzeichnis</CardTitle>
          <AddOwnerDialog />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Besitzer werden geladen...</div>
          ) : owners.length === 0 ? (
            <div className="text-center py-4">Keine Besitzer gefunden.</div>
          ) : (
            <Table>
              <caption className="sr-only">
                Besitzerverzeichnis mit {owners.length} Besitzern
              </caption>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Stadt</TableHead>
                  <TableHead>Portal-Status</TableHead>
                  <TableHead className="w-[100px]">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owners.map((owner) => (
                  <TableRow key={owner.id}>
                    <TableCell className="font-medium">{owner.name}</TableCell>
                    <TableCell>{owner.email || "-"}</TableCell>
                    <TableCell>{owner.telefonnummer || "-"}</TableCell>
                    <TableCell>{owner.stadt || "-"}</TableCell>
                    <TableCell>
                      {owner.auth_id ? (
                        <span className="text-green-600 font-medium">Registriert</span>
                      ) : (
                        <span className="text-gray-500">Nicht registriert</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {!owner.auth_id && owner.email && (
                        <SendOwnerInvite ownerId={owner.id} ownerEmail={owner.email} ownerName={owner.name} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Owners;
