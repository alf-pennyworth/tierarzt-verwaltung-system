import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import ProfileForm from "@/components/ProfileForm";
import PatientList from "@/components/PatientList";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  email: string;
  vorname: string;
  nachname: string;
  telefonnummer: string | null;
  profilbild_url?: string | null;
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

  // Fetch the profile info from Supabase
  const fetchProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) {
      console.error('Error fetching profile:', error);
    } else {
      setProfile(data);
    }
  };

  // Fetch the patients that belong to the current vet
  const fetchPatients = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('patient')
      .select('*')
      .eq('behandelnder_arzt', user.id);
    if (error) {
      console.error('Error fetching patients:', error);
    } else {
      setPatients(data);
    }
  };

  useEffect(() => {
    if (user) {
      Promise.all([fetchProfile(), fetchPatients()]).then(() => setLoading(false));
    }
  }, [user]);

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>Error loading profile.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Profilseite</h1>
      <div className="mb-8">
        <ProfileForm profile={profile} refreshProfile={fetchProfile} />
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Meine Patienten</h2>
        <PatientList patients={patients} />
      </div>
    </div>
  );
};

export default ProfilePage;
