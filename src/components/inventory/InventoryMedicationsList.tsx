
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Search, RefreshCw, Package, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MedikamentItem } from '@/types/inventory';

interface Medication {
  id: string;
  name: string;
  masseinheit: string;
  zulassungsnummer?: string;
  packungs_id?: string;
  eingangs_nr?: string;
  packungsbeschreibung?: string;
  medication_type_id?: string;
  current_stock?: number;
  minimum_stock?: number;
  unit_price?: number;
}

interface MedicationType {
  id: string;
  name: string;
}

const InventoryMedicationsList = () => {
  const queryClient = useQueryClient();
  const { user, userInfo } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [newMedication, setNewMedication] = useState({
    name: '',
    masseinheit: '',
    zulassungsnummer: '',
    packungs_id: '',
    eingangs_nr: '',
    packungsbeschreibung: '',
    medication_type_id: '',
    current_stock: 0,
    minimum_stock: 0,
    unit_price: undefined as number | undefined,
  });
  const [adding, setAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();

  const { data: medications = [], isLoading, refetch } = useQuery({
    queryKey: ['medications'],
    queryFn: async () => {
      let query = supabase
        .from('medikamente')
        .select('*')
        .order('name');
      
      if (userInfo?.praxisId) {
        query = query.eq('praxis_id', userInfo.praxisId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data || [];
    },
    enabled: !!user
  });

  const { data: medicationTypes = [] } = useQuery({
    queryKey: ['medicationTypes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medication_types')
        .select('*')
        .order('name');
      
      if (error) {
        throw error;
      }
      
      return data || [];
    },
    enabled: !!user
  });

  const createMedicationMutation = useMutation({
    mutationFn: async (newMed: any) => {
      const { data, error } = await supabase
        .from('medikamente')
        .insert([newMed])
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      toast({
        title: 'Erfolg',
        description: 'Medikament erfolgreich hinzugefügt',
      });
      setAdding(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Error adding medication:', error);
      toast({
        title: 'Fehler',
        description: 'Fehler beim Hinzufügen des Medikaments',
        variant: 'destructive',
      });
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "current_stock" || name === "minimum_stock") {
      setNewMedication({ ...newMedication, [name]: parseInt(value) || 0 });
    } else if (name === "unit_price") {
      setNewMedication({ ...newMedication, [name]: value ? parseFloat(value) : undefined });
    } else {
      setNewMedication({ ...newMedication, [name]: value });
    }
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setNewMedication({ ...newMedication, [name]: value });
  };
  
  const resetForm = () => {
    setNewMedication({
      name: '',
      masseinheit: '',
      zulassungsnummer: '',
      packungs_id: '',
      eingangs_nr: '',
      packungsbeschreibung: '',
      medication_type_id: '',
      current_stock: 0,
      minimum_stock: 0,
      unit_price: undefined
    });
  };

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
      await createMedicationMutation.mutateAsync({
        name: newMedication.name,
        masseinheit: newMedication.masseinheit,
        zulassungsnummer: newMedication.zulassungsnummer || null,
        packungs_id: newMedication.packungs_id || null,
        eingangs_nr: newMedication.eingangs_nr || null,
        packungsbeschreibung: newMedication.packungsbeschreibung || null,
        medication_type_id: newMedication.medication_type_id || null,
        current_stock: newMedication.current_stock,
        minimum_stock: newMedication.minimum_stock,
        unit_price: newMedication.unit_price,
        praxis_id: userInfo.praxisId,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMedications = medications.filter(med => 
    med.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
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
          <Button onClick={() => refetch()} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={adding} onOpenChange={setAdding}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Neues Medikament
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Neues Medikament hinzufügen</DialogTitle>
                <DialogDescription>
                  Fügen Sie ein neues Medikament zum Inventar hinzu
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddMedication} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={newMedication.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="masseinheit">Maßeinheit *</Label>
                    <Input
                      id="masseinheit"
                      name="masseinheit"
                      value={newMedication.masseinheit}
                      onChange={handleInputChange}
                      placeholder="z.B. mg, ml, Stück"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="current_stock">Aktueller Bestand</Label>
                    <Input
                      id="current_stock"
                      name="current_stock"
                      type="number"
                      value={newMedication.current_stock}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minimum_stock">Mindestbestand</Label>
                    <Input
                      id="minimum_stock"
                      name="minimum_stock"
                      type="number"
                      value={newMedication.minimum_stock}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit_price">Preis pro Einheit (€)</Label>
                    <Input
                      id="unit_price"
                      name="unit_price"
                      type="number"
                      step="0.01"
                      value={newMedication.unit_price}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zulassungsnummer">Zulassungsnummer</Label>
                    <Input
                      id="zulassungsnummer"
                      name="zulassungsnummer"
                      value={newMedication.zulassungsnummer}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="packungs_id">Packungs-ID</Label>
                    <Input
                      id="packungs_id"
                      name="packungs_id"
                      value={newMedication.packungs_id}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eingangs_nr">Eingangs-Nr.</Label>
                    <Input
                      id="eingangs_nr"
                      name="eingangs_nr"
                      value={newMedication.eingangs_nr}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="packungsbeschreibung">Packungsbeschreibung</Label>
                    <Input
                      id="packungsbeschreibung"
                      name="packungsbeschreibung"
                      value={newMedication.packungsbeschreibung}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medication_type">Medikamententyp</Label>
                    <Select
                      value={newMedication.medication_type_id}
                      onValueChange={(value) => handleSelectChange("medication_type_id", value)}
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
                </div>
                
                <DialogFooter>
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
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredMedications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMedications.map((medication: MedikamentItem) => (
            <Card key={medication.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{medication.name}</span>
                  {medication.current_stock !== undefined && medication.minimum_stock !== undefined && 
                   medication.current_stock <= medication.minimum_stock && (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <p><span className="font-medium">Maßeinheit:</span> {medication.masseinheit}</p>
                    {medication.current_stock !== undefined && (
                      <p className={medication.current_stock <= (medication.minimum_stock || 0) ? "text-amber-600 font-medium" : ""}>
                        <span className="font-medium">Bestand:</span> {medication.current_stock}
                      </p>
                    )}
                  </div>
                  {medication.zulassungsnummer && (
                    <p><span className="font-medium">Zulassungsnummer:</span> {medication.zulassungsnummer}</p>
                  )}
                  {medication.packungs_id && (
                    <p><span className="font-medium">Packungs-ID:</span> {medication.packungs_id}</p>
                  )}
                  {medication.eingangs_nr && (
                    <p><span className="font-medium">Eingangs-Nr.:</span> {medication.eingangs_nr}</p>
                  )}
                  {medication.packungsbeschreibung && (
                    <p><span className="font-medium">Packung:</span> {medication.packungsbeschreibung}</p>
                  )}
                  {medication.unit_price && (
                    <p><span className="font-medium">Preis/Einheit:</span> {medication.unit_price} €</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-8 border rounded-lg bg-muted/10">
          <Package className="h-16 w-16 text-muted-foreground/40 mb-4 mx-auto" />
          {searchTerm ? (
            <p>Keine Medikamente gefunden für "{searchTerm}"</p>
          ) : (
            <p>Keine Medikamente verfügbar. Fügen Sie neue Medikamente hinzu.</p>
          )}
          <Button className="mt-4" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4 mr-2" /> Medikament hinzufügen
          </Button>
        </div>
      )}
    </div>
  );
};

export default InventoryMedicationsList;
