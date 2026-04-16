
import React, { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Briefcase, Building, MapPin, RefreshCcw } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "../hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface Employee {
  id: string;
  email: string;
  vorname: string;
  nachname: string;
  telefonnummer: string | null;
  profilbild_url: string | null;
  Raum: string | null;
  Fachrichtung: string | null;
  Gebäude: string | null;
  praxis_id: string | null;
  imageUrl?: string | null;
}

interface PraxisInfo {
  id: string;
  name: string;
}

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [praxis, setPraxis] = useState<PraxisInfo | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching employees, user:", user?.id);
      
      if (!user) {
        console.log("No user found, stopping fetch");
        setLoading(false);
        return;
      }

      // First get the current user's praxis_id
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('praxis_id')
        .eq('id', user.id)
        .single();
      
      console.log("Profile data:", profileData, "Profile error:", profileError);
        
      if (profileError) {
        console.error("Profile error:", profileError);
        throw profileError;
      }
      
      if (!profileData || !profileData.praxis_id) {
        console.log("No praxis_id found for user");
        setError("Sie sind keiner Praxis zugeordnet.");
        setLoading(false);
        return;
      }

      // Get praxis info
      const { data: praxisData, error: praxisError } = await supabase
        .from('praxis')
        .select('id, name')
        .eq('id', profileData.praxis_id)
        .single();

      console.log("Praxis data:", praxisData, "Praxis error:", praxisError);

      if (praxisError) {
        console.error("Praxis error:", praxisError);
        if (praxisError.code === 'PGRST116') {
          setError("Die zugeordnete Praxis existiert nicht.");
        } else {
          throw praxisError;
        }
        setLoading(false);
        return;
      }

      setPraxis(praxisData);
      
      // Fetch all employees from the same praxis
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('praxis_id', profileData.praxis_id)
        .order('nachname');

      console.log("Employees data:", data, "Employees error:", error);

      if (error) {
        console.error("Error fetching employees:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log("No employees found for this praxis");
        setEmployees([]);
        setLoading(false);
        return;
      }

      // Batch load profile images for employees with profile pictures
      const profilePaths = data
        .filter(e => e.profilbild_url)
        .map(e => e.profilbild_url);

      let signedUrls: Record<string, string> = {};
      
      if (profilePaths.length > 0) {
        const { data: urlsData, error: urlsError } = await supabase.storage
          .from('Profilbild')
          .createSignedUrls(profilePaths, 3600);
        
        if (!urlsError && urlsData) {
          urlsData.forEach((item: any) => {
            if (item.signedURL && item.path) {
              signedUrls[item.path] = item.signedURL;
            }
          });
        } else if (urlsError) {
          console.error('Error batch fetching signed URLs:', urlsError);
        }
      }

      const employeesWithImages = data.map(employee => ({
        ...employee,
        imageUrl: employee.profilbild_url ? (signedUrls[employee.profilbild_url] || null) : null
      }));

      setEmployees(employeesWithImages);
    } catch (error: any) {
      console.error('Error in fetchEmployees:', error);
      setError(`Fehler beim Laden der Mitarbeiter: ${error.message || 'Unbekannter Fehler'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [user]);

  const handleEmployeeClick = (employeeId: string) => {
    navigate(`/employees/${employeeId}`);
  };

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Mitarbeiterverzeichnis</h1>
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fehler</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button 
          onClick={fetchEmployees}
          className="flex items-center gap-2"
        >
          <RefreshCcw className="h-4 w-4" />
          Erneut versuchen
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">Mitarbeiterverzeichnis</h1>
      {praxis && (
        <p className="text-muted-foreground mb-6">
          Praxis: {praxis.name}
        </p>
      )}
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="h-[180px]">
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground mb-4">
            Keine Mitarbeiter in dieser Praxis gefunden.
          </p>
          <Button 
            onClick={fetchEmployees}
            className="flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Aktualisieren
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((employee) => (
            <Card 
              key={employee.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleEmployeeClick(employee.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div>
                    <Avatar className="h-16 w-16">
                      {employee.imageUrl ? (
                        <AvatarImage 
                          src={employee.imageUrl} 
                          alt={`${employee.vorname} ${employee.nachname}`}
                          onError={(e) => {
                            e.currentTarget.src = "";
                          }}
                        />
                      ) : (
                        <AvatarFallback className="text-xl">
                          {employee.vorname?.charAt(0) || ""}
                          {employee.nachname?.charAt(0) || ""}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="font-medium text-lg">
                      {employee.vorname} {employee.nachname}
                    </div>
                    
                    {employee.Fachrichtung && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Briefcase className="mr-1 h-4 w-4" />
                        {employee.Fachrichtung}
                      </div>
                    )}
                    
                    {employee.Gebäude && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Building className="mr-1 h-4 w-4" />
                        {employee.Gebäude}
                        {employee.Raum && `, Raum ${employee.Raum}`}
                      </div>
                    )}
                    
                    {!employee.Gebäude && employee.Raum && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="mr-1 h-4 w-4" />
                        Raum {employee.Raum}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Employees;
