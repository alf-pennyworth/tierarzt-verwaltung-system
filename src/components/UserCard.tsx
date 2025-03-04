
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { LogOut, MapPin, Building, Briefcase, Phone, Mail } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';
import { toast } from './ui/use-toast';

interface UserCardProps {
  profile: {
    vorname: string;
    nachname: string;
    email: string;
    telefonnummer: string | null;
    profilbild_url?: string | null;
    Raum?: string | null;
    Fachrichtung?: string | null;
    Gebäude?: string | null;
  };
}

const UserCard: React.FC<UserCardProps> = ({ profile }) => {
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: "Abgemeldet",
        description: "Sie wurden erfolgreich abgemeldet"
      });
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Abmelden",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Benutzerprofil</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleLogout}
          className="text-destructive hover:bg-destructive/10"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Abmelden
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        <Avatar className="h-32 w-32">
          {profile.profilbild_url ? (
            <AvatarImage 
              src={`${supabase.storage.from('Profilbild').getPublicUrl(profile.profilbild_url).data.publicUrl}?t=${new Date().getTime()}`} 
              alt={`${profile.vorname} ${profile.nachname}`} 
            />
          ) : (
            <AvatarFallback className="text-3xl">{profile.vorname.charAt(0)}{profile.nachname.charAt(0)}</AvatarFallback>
          )}
        </Avatar>
        
        <div className="text-center">
          <h3 className="text-xl font-semibold">{profile.vorname} {profile.nachname}</h3>
          <div className="flex items-center justify-center mt-1 text-muted-foreground">
            {profile.Fachrichtung && (
              <div className="flex items-center">
                <Briefcase className="h-4 w-4 mr-1" />
                <span>{profile.Fachrichtung}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start space-y-2">
        <div className="grid grid-cols-1 gap-2 w-full">
          <div className="flex items-center">
            <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>{profile.email}</span>
          </div>
          
          {profile.telefonnummer && (
            <div className="flex items-center">
              <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{profile.telefonnummer}</span>
            </div>
          )}
          
          {profile.Gebäude && (
            <div className="flex items-center">
              <Building className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{profile.Gebäude}</span>
            </div>
          )}
          
          {profile.Raum && (
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>Raum {profile.Raum}</span>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default UserCard;
