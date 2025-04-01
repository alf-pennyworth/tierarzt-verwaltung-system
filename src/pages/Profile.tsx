
import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import ProfileForm from "@/components/ProfileForm";
import PatientList from "@/components/PatientList";
import UserCard from "@/components/UserCard";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

export interface Profile {
  id: string;
  email: string;
  vorname: string;
  nachname: string;
  telefonnummer: string | null;
  profilbild_url?: string | null;
  Raum?: string | null;
  Fachrichtung?: string | null;
  Gebäude?: string | null;
}

export interface Patient {
  id: string;
  name: string;
  bild_url: string | null;
  spezies: string;
  rasse: string;
  geburtsdatum: string;
}

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch the profile info from Supabase
  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      // First check if profile exists
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        
        // If profile doesn't exist, create one
        if (error.code === 'PGRST116') {
          const userDetails = await supabase.auth.getUser();
          const email = userDetails.data.user?.email || '';
          
          // Create a basic profile
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              { 
                id: user.id,
                email: email,
                vorname: 'Neuer',
                nachname: 'Benutzer' 
              }
            ])
            .select()
            .single();
            
          if (createError) {
            console.error('Error creating profile:', createError);
            setError('Fehler beim Erstellen des Profils.');
          } else {
            setProfile(newProfile);
            toast({
              title: "Profil erstellt",
              description: "Ein neues Profil wurde für Sie erstellt. Bitte aktualisieren Sie Ihre Daten.",
            });
          }
        } else {
          setError('Fehler beim Laden des Profils.');
        }
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Ein unerwarteter Fehler ist aufgetreten.');
    }
  };

  // Fetch the patients that belong to the current vet
  const fetchPatients = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('patient')
        .select('*')
        .eq('behandelnder_arzt', user.id);
        
      if (error) {
        console.error('Error fetching patients:', error);
      } else {
        setPatients(data || []);
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  useEffect(() => {
    if (user) {
      Promise.all([fetchProfile(), fetchPatients()]).then(() => setLoading(false));
    }
  }, [user]);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Profilseite</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <Skeleton className="h-[400px] w-full" />
          </div>
          <div>
            <Skeleton className="h-[200px] w-full mb-4" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Fehler</h2>
          <p className="text-red-700">{error}</p>
          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={() => navigate('/')}
          >
            Zurück zur Startseite
          </Button>
        </div>
      </div>
    );
  }
  
  if (!profile) return <div className="container mx-auto p-4">Error loading profile.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Profilseite</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column - Profile Form */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Profildetails bearbeiten</h2>
          <div className="bg-card rounded-lg border p-6">
            <ProfileForm profile={profile} refreshProfile={fetchProfile} />
          </div>
        </div>
        
        {/* Right Column - User Card and Patient List */}
        <div className="space-y-8">
          {/* User Card */}
          <UserCard profile={profile} />
          
          {/* Patient List */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Meine Patienten</h2>
            <PatientList patients={patients} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
