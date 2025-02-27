import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from "@/integrations/supabase/client";
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';

interface ProfileFormProps {
  profile: {
    id: string;
    email: string;
    vorname: string;
    nachname: string;
    telefonnummer: string | null;
    profilbild_url?: string | null;
  };
  refreshProfile: () => void;
}

interface FormValues {
  email: string;
  nachname: string;
  telefonnummer: string;
  profilbild: FileList;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ profile, refreshProfile }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    defaultValues: {
      email: profile.email,
      nachname: profile.nachname,
      telefonnummer: profile.telefonnummer || '',
    },
  });

  const [preview, setPreview] = useState<string | null>(profile.profilbild_url || null);

  const onSubmit = async (data: FormValues) => {
    try {
      let profilbild_url = profile.profilbild_url;

      // If a new profile picture is selected, upload it
      if (data.profilbild && data.profilbild.length > 0) {
        const file = data.profilbild[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${profile.id}.${fileExt}`;
        const filePath = `profilbild/${fileName}`;

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('Profilbild')
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          setError('profilbild', { message: uploadError.message });
          return;
        }
        profilbild_url = uploadData.path;
      }

      // Update the profile in Supabase
      const { error } = await supabase
        .from('profiles')
        .update({
          email: data.email,
          nachname: data.nachname,
          telefonnummer: data.telefonnummer,
          profilbild_url: profilbild_url,
        })
        .eq('id', profile.id);

      if (error) {
        console.error('Error updating profile:', error);
      } else {
        refreshProfile();
      }
    } catch (error) {
      console.error('Submission error:', error);
    }
  };

  // Update preview when a file is selected
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      {/* Vorname (read-only) */}
      <div>
        <Label htmlFor="vorname">Vorname</Label>
        <Input id="vorname" type="text" value={profile.vorname} disabled className="bg-gray-100" />
      </div>

      {/* Editable Nachname */}
      <div>
        <Label htmlFor="nachname">Nachname</Label>
        <Input
          id="nachname"
          type="text"
          {...register('nachname', { required: 'Nachname ist erforderlich' })}
        />
        {errors.nachname && <p className="text-red-500 text-sm">{errors.nachname.message}</p>}
      </div>

      {/* Editable E-Mail */}
      <div>
        <Label htmlFor="email">E-Mail</Label>
        <Input
          id="email"
          type="email"
          {...register('email', {
            required: 'E-Mail ist erforderlich',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Ungültige E-Mail-Adresse',
            },
          })}
        />
        {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
      </div>

      {/* Editable Telefonnummer */}
      <div>
        <Label htmlFor="telefonnummer">Telefonnummer</Label>
        <Input
          id="telefonnummer"
          type="text"
          {...register('telefonnummer', {
            required: 'Telefonnummer ist erforderlich',
            pattern: {
              value: /^[0-9+\s()-]+$/,
              message: 'Ungültige Telefonnummer',
            },
          })}
        />
        {errors.telefonnummer && <p className="text-red-500 text-sm">{errors.telefonnummer.message}</p>}
      </div>

      {/* Profile picture upload with preview */}
      <div>
        <Label htmlFor="profilbild">Profilbild</Label>
        <div className="flex items-center space-x-4">
          <Avatar>
            {preview ? (
              <AvatarImage src={preview} alt="Profilbild" />
            ) : (
              <AvatarFallback>{profile.vorname.charAt(0)}</AvatarFallback>
            )}
          </Avatar>
          <Input
            id="profilbild"
            type="file"
            accept="image/*"
            {...register('profilbild')}
            onChange={handleFileChange}
          />
        </div>
        {errors.profilbild && <p className="text-red-500 text-sm">{errors.profilbild.message}</p>}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Speichern...' : 'Speichern'}
      </Button>
    </form>
  );
};

export default ProfileForm;
