
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from "@/integrations/supabase/client";
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { toast } from './ui/use-toast';

interface ProfileFormProps {
  profile: {
    id: string;
    email: string;
    vorname: string;
    nachname: string;
    telefonnummer: string | null;
    profilbild_url?: string | null;
    Raum?: string | null;
    Fachrichtung?: string | null;
    Gebäude?: string | null;
  };
  refreshProfile: () => void;
}

interface FormValues {
  email: string;
  nachname: string;
  telefonnummer: string;
  Raum: string;
  Fachrichtung: string;
  Gebäude: string;
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
      Raum: profile.Raum || '',
      Fachrichtung: profile.Fachrichtung || '',
      Gebäude: profile.Gebäude || '',
    },
  });

  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const loadProfileImagePreview = async () => {
      if (profile.profilbild_url) {
        try {
          const { data, error } = await supabase.storage
            .from('Profilbild')
            .createSignedUrl(profile.profilbild_url, 3600);
          
          if (error) {
            console.error('Error creating signed URL for preview:', error);
            return;
          }
          
          setPreview(data.signedUrl);
          console.log('Preview signed URL set:', data.signedUrl);
        } catch (error) {
          console.error('Error getting signed URL for preview:', error);
        }
      }
    };

    loadProfileImagePreview();
  }, [profile.profilbild_url]);

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

  const onSubmit = async (data: FormValues) => {
    try {
      setIsUploading(true);
      let profilbild_url = profile.profilbild_url;

      if (data.profilbild && data.profilbild.length > 0) {
        const file = data.profilbild[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${profile.id}/${Date.now()}.${fileExt}`;
        const filePath = fileName;

        console.log('Uploading file:', filePath);
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('Profilbild')
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({
            title: "Fehler beim Hochladen",
            description: uploadError.message,
            variant: "destructive"
          });
          setError('profilbild', { message: uploadError.message });
          setIsUploading(false);
          return;
        }
        
        console.log('Upload successful:', uploadData);
        profilbild_url = filePath;
      }

      console.log('Updating profile with:', {
        email: data.email,
        nachname: data.nachname,
        telefonnummer: data.telefonnummer,
        profilbild_url,
        Raum: data.Raum || null,
        Fachrichtung: data.Fachrichtung || null,
        Gebäude: data.Gebäude || null,
      });
      
      const { error } = await supabase
        .from('profiles')
        .update({
          email: data.email,
          nachname: data.nachname,
          telefonnummer: data.telefonnummer,
          profilbild_url: profilbild_url,
          Raum: data.Raum || null,
          Fachrichtung: data.Fachrichtung || null,
          Gebäude: data.Gebäude || null,
        })
        .eq('id', profile.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast({
          title: "Fehler beim Speichern",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erfolg",
          description: "Profil erfolgreich aktualisiert",
        });
        refreshProfile();
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="vorname">Vorname</Label>
        <Input id="vorname" type="text" value={profile.vorname} disabled className="bg-gray-100" />
      </div>

      <div>
        <Label htmlFor="nachname">Nachname</Label>
        <Input
          id="nachname"
          type="text"
          {...register('nachname', { required: 'Nachname ist erforderlich' })}
        />
        {errors.nachname && <p className="text-red-500 text-sm">{errors.nachname.message}</p>}
      </div>

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

      <div>
        <Label htmlFor="telefonnummer">Telefonnummer</Label>
        <Input
          id="telefonnummer"
          type="text"
          {...register('telefonnummer', {
            pattern: {
              value: /^[0-9+\s()-]*$/,
              message: 'Ungültige Telefonnummer',
            },
          })}
        />
        {errors.telefonnummer && <p className="text-red-500 text-sm">{errors.telefonnummer.message}</p>}
      </div>

      <div>
        <Label htmlFor="Fachrichtung">Fachrichtung</Label>
        <Input
          id="Fachrichtung"
          type="text"
          {...register('Fachrichtung')}
        />
      </div>

      <div>
        <Label htmlFor="Gebäude">Gebäude</Label>
        <Input
          id="Gebäude"
          type="text"
          {...register('Gebäude')}
        />
      </div>

      <div>
        <Label htmlFor="Raum">Raum</Label>
        <Input
          id="Raum"
          type="text"
          {...register('Raum')}
        />
      </div>

      <div>
        <Label htmlFor="profilbild">Profilbild</Label>
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            {preview ? (
              <AvatarImage src={preview} alt="Profilbild" />
            ) : (
              <AvatarFallback>{profile.vorname.charAt(0)}{profile.nachname.charAt(0)}</AvatarFallback>
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

      <Button type="submit" disabled={isSubmitting || isUploading}>
        {(isSubmitting || isUploading) ? 'Speichern...' : 'Speichern'}
      </Button>
    </form>
  );
};

export default ProfileForm;
