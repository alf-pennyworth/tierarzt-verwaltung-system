
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SendOwnerInvite } from "@/components/owner";
import { Mail, UserPlus } from "lucide-react";

interface Owner {
  id: string;
  name: string;
  email: string | null;
  telefonnummer: string | null;
  auth_id: string | null;
  invitation_sent_at: string | null;
}

const Owners = () => {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const fetchOwners = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("besitzer")
        .select("id, name, email, telefonnummer, auth_id, invitation_sent_at")
        .order("name");

      if (error) throw error;
      setOwners(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler beim Laden der Besitzer",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  const refreshOwners = () => {
    fetchOwners();
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Besitzerverzeichnis</h1>
        <SendOwnerInvite />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Besitzerliste</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Besitzer werden geladen...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Portal-Status</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Keine Besitzer gefunden
                    </TableCell>
                  </TableRow>
                ) : (
                  owners.map((owner) => (
                    <TableRow key={owner.id}>
                      <TableCell>{owner.name}</TableCell>
                      <TableCell>{owner.email || "-"}</TableCell>
                      <TableCell>{owner.telefonnummer || "-"}</TableCell>
                      <TableCell>
                        {owner.auth_id ? (
                          <span className="text-green-600 font-medium">
                            Registriert
                          </span>
                        ) : owner.invitation_sent_at ? (
                          <span className="text-amber-600 font-medium">
                            Eingeladen
                          </span>
                        ) : (
                          <span className="text-gray-500">Nicht eingeladen</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!owner.auth_id && (
                          <SendOwnerInvite 
                            ownerId={owner.id} 
                            ownerEmail={owner.email || undefined} 
                            ownerName={owner.name}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Owners;
