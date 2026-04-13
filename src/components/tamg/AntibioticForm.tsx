import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

interface AntibioticFormProps {
  practiceId: string;
  vetId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface Patient {
  id: string;
  name: string;
  species: string;
}

interface Medication {
  id: string;
  name: string;
  active_ingredient: string;
}

interface FormData {
  patient_id: string;
  medication_id: string;
  dosage: string;
  duration_days: number;
  indication: string;
  notes: string;
}

export function AntibioticForm({ practiceId, vetId, onSuccess, onCancel }: AntibioticFormProps) {
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: (values, context, options) => {
      const errors: any = {};
      if (!values.patient_id) errors.patient_id = { type: 'required', message: 'Patient ist erforderlich' };
      if (!values.medication_id) errors.medication_id = { type: 'required', message: 'Antibiotikum ist erforderlich' };
      if (!values.dosage) errors.dosage = { type: 'required', message: 'Dosierung ist erforderlich' };
      if (!values.duration_days || values.duration_days < 1) errors.duration_days = { type: 'min', message: 'Mindestens 1 Tag' };
      return { values, errors };
    },
    defaultValues: {
      patient_id: "",
      medication_id: "",
      dosage: "",
      duration_days: 7,
      indication: "",
      notes: "",
    },
  });

  useEffect(() => {
    loadData();
  }, [practiceId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [patientsRes, medsRes] = await Promise.all([
        supabase.from("patient").select("id, name, species").eq("praxis_id", practiceId),
        supabase.from("medikamente").select("id, name, active_ingredient").contains("category", ["antibiotic"]),
      ]);

      if (patientsRes.data) setPatients(patientsRes.data);
      if (medsRes.data) setMedications(medsRes.data as Medication[]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Fehler",
        description: "Daten konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      // Get selected medication info
      const selectedMed = medications.find(m => m.id === data.medication_id);
      
      const { error } = await supabase.from("antibiotic_prescriptions").insert({
        practice_id: practiceId,
        patient_id: data.patient_id,
        drug_id: data.medication_id,
        drug_name: selectedMed?.name || 'Unknown',
        prescribing_vet_id: vetId,
        amount: data.dosage,
        unit: 'tablet',
        treatment_duration_days: data.duration_days,
        animal_species: patients.find(p => p.id === data.patient_id)?.species || 'Unbekannt',
        treatment_purpose: 'therapy',
        prescribed_at: new Date().toISOString(),
        bvl_reported: false,
      });

      if (error) throw error;

      toast({
        title: "Erfolgreich",
        description: "Antibiotika-Verschreibung wurde gespeichert.",
      });

      reset();
      onSuccess?.();
    } catch (error) {
      console.error("Error saving prescription:", error);
      toast({
        title: "Fehler",
        description: "Verschreibung konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-4" role="status" aria-live="polite">Laden...</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {/* Screen reader error summary */}
      {Object.keys(errors).length > 0 && (
        <div className="sr-only" role="alert" aria-live="assertive">
          Bitte füllen Sie alle Pflichtfelder aus.
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="patient_id">Patient *</Label>
        <Select
          onValueChange={(value) => setValue("patient_id", value)}
          value={watch("patient_id")}
        >
          <SelectTrigger id="patient_id" aria-invalid={errors.patient_id ? "true" : "false"}>
            <SelectValue placeholder="Patient auswählen" />
          </SelectTrigger>
          <SelectContent>
            {patients.map((patient) => (
              <SelectItem key={patient.id} value={patient.id}>
                {patient.name} ({patient.species})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.patient_id && <p className="text-sm text-destructive">Patient ist erforderlich</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="medication_id">Antibiotikum *</Label>
        <Select
          onValueChange={(value) => setValue("medication_id", value)}
          value={watch("medication_id")}
        >
          <SelectTrigger id="medication_id" aria-invalid={errors.medication_id ? "true" : "false"}>
            <SelectValue placeholder="Antibiotikum auswählen" />
          </SelectTrigger>
          <SelectContent>
            {medications.map((med) => (
              <SelectItem key={med.id} value={med.id}>
                {med.name} {med.active_ingredient && `(${med.active_ingredient})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.medication_id && <p className="text-sm text-destructive">Antibiotikum ist erforderlich</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dosage">Dosierung *</Label>
          <Input
            {...register("dosage")}
            placeholder="z.B. 10 mg/kg"
            aria-required="true"
          />
          {errors.dosage && <p className="text-sm text-destructive">Dosierung ist erforderlich</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration_days">Behandlungsdauer (Tage) *</Label>
          <Input
            type="number"
            {...register("duration_days", { valueAsNumber: true, min: 1, max: 30 })}
            min={1}
            max={30}
            aria-required="true"
          />
          {errors.duration_days && <p className="text-sm text-destructive">{errors.duration_days.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="indication">Indikation</Label>
        <Input
          {...register("indication")}
          placeholder="z.B. Atemwegsinfektion"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Anmerkungen</Label>
        <Textarea
          {...register("notes")}
          placeholder="Zusätzliche Anmerkungen..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Speichern..." : "Speichern"}
        </Button>
      </div>
    </form>
  );
}