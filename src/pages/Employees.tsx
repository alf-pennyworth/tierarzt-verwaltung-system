
import React, { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from 'react-router-dom';
import { Briefcase, Building, MapPin, UserPlus } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "../hooks/useAuth";
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

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [praxisName, setPraxisName] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        console.log("Employees.tsx: Starting fetchEmployees");
        setError(null);
        
        if (!user) {
          console.log("Employees.tsx: No user found");
          setLoading(false);
          return;
        }
        
        console.log("Employees.tsx: Fetching profile for user ID:", user.id);
        // First get the current user's praxis_id
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('praxis_id')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          console.error('Employees.tsx: Error fetching profile:', profileError);
          setError('Fehler beim Laden des Profils');
          setLoading(false);
          toast({
            title: "Fehler",
            description: "Ihr Profil konnte nicht geladen werden.",
            variant: "destructive"
          });
          return;
        }
        
        console.log("Employees.tsx: Profile data:", profileData);
        
        if (!profileData.praxis_id) {
          console.log("Employees.tsx: No praxis_id found for user");
          setError('Keine Praxis zugeordnet');
          setLoading(false);
          toast({
            title: "Warnung",
            description: "Sie sind keiner Praxis zugeordnet.",
            variant: "destructive"
          });
          return;
        }
        
        console.log("Employees.tsx: Fetching praxis name for ID:", profileData.praxis_id);
        // Get praxis name
        const { data: praxisData, error: praxisError } = await supabase
          .from('praxis')
          .select('name')
          .eq('id', profileData.praxis_id)
          .single();
          
        if (!praxisError && praxisData) {
          console.log("Employees.tsx: Praxis name:", praxisData.name);
          setPraxisName(praxisData.name);
        } else {
          console.error('Employees.tsx: Error fetching praxis name:', praxisError);
        }
        
        console.log("Employees.tsx: Fetching employees for praxis ID:", profileData.praxis_id);
        // Fetch all employees from the same praxis
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('praxis_id', profileData.praxis_id)
          .order('nachname');

        if (error) {
          console.error('Employees.tsx: Error fetching employees:', error);
          setError('Fehler beim Laden der Mitarbeiter');
          toast({
            title: "Fehler",
            description: "Mitarbeiter konnten nicht geladen werden.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        console.log("Employees.tsx: Employees data:", data);

        if (!data || data.length === 0) {
          // No error, but no employees found
          console.log("Employees.tsx: No employees found");
          setEmployees([]);
          setLoading(false);
          return;
        }

        // Load profile images for employees with profile pictures
        console.log("Employees.tsx: Loading profile images");
        const employeesWithImages = await Promise.all(
          data.map(async (employee) => {
            if (employee.profilbild_url) {
              try {
                const { data: imageData, error: imageError } = await supabase.storage
                  .from('Profilbild')
                  .createSignedUrl(employee.profilbild_url, 3600);
                
                if (!imageError && imageData) {
                  return { ...employee, imageUrl: imageData.signedUrl };
                }
              } catch (err) {
                console.error('Employees.tsx: Error getting signed image URL:', err);
              }
            }
            return { ...employee, imageUrl: null };
          })
        );

        console.log("Employees.tsx: Setting employees state with data");
        setEmployees(employeesWithImages);
      } catch (error) {
        console.error('Employees.tsx: Error in fetchEmployees:', error);
        setError('Ein unerwarteter Fehler ist aufgetreten');
        toast({
          title: "Fehler",
          description: "Ein unerwarteter Fehler ist aufgetreten.",
          variant: "destructive"
        });
      } finally {
        console.log("Employees.tsx: Finished loading employees");
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [user]);

  const handleEmployeeClick = (employeeId: string) => {
    navigate(`/employees/${employeeId}`);
  };

  if (error === 'Keine Praxis zugeordnet') {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Mitarbeiterverzeichnis</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
          <p className="text-amber-800">
            Sie sind keiner Praxis zugeordnet. Bitte kontaktieren Sie Ihren Administrator,
            um einer Praxis zugewiesen zu werden.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mitarbeiterverzeichnis</h1>
        {praxisName && <span className="text-muted-foreground">{praxisName}</span>}
      </div>
      
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
      ) : error && error !== 'Keine Praxis zugeordnet' ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-800">{error}</p>
          <Button 
            variant="outline" 
            className="mt-2"
            onClick={() => window.location.reload()}
          >
            Erneut versuchen
          </Button>
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12">
          <UserPlus className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Keine Mitarbeiter gefunden</h3>
          <p className="mt-1 text-sm text-gray-500">
            Es wurden keine Mitarbeiter in Ihrer Praxis gefunden.
          </p>
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
                          {employee.vorname && employee.nachname ? 
                            `${employee.vorname.charAt(0)}${employee.nachname.charAt(0)}` : 
                            'NA'}
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
