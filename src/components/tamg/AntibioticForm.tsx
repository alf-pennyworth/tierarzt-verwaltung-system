import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Calculator, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  TAMG_ANIMAL_CATEGORIES, 
  ANTIBIOTIC_CLASSES, 
  ADMINISTRATION_ROUTES,
  PRESCRIPTION_TYPES,
  type TamgAnimalCategory,
  type AntibioticClass,
  type AdministrationRoute,
  type PrescriptionType
} from "@/types/tamg";

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

interface AntibioticDrug {
  id: string;
  drug_name: string;
  active_substance: string;
  antibiotic_class: AntibioticClass;
  atc_code: string | null;
  approved_species: TamgAnimalCategory[] | null;
}

interface FormData {
  patient_id: string;
  drug_name: string;
  active_substance: string;
  antibiotic_class: AntibioticClass;
  amount_prescribed: number;
  unit: string;
  concentration: string;
  animal_species: TamgAnimalCategory;
  animal_count: number;
  animal_weight_kg: number;
  treatment_duration_days: number;
  route_of_administration: AdministrationRoute;
  diagnosis: string;
  indication: string;
  prescription_type: PrescriptionType;
  notes: string;
}

export function AntibioticForm({ practiceId, vetId, onSuccess, onCancel }: AntibioticFormProps) {
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [antibiotics, setAntibiotics] = useState<AntibioticDrug[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState<AntibioticDrug | null>(null);
  const [drugValidationWarning, setDrugValidationWarning] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, touchedFields }, trigger } = useForm<FormData>({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      patient_id: "",
      drug_name: "",
      active_substance: "",
      antibiotic_class: "other",
      amount_prescribed: 1,
      unit: "ml",
      concentration: "",
      animal_species: "dogs",
      animal_count: 1,
      animal_weight_kg: 0,
      treatment_duration_days: 7,
      route_of_administration: "oral",
      diagnosis: "",
      indication: "",
      prescription_type: "therapeutic",
      notes: "",
    },
  });

  // Validation error messages in German
  const validationMessages: Record<string, string> = {
    drug_name_required: "Handelsname ist erforderlich",
    active_substance_required: "Wirkstoff ist erforderlich",
    amount_prescribed_min: "Menge muss größer als 0 sein",
    treatment_duration_min: "Behandlungsdauer muss mindestens 1 Tag betragen",
    animal_count_min: "Anzahl Tiere muss mindestens 1 betragen",
  };

  useEffect(() => {
    loadData();
  }, [practiceId]);

  // Auto-fill from patient selection
  useEffect(() => {
    const patientId = watch("patient_id");
    if (patientId) {
      const patient = patients.find(p => p.id === patientId);
      if (patient) {
        // Map patient species to TAMG category
        const speciesMap: Record<string, TamgAnimalCategory> = {
          'Hund': 'dogs',
          'Katze': 'cats',
          'Pferd': 'horses',
          'Rind': 'cattle',
          'Schwein': 'pigs',
          'Schaf': 'sheep',
          'Ziege': 'goats',
          'Huhn': 'chickens',
          'Ente': 'ducks',
          'Gans': 'geese',
          'Kaninchen': 'rabbits',
        };
        const tamgSpecies = speciesMap[patient.species] || 'other';
        setValue("animal_species", tamgSpecies);
      }
    }
  }, [watch("patient_id"), patients]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [patientsRes, antibioticsRes] = await Promise.all([
        supabase.from("patient").select("id, name, species").eq("praxis_id", practiceId).is('deleted_at', null),
        supabase.from("antibiotic_drugs").select("*").eq("is_active", true).order("drug_name"),
      ]);

      if (patientsRes.data) setPatients(patientsRes.data);
      if (antibioticsRes.data) setAntibiotics(antibioticsRes.data);
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

  const handleDrugSelect = (drugId: string) => {
    const drug = antibiotics.find(d => d.id === drugId);
    if (drug) {
      setSelectedDrug(drug);
      setValue("drug_name", drug.drug_name);
      setValue("active_substance", drug.active_substance);
      setValue("antibiotic_class", drug.antibiotic_class);
      setDrugValidationWarning(null); // Clear warning when selecting from database
    }
  };

  /**
   * Validate drug name against antibiotics database
   * Shows warning if drug is not in the approved list
   */
  const validateDrugName = useCallback((drugName: string) => {
    if (!drugName || drugName.trim() === '') {
      setDrugValidationWarning(null);
      return true;
    }

    const normalizedInput = drugName.toLowerCase().trim();
    const matchingDrug = antibiotics.find(
      d => d.drug_name.toLowerCase() === normalizedInput ||
           d.active_substance.toLowerCase().includes(normalizedInput) ||
           normalizedInput.includes(d.active_substance.toLowerCase())
    );

    if (!matchingDrug) {
      setDrugValidationWarning(
        `"${drugName}" wurde nicht in der zugelassenen Antibiotika-Datenbank gefunden. ` +
        `Bitte stellen Sie sicher, dass es sich um ein zugelassenes Tierarzneimittel handelt.`
      );
      return false;
    }

    setDrugValidationWarning(null);
    return true;
  }, [antibiotics]);

  /**
   * Check if selected drug is approved for the current animal species
   */
  const checkSpeciesApproval = useMemo(() => {
    if (!selectedDrug || !watch("animal_species")) return null;
    
    const currentSpecies = watch("animal_species") as TamgAnimalCategory;
    
    if (selectedDrug.approved_species && selectedDrug.approved_species.length > 0) {
      if (!selectedDrug.approved_species.includes(currentSpecies)) {
        const approvedSpeciesNames = selectedDrug.approved_species
          .map(s => TAMG_ANIMAL_CATEGORIES[s]?.de || s)
          .join(', ');
        return {
          warning: true,
          message: `Dieses Antibiotikum ist nur für folgende Tierarten zugelassen: ${approvedSpeciesNames}`
        };
      }
    }
    return { warning: false, message: null };
  }, [selectedDrug, watch("animal_species")]);

  /**
   * Dosage calculation helper (mg/kg)
   * Calculates recommended dosage based on animal weight
   */
  const dosageCalculation = useMemo(() => {
    const weight = watch("animal_weight_kg");
    const animalCount = watch("animal_count");
    const duration = watch("treatment_duration_days");
    
    if (!weight || weight <= 0) return null;

    // Common dosage ranges (mg/kg/day) for reference
    const dosageGuidelines: Record<AntibioticClass, { typical: string; range: string }> = {
      penicillins: { typical: '10-20 mg/kg', range: '8-50 mg/kg' },
      cephalosporins: { typical: '10-25 mg/kg', range: '5-50 mg/kg' },
      aminoglycosides: { typical: '5-10 mg/kg', range: '2-15 mg/kg' },
      macrolides: { typical: '5-15 mg/kg', range: '2-25 mg/kg' },
      tetracyclines: { typical: '10-20 mg/kg', range: '5-30 mg/kg' },
      fluoroquinolones: { typical: '5-10 mg/kg', range: '2-15 mg/kg' },
      sulfonamides: { typical: '15-30 mg/kg', range: '10-50 mg/kg' },
      trimethoprim: { typical: '5-10 mg/kg', range: '2-15 mg/kg' },
      lincosamides: { typical: '5-15 mg/kg', range: '3-25 mg/kg' },
      pleuromutilins: { typical: '5-10 mg/kg', range: '2-15 mg/kg' },
      amphenicols: { typical: '20-40 mg/kg', range: '10-50 mg/kg' },
      glycopeptides: { typical: '5-15 mg/kg', range: '2-20 mg/kg' },
      polymyxins: { typical: '2-5 mg/kg', range: '1-10 mg/kg' },
      other: { typical: '---', range: '---' },
    };

    const antibioticClass = watch("antibiotic_class") as AntibioticClass;
    const guideline = dosageGuidelines[antibioticClass] || dosageGuidelines.other;
    
    const totalWeight = weight * (animalCount || 1);
    const treatmentDays = duration || 1;

    return {
      animalWeight: weight,
      animalCount: animalCount || 1,
      totalWeight,
      treatmentDays,
      guideline,
      antibioticClass,
      // Example calculation placeholder (user must verify with actual drug instructions)
      note: 'Dosierungshinweise dienen nur als Orientierung. Bitte prüfen Sie die offizielle Fachinformation.'
    };
  }, [watch("animal_weight_kg"), watch("animal_count"), watch("treatment_duration_days"), watch("antibiotic_class")]);

  // Handle manual drug name input with validation
  const handleDrugNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValue("drug_name", value, { shouldValidate: true });
    
    // Debounced validation
    if (value.length >= 3) {
      validateDrugName(value);
    } else {
      setDrugValidationWarning(null);
    }
    
    // Clear selected drug if manually editing
    if (selectedDrug && value !== selectedDrug.drug_name) {
      setSelectedDrug(null);
    }
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const patient = patients.find(p => p.id === data.patient_id);
      
      // Calculate total weight
      const totalWeight = data.animal_weight_kg > 0 
        ? data.animal_weight_kg * data.animal_count 
        : null;

      const { error } = await supabase.from("antibiotic_prescriptions").insert({
        praxis_id: practiceId,
        patient_id: data.patient_id || null,
        prescribed_by: vetId,
        
        // Drug information
        drug_name: data.drug_name,
        active_substance: data.active_substance,
        antibiotic_class: data.antibiotic_class,
        
        // Quantity and dosing
        amount_prescribed: data.amount_prescribed,
        unit: data.unit,
        concentration: data.concentration || null,
        
        // Animal information
        animal_species: data.animal_species,
        animal_count: data.animal_count,
        animal_weight_kg: data.animal_weight_kg || null,
        total_animal_weight_kg: totalWeight,
        
        // Treatment details
        diagnosis: data.diagnosis || null,
        indication: data.indication || null,
        route_of_administration: data.route_of_administration,
        treatment_duration_days: data.treatment_duration_days,
        prescription_type: data.prescription_type,
        
        // Prescription details
        prescription_date: new Date().toISOString().split('T')[0],
        reported_to_bvl: false,
        
        // Metadata
        notes: data.notes || null,
        created_by: vetId,
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

  // Helper to get error state for a field
  const getFieldState = (fieldName: keyof FormData) => {
    const hasError = !!errors[fieldName];
    const isTouched = touchedFields[fieldName];
    return { hasError, isTouched, showError: hasError && isTouched };
  };

  // Count validation errors
  const errorCount = Object.keys(errors).length;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {/* Validation error summary - visible */}
      {errorCount > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Bitte überprüfen Sie Ihre Eingaben:</strong>
            <ul className="mt-2 list-disc list-inside text-sm">
              {errors.drug_name && <li>Handelsname ist erforderlich</li>}
              {errors.active_substance && <li>Wirkstoff ist erforderlich</li>}
              {errors.amount_prescribed && <li>Menge muss größer als 0 sein</li>}
              {errors.treatment_duration_days && <li>Behandlungsdauer ist erforderlich</li>}
              {errors.animal_count && <li>Anzahl Tiere ist erforderlich</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Patient Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Patient</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient_id">Patient auswählen</Label>
              <Select
                onValueChange={(value) => setValue("patient_id", value)}
                value={watch("patient_id")}
              >
                <SelectTrigger id="patient_id">
                  <SelectValue placeholder="Patient auswählen (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name} ({patient.species})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="animal_species">Tierart *</Label>
              <Select
                onValueChange={(value) => setValue("animal_species", value as TamgAnimalCategory)}
                value={watch("animal_species")}
              >
                <SelectTrigger id="animal_species" aria-required="true">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TAMG_ANIMAL_CATEGORIES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.de} ({value.en})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="animal_count" className={cn(errors.animal_count && "text-destructive")}>
                Anzahl behandelte Tiere *
              </Label>
              <Input
                id="animal_count"
                type="number"
                min={1}
                {...register("animal_count", { 
                  valueAsNumber: true, 
                  required: "Anzahl Tiere ist erforderlich",
                  min: { value: 1, message: "Mindestens 1 Tier" }
                })}
                aria-required="true"
                aria-invalid={!!errors.animal_count}
                className={cn(errors.animal_count && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.animal_count && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.animal_count.message || "Ungültiger Wert"}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="animal_weight_kg">Durchschnittsgewicht (kg)</Label>
              <Input
                id="animal_weight_kg"
                type="number"
                step="0.1"
                min="0"
                {...register("animal_weight_kg", { valueAsNumber: true })}
                placeholder="Optional"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drug Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Antibiotikum</CardTitle>
          <CardDescription>Wählen Sie ein registriertes Antibiotikum oder geben Sie die Daten manuell ein</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="drug_select">Antibiotikum aus Datenbank</Label>
            <Select onValueChange={handleDrugSelect}>
              <SelectTrigger id="drug_select">
                <SelectValue placeholder="Antibiotikum auswählen (optional)" />
              </SelectTrigger>
              <SelectContent>
                {antibiotics.map((drug) => (
                  <SelectItem key={drug.id} value={drug.id}>
                    {drug.drug_name} - {drug.active_substance}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Drug validation warning */}
          {drugValidationWarning && (
            <Alert variant="warning" className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Achtung:</strong> {drugValidationWarning}
              </AlertDescription>
            </Alert>
          )}

          {/* Species approval warning */}
          {checkSpeciesApproval?.warning && (
            <Alert variant="warning" className="bg-amber-50 border-amber-200">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                {checkSpeciesApproval.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Selected drug info */}
          {selectedDrug && (
            <Alert className="bg-blue-50 border-blue-200">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Ausgewählt:</strong> {selectedDrug.drug_name} ({selectedDrug.active_substance}) - 
                {selectedDrug.atc_code && `ATC: ${selectedDrug.atc_code}`}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="drug_name" className={cn(errors.drug_name && "text-destructive")}>
                Handelsname *
              </Label>
              <Input
                id="drug_name"
                {...register("drug_name", { required: "Handelsname ist erforderlich" })}
                onChange={handleDrugNameChange}
                placeholder="z.B. Baytril"
                aria-required="true"
                aria-invalid={!!errors.drug_name || !!drugValidationWarning}
                className={cn(
                  errors.drug_name && "border-destructive focus-visible:ring-destructive",
                  drugValidationWarning && !errors.drug_name && "border-amber-500"
                )}
              />
              {errors.drug_name && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.drug_name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="active_substance" className={cn(errors.active_substance && "text-destructive")}>
                Wirkstoff *
              </Label>
              <Input
                id="active_substance"
                {...register("active_substance", { required: "Wirkstoff ist erforderlich" })}
                placeholder="z.B. Enrofloxacin"
                aria-required="true"
                aria-invalid={!!errors.active_substance}
                className={cn(errors.active_substance && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.active_substance && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.active_substance.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="antibiotic_class">Antibiotika-Klasse *</Label>
              <Select
                onValueChange={(value) => setValue("antibiotic_class", value as AntibioticClass)}
                value={watch("antibiotic_class")}
              >
                <SelectTrigger id="antibiotic_class" aria-required="true">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ANTIBIOTIC_CLASSES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.de}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount_prescribed" className={cn(errors.amount_prescribed && "text-destructive")}>
                Menge *
              </Label>
              <Input
                id="amount_prescribed"
                type="number"
                step="0.01"
                min="0.01"
                {...register("amount_prescribed", { 
                  valueAsNumber: true, 
                  required: "Menge ist erforderlich",
                  min: { value: 0.01, message: "Menge muss größer als 0 sein" }
                })}
                aria-required="true"
                aria-invalid={!!errors.amount_prescribed}
                className={cn(errors.amount_prescribed && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.amount_prescribed && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.amount_prescribed.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Einheit *</Label>
              <Select
                onValueChange={(value) => setValue("unit", value)}
                value={watch("unit")}
              >
                <SelectTrigger id="unit" aria-required="true">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ml">ml</SelectItem>
                  <SelectItem value="mg">mg</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="Tablette">Tablette</SelectItem>
                  <SelectItem value="Stück">Stück</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="concentration">Konzentration (optional)</Label>
            <Input
              id="concentration"
              {...register("concentration")}
              placeholder="z.B. 100 mg/ml"
            />
          </div>
        </CardContent>
      </Card>

      {/* Dosage Calculation Helper */}
      {dosageCalculation && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              Dosierungshilfe (mg/kg)
            </CardTitle>
            <CardDescription>
              Orientierungshilfe basierend auf Tiergewicht und Antibiotika-Klasse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Tiergewicht:</span>
                <p className="font-medium">{dosageCalculation.animalWeight.toFixed(1)} kg</p>
              </div>
              <div>
                <span className="text-muted-foreground">Anzahl Tiere:</span>
                <p className="font-medium">{dosageCalculation.animalCount}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Gesamtgewicht:</span>
                <p className="font-medium">{dosageCalculation.totalWeight.toFixed(1)} kg</p>
              </div>
              <div>
                <span className="text-muted-foreground">Behandlungsdauer:</span>
                <p className="font-medium">{dosageCalculation.treatmentDays} Tage</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white/60 rounded border border-blue-100">
              <p className="text-sm">
                <strong className="text-blue-700">{ANTIBIOTIC_CLASSES[dosageCalculation.antibioticClass]?.de || 'Unbekannt'}:</strong>
              </p>
              <ul className="text-sm mt-1 space-y-1">
                <li>Typische Dosierung: {dosageCalculation.guideline.typical}</li>
                <li>Dosierungsbereich: {dosageCalculation.guideline.range}</li>
              </ul>
            </div>
            <Alert className="mt-3 bg-amber-50 border-amber-200">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                {dosageCalculation.note}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Treatment Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Behandlung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="route_of_administration">Applikationsart</Label>
              <Select
                onValueChange={(value) => setValue("route_of_administration", value as AdministrationRoute)}
                value={watch("route_of_administration")}
              >
                <SelectTrigger id="route_of_administration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ADMINISTRATION_ROUTES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.de}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="treatment_duration_days" className={cn(errors.treatment_duration_days && "text-destructive")}>
                Behandlungsdauer (Tage) *
              </Label>
              <Input
                id="treatment_duration_days"
                type="number"
                min={1}
                max={365}
                {...register("treatment_duration_days", { 
                  valueAsNumber: true, 
                  required: "Behandlungsdauer ist erforderlich",
                  min: { value: 1, message: "Mindestens 1 Tag" }
                })}
                aria-required="true"
                aria-invalid={!!errors.treatment_duration_days}
                className={cn(errors.treatment_duration_days && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.treatment_duration_days && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.treatment_duration_days.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prescription_type">Verordnungstyp</Label>
              <Select
                onValueChange={(value) => setValue("prescription_type", value as PrescriptionType)}
                value={watch("prescription_type")}
              >
                <SelectTrigger id="prescription_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRESCRIPTION_TYPES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.de}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnose</Label>
            <Input
              id="diagnosis"
              {...register("diagnosis")}
              placeholder="z.B. Atemwegsinfektion, Mastitis"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="indication">Indikation</Label>
            <Input
              id="indication"
              {...register("indication")}
              placeholder="z.B. Behandlung einer bakteriellen Infektion"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Anmerkungen</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Zusätzliche Anmerkungen..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Speichern..." : "Verschreibung speichern"}
        </Button>
      </div>
    </form>
  );
}