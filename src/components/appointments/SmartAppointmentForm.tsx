
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getPatientInsights } from '@/services/crossModuleIntegration';

interface SmartAppointmentFormProps {
  patientId?: string;
  onSuccess?: () => void;
}

const SmartAppointmentForm = ({ patientId, onSuccess }: SmartAppointmentFormProps) => {
  const [formData, setFormData] = useState({
    patientId: patientId || '',
    title: '',
    description: '',
    startTime: '',
    duration: '30'
  });
  const [patients, setPatients] = useState<any[]>([]);
  const [patientInsights, setPatientInsights] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (formData.patientId) {
      fetchPatientInsights();
    }
  }, [formData.patientId]);

  const fetchPatients = async () => {
    const { data, error } = await supabase
      .from('patient')
      .select('id, name, spezies, rasse')
      .order('name');
    
    if (!error && data) {
      setPatients(data);
    }
  };

  const fetchPatientInsights = async () => {
    try {
      const insights = await getPatientInsights(formData.patientId);
      setPatientInsights(insights);
      generateSuggestions(insights);
    } catch (error) {
      console.error('Error fetching patient insights:', error);
    }
  };

  const generateSuggestions = (insights: any) => {
    const newSuggestions = [];
    
    // Suggest follow-up based on last treatment
    if (insights.lastTreatment) {
      const daysSinceLastTreatment = Math.floor(
        (new Date().getTime() - new Date(insights.lastTreatment).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastTreatment > 30) {
        newSuggestions.push('Allgemeine Nachuntersuchung');
      }
    }

    // Suggest based on common diagnoses
    Object.keys(insights.commonDiagnoses || {}).forEach(diagnosis => {
      if (diagnosis.toLowerCase().includes('impfung')) {
        newSuggestions.push('Impfung Auffrischung');
      }
      if (diagnosis.toLowerCase().includes('zahnstein')) {
        newSuggestions.push('Zahnkontrolle');
      }
    });

    // Suggest based on medications used
    Object.keys(insights.medicationsUsed || {}).forEach(medication => {
      if (medication.toLowerCase().includes('antibiotikum')) {
        newSuggestions.push('Nachkontrolle Antibiotikum-Behandlung');
      }
    });

    setSuggestions(newSuggestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const startTime = new Date(formData.startTime);
      const endTime = new Date(startTime.getTime() + parseInt(formData.duration) * 60000);
      
      const { error } = await supabase.from('appointments').insert({
        patient_id: formData.patientId,
        title: formData.title,
        description: formData.description,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        created_by: (await supabase.auth.getUser()).data.user?.id,
        praxis_id: (await supabase.from('profiles').select('praxis_id').eq('id', (await supabase.auth.getUser()).data.user?.id).single()).data?.praxis_id
      });

      if (error) throw error;

      toast({
        title: 'Termin erstellt',
        description: 'Der Termin wurde erfolgreich geplant.',
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: 'Fehler',
        description: 'Der Termin konnte nicht erstellt werden.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intelligente Terminplanung</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patient">Patient</Label>
            <Select
              value={formData.patientId}
              onValueChange={(value) => setFormData({ ...formData, patientId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Patient auswählen" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.name} ({patient.spezies})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {suggestions.length > 0 && (
            <div className="space-y-2">
              <Label>Vorschläge basierend auf Patientenhistorie</Label>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => setFormData({ ...formData, title: suggestion })}
                  >
                    {suggestion}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Datum & Zeit</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Dauer (Minuten)</Label>
              <Select
                value={formData.duration}
                onValueChange={(value) => setFormData({ ...formData, duration: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 Minuten</SelectItem>
                  <SelectItem value="30">30 Minuten</SelectItem>
                  <SelectItem value="45">45 Minuten</SelectItem>
                  <SelectItem value="60">60 Minuten</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full">
            Termin erstellen
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SmartAppointmentForm;
