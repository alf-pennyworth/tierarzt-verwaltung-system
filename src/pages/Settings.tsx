import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { Settings as SettingsIcon, Building2, Phone, MapPin } from 'lucide-react';

interface PracticeSettings {
  id: string;
  name: string;
  betriebsnummer: string | null;
  strasse?: string | null;
  plz?: string | null;
  stadt?: string | null;
  telefonnummer?: string | null;
}

interface SettingsFormData {
  name: string;
  betriebsnummer: string;
  strasse: string;
  plz: string;
  stadt: string;
  telefonnummer: string;
}

const Settings: React.FC = () => {
  const { userInfo, loading: authLoading } = useAuth();
  const [practice, setPractice] = useState<PracticeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsFormData>({
    defaultValues: {
      name: '',
      betriebsnummer: '',
      strasse: '',
      plz: '',
      stadt: '',
      telefonnummer: '',
    },
  });

  // BNR15 validation: 15 digits
  const validateBNR15 = (value: string) => {
    if (!value) return true; // Optional field
    const cleaned = value.replace(/\s/g, '');
    if (!/^\d{15}$/.test(cleaned)) {
      return 'BNR15 muss aus 15 Ziffern bestehen';
    }
    return true;
  };

  // German postal code validation: 5 digits
  const validatePLZ = (value: string) => {
    if (!value) return true;
    if (!/^\d{5}$/.test(value)) {
      return 'Postleitzahl muss aus 5 Ziffern bestehen';
    }
    return true;
  };

  // Phone validation: German format
  const validatePhone = (value: string) => {
    if (!value) return true;
    const cleaned = value.replace(/[\s\-()]/g, '');
    if (!/^(?:\+49|0049|0)[1-9]\d+$/.test(cleaned)) {
      return 'Ungültige Telefonnummer';
    }
    return true;
  };

  useEffect(() => {
    const fetchPractice = async () => {
      if (!userInfo?.praxisId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('praxis')
          .select('*')
          .eq('id', userInfo.praxisId)
          .single();

        if (error) {
          console.error('Error fetching practice:', error);
          toast({
            title: 'Fehler',
            description: 'Praxisdaten konnten nicht geladen werden.',
            variant: 'destructive',
          });
        } else if (data) {
          setPractice(data);
          reset({
            name: data.name || '',
            betriebsnummer: data.betriebsnummer || '',
            strasse: (data as any).strasse || '',
            plz: (data as any).plz || '',
            stadt: (data as any).stadt || '',
            telefonnummer: (data as any).telefonnummer || '',
          });
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchPractice();
    }
  }, [userInfo, authLoading, reset]);

  const onSubmit = async (data: SettingsFormData) => {
    if (!practice) return;

    setSaving(true);
    try {
      // Format BNR15 (remove spaces, keep as string)
      const betriebsnummer = data.betriebsnummer.replace(/\s/g, '') || null;

      const { error } = await supabase
        .from('praxis')
        .update({
          name: data.name,
          betriebsnummer: betriebsnummer,
        })
        .eq('id', practice.id);

      if (error) {
        console.error('Error updating practice:', error);
        toast({
          title: 'Fehler beim Speichern',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erfolgreich gespeichert',
          description: 'Praxisdaten wurden aktualisiert.',
        });
        // Update local state
        setPractice({
          ...practice,
          name: data.name,
          betriebsnummer: betriebsnummer,
        });
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({
        title: 'Fehler',
        description: 'Ein unerwarteter Fehler ist aufgetreten.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!userInfo?.praxisId) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Keine Praxis zugeordnet.</p>
              <p className="text-sm mt-2">Bitte kontaktieren Sie den Administrator.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold">Einstellungen</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Praxisdaten
          </CardTitle>
          <CardDescription>
            Verwalten Sie die Stammdaten Ihrer Tierarztpraxis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Practice Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Praxisname *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Tierarztpraxis Muster"
                {...register('name', { required: 'Praxisname ist erforderlich' })}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            {/* BNR15 - Betriebsnummer */}
            <div className="space-y-2">
              <Label htmlFor="betriebsnummer">Betriebsnummer (BNR15)</Label>
              <Input
                id="betriebsnummer"
                type="text"
                placeholder="123456789012345"
                maxLength={15}
                {...register('betriebsnummer', { validate: validateBNR15 })}
              />
              {errors.betriebsnummer && (
                <p className="text-sm text-destructive">{errors.betriebsnummer.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Die 15-stellige Betriebsnummer gemäß HIT-Verfahren (optional)
              </p>
            </div>

            {/* Address Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium">Adresse</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="strasse">Straße und Hausnummer</Label>
                  <Input
                    id="strasse"
                    type="text"
                    placeholder="Musterstraße 123"
                    {...register('strasse')}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Feld erfordert Datenbank-Erweiterung
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plz">PLZ</Label>
                  <Input
                    id="plz"
                    type="text"
                    placeholder="12345"
                    maxLength={5}
                    {...register('plz', { validate: validatePLZ })}
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stadt">Stadt</Label>
                <Input
                  id="stadt"
                  type="text"
                  placeholder="Musterstadt"
                  {...register('stadt')}
                  disabled
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="telefonnummer" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefonnummer
              </Label>
              <Input
                id="telefonnummer"
                type="tel"
                placeholder="+49 30 12345678"
                {...register('telefonnummer', { validate: validatePhone })}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Feld erfordert Datenbank-Erweiterung
              </p>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <Button type="submit" disabled={saving || !isDirty}>
                {saving ? 'Speichern...' : 'Speichern'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => reset()}
                disabled={!isDirty}
              >
                Zurücksetzen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="text-amber-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <div>
                <p className="font-medium text-amber-800">Hinweis zur Datenbank-Erweiterung</p>
                <p className="text-sm text-amber-700 mt-1">
                  Die Felder für Adresse und Telefonnummer sind derzeit in der Datenbank noch nicht verfügbar.
                  Um diese zu aktivieren, müssen folgende Spalten zur Tabelle <code className="bg-amber-100 px-1 rounded">praxis</code> hinzugefügt werden:
                </p>
                <pre className="text-xs text-amber-800 bg-amber-100 p-2 rounded mt-2 overflow-x-auto">
{`ALTER TABLE praxis ADD COLUMN strasse TEXT;
ALTER TABLE praxis ADD COLUMN plz TEXT;
ALTER TABLE praxis ADD COLUMN stadt TEXT;
ALTER TABLE praxis ADD COLUMN telefonnummer TEXT;`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;