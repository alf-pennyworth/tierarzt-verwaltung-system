
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Building, Briefcase, ArrowLeft } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";

interface EmployeeProfile {
  id: string;
  email: string;
  vorname: string;
  nachname: string;
  telefonnummer: string | null;
  profilbild_url: string | null;
  Raum: string | null;
  Fachrichtung: string | null;
  Gebäude: string | null;
}

const EmployeeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchEmployeeDetails = async () => {
      if (!id) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          throw error;
        }

        setEmployee(data);
        
        // Load profile image if it exists
        if (data?.profilbild_url) {
          try {
            const { data: imageData, error: imageError } = await supabase.storage
              .from('Profilbild')
              .createSignedUrl(data.profilbild_url, 3600);
            
            if (imageError) {
              throw imageError;
            }
            
            setImageUrl(imageData.signedUrl);
            setImageError(false);
          } catch (err) {
            console.error('Error getting signed image URL:', err);
            setImageError(true);
          }
        }
      } catch (error) {
        console.error('Error fetching employee details:', error);
        toast({
          title: "Fehler",
          description: "Mitarbeiterdetails konnten nicht geladen werden.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeDetails();
  }, [id]);

  const handleCallEmployee = () => {
    if (employee?.telefonnummer) {
      window.location.href = `tel:${employee.telefonnummer}`;
    }
  };

  const handleEmailEmployee = () => {
    if (employee?.email) {
      window.location.href = `mailto:${employee.email}`;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <Skeleton className="h-8 w-40" />
        </div>
        
        <Card className="w-full">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Skeleton className="h-32 w-32 rounded-full" />
            <div className="text-center">
              <Skeleton className="h-6 w-40 mx-auto" />
              <Skeleton className="h-4 w-24 mx-auto mt-2" />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start space-y-2">
            <div className="grid grid-cols-1 gap-2 w-full">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate('/employees')} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <h1 className="text-2xl font-bold">Mitarbeiter nicht gefunden</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate('/employees')} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <h1 className="text-2xl font-bold">Mitarbeiterdetails</h1>
      </div>
      
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Mitarbeiterprofil</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <Avatar className="h-32 w-32">
            {imageUrl && !imageError ? (
              <AvatarImage 
                src={imageUrl}
                alt={`${employee.vorname} ${employee.nachname}`}
                onError={() => {
                  console.error('Error loading profile image');
                  setImageError(true);
                }}
              />
            ) : (
              <AvatarFallback className="text-3xl">{employee.vorname.charAt(0)}{employee.nachname.charAt(0)}</AvatarFallback>
            )}
          </Avatar>
          
          <div className="text-center">
            <h3 className="text-xl font-semibold">{employee.vorname} {employee.nachname}</h3>
            <div className="flex items-center justify-center mt-1 text-muted-foreground">
              {employee.Fachrichtung && (
                <div className="flex items-center">
                  <Briefcase className="h-4 w-4 mr-1" />
                  <span>{employee.Fachrichtung}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex space-x-4">
            {employee.telefonnummer && (
              <Button onClick={handleCallEmployee} variant="outline">
                <Phone className="mr-2 h-4 w-4" />
                Anrufen
              </Button>
            )}
            
            <Button onClick={handleEmailEmployee} variant="outline">
              <Mail className="mr-2 h-4 w-4" />
              E-Mail
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start space-y-2">
          <div className="grid grid-cols-1 gap-2 w-full">
            <div className="flex items-center">
              <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{employee.email}</span>
            </div>
            
            {employee.telefonnummer && (
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{employee.telefonnummer}</span>
              </div>
            )}
            
            {employee.Gebäude && (
              <div className="flex items-center">
                <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{employee.Gebäude}</span>
              </div>
            )}
            
            {employee.Raum && (
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>Raum {employee.Raum}</span>
              </div>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default EmployeeDetail;
