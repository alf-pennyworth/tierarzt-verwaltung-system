
import React, { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from 'react-router-dom';
import { Briefcase, Building, MapPin } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "../hooks/useAuth";

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
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        // First get the current user's praxis_id
        if (!user) return;
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('praxis_id')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          throw profileError;
        }
        
        if (!profileData.praxis_id) {
          toast({
            title: "Warnung",
            description: "Sie sind keiner Praxis zugeordnet.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
        
        // Fetch all employees from the same praxis
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('praxis_id', profileData.praxis_id)
          .order('nachname');

        if (error) {
          throw error;
        }

        // Load profile images for employees with profile pictures
        const employeesWithImages = await Promise.all(
          (data || []).map(async (employee) => {
            if (employee.profilbild_url) {
              try {
                const { data: imageData, error: imageError } = await supabase.storage
                  .from('Profilbild')
                  .createSignedUrl(employee.profilbild_url, 3600);
                
                if (!imageError) {
                  return { ...employee, imageUrl: imageData.signedUrl };
                }
              } catch (err) {
                console.error('Error getting signed image URL:', err);
              }
            }
            return { ...employee, imageUrl: null };
          })
        );

        setEmployees(employeesWithImages);
      } catch (error) {
        console.error('Error fetching employees:', error);
        toast({
          title: "Fehler",
          description: "Mitarbeiter konnten nicht geladen werden.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [user]);

  const handleEmployeeClick = (employeeId: string) => {
    navigate(`/employees/${employeeId}`);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Mitarbeiterverzeichnis</h1>
      
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
                          {employee.vorname.charAt(0)}{employee.nachname.charAt(0)}
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
