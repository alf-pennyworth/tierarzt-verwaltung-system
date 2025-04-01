
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Search, RefreshCw } from 'lucide-react';

interface Medication {
  id: string;
  name: string;
  masseinheit: string;
  eingangs_nr?: string;
  packungsbeschreibung?: string;
  medication_type_id?: string;
}

interface MedicationType {
  id: string;
  name: string;
}

const Medications = () => {
  const { user, userInfo } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationTypes, setMedicationTypes] = useState<MedicationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMedication, setNewMedication] = useState({
    name: '',
    masseinheit: '',
    packungsbeschreibung: '',
    medication_type_id: '',
  });
  const [adding, setAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();

  const fetchMedications = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('medikamente')
        .select('*')
        .order('name');
      
      if (userInfo?.praxisId) {
        query = query.eq('praxis_id', userInfo.praxisId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching medications:', error);
        toast({
          title: 'Fehler',
          description: 'Fehler beim Laden der Medikamente',
          variant: 'destructive',
        });
      } else {
        setMedications(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicationTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('medication_types')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching medication types:', error);
      } else {
        setMedicationTypes(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMedications();
      fetchMedicationTypes();
    }
  }, [user, userInfo]);

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMedication.name || !newMedication.masseinheit) {
      toast({
        title: 'Eingabefehler',
        description: 'Name und Maßeinheit sind erforderlich',
        variant: 'destructive',
      });
      return;
    }
    
    if (!userInfo?.praxisId) {
      toast({
        title: 'Fehler',
        description: 'Keine Praxis-ID gefunden',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from('medikamente')
        .insert([
          {
            name: newMedication.name,
            masseinheit: newMedication.masseinheit,
            packungsbeschreibung: newMedication.packungsbeschreibung || null,
            medication_type_id: newMedication.medication_type_id || null,
            praxis_id: userInfo.praxisId,
          },
        ])
        .select();
      
      if (error) {
        console.error('Error adding medication:', error);
        toast({
          title: 'Fehler',
          description: 'Fehler beim Hinzufügen des Medikaments',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erfolg',
          description: 'Medikament erfolgreich hinzugefügt',
        });
        
        // Reset form and refresh medications
        setNewMedication({
          name: '',
          masseinheit: '',
          packungsbeschreibung: '',
          medication_type_id: '',
        });
        setAdding(false);
        fetchMedications();
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMedications = medications.filter(med => 
    med.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Medikamentenverwaltung</h1>
      
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Medikament suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => fetchMedications()} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4 mr-2" /> Neues Medikament
          </Button>
        </div>
      </div>
      
      {adding && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Neues Medikament hinzufügen</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddMedication} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newMedication.name}
                    onChange={(e) => setNewMedication({...newMedication, name: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="masseinheit">Maßeinheit *</Label>
                  <Input
                    id="masseinheit"
                    value={newMedication.masseinheit}
                    onChange={(e) => setNewMedication({...newMedication, masseinheit: e.target.value})}
                    placeholder="z.B. mg, ml, Stück"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="medication_type">Medikamententyp</Label>
                  <Select
                    value={newMedication.medication_type_id}
                    onValueChange={(value) => setNewMedication({...newMedication, medication_type_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Typ auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {medicationTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="packungsbeschreibung">Packungsbeschreibung</Label>
                  <Input
                    id="packungsbeschreibung"
                    value={newMedication.packungsbeschreibung}
                    onChange={(e) => setNewMedication({...newMedication, packungsbeschreibung: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setAdding(false)}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    'Speichern'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredMedications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMedications.map((medication) => (
            <Card key={medication.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{medication.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Maßeinheit:</span> {medication.masseinheit}
                  </p>
                  {medication.packungsbeschreibung && (
                    <p>
                      <span className="font-medium">Packung:</span> {medication.packungsbeschreibung}
                    </p>
                  )}
                  {medication.eingangs_nr && (
                    <p>
                      <span className="font-medium">Eingangs-Nr.:</span> {medication.eingangs_nr}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-8 border rounded-lg bg-muted/10">
          {searchTerm ? (
            <p>Keine Medikamente gefunden für "{searchTerm}"</p>
          ) : (
            <p>Keine Medikamente verfügbar. Fügen Sie neue Medikamente hinzu.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Medications;
