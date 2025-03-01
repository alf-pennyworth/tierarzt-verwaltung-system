import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { getAllDiagnoses, findDiagnoseByName } from "@/services/diagnoseService";
import { searchMedications, getPackagingDescriptions } from "@/services/medicationService";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface PatientData {
  name: string;
  spezies: string;
  rasse: string | null;
  praxis_id: string;
  besitzer: {
    name: string;
  };
}

interface LocationState {
  patientId?: string;
}

interface Medication {
  id: string;
  name: string;
  eingangs_nr: string | null;
  masseinheit: string;
  medication_type_id: string | null;
}

interface PackagingOption {
  id: string;
  description: string;
}

const Transcription = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const location = useLocation();
  const state = location.state as LocationState;
  const navigate = useNavigate();

  const [medicationOptions, setMedicationOptions] = useState<Medication[]>([]);
  const [packagingOptions, setPackagingOptions] = useState<PackagingOption[]>([]);
  const [isLoadingMedications, setIsLoadingMedications] = useState(false);
  const [isLoadingPackaging, setIsLoadingPackaging] = useState(false);
  const [showMedicationDropdown, setShowMedicationDropdown] = useState(false);

  const [formData, setFormData] = useState({
    patientName: "",
    besitzerName: "",
    spezies: "",
    rasse: "",
    diagnose: "",
    medikamentTyp: "",
    medikament: "",
    medikamentId: "",
    medikamentMenge: "",
    packungsbeschreibung: "",
    untersuchungsDatum: format(new Date(), "yyyy-MM-dd"),
  });

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!state?.patientId) return;

      const { data, error } = await supabase
        .from('patient')
        .select(`
          name,
          spezies,
          rasse,
          praxis_id,
          besitzer (
            name
          )
        `)
        .eq('id', state.patientId)
        .single();

      if (error) {
        console.error('Error fetching patient data:', error);
        toast({
          variant: "destructive",
          title: "Fehler",
          description: "Patientendaten konnten nicht geladen werden.",
        });
        return;
      }

      if (data) {
        setPatientData(data);
        setFormData(prev => ({
          ...prev,
          patientName: data.name,
          besitzerName: data.besitzer.name,
          spezies: data.spezies,
          rasse: data.rasse || '',
        }));
      }
    };

    fetchPatientData();
  }, [state?.patientId, toast]);

  useEffect(() => {
    const searchForMedications = async () => {
      if (formData.medikament.trim().length < 2 || !showMedicationDropdown) {
        return;
      }
      
      try {
        setIsLoadingMedications(true);
        const medications = await searchMedications(formData.medikament);
        console.log("Found medications:", medications);
        setMedicationOptions(medications);
      } catch (error) {
        console.error("Error searching medications:", error);
        toast({
          variant: "destructive",
          title: "Fehler",
          description: "Fehler beim Suchen nach Medikamenten.",
        });
      } finally {
        setIsLoadingMedications(false);
      }
    };

    searchForMedications();
  }, [formData.medikament, showMedicationDropdown, toast]);

  const fetchPackagingOptions = async (medicationName: string) => {
    if (!medicationName) {
      setPackagingOptions([]);
      return;
    }
    
    try {
      setIsLoadingPackaging(true);
      const options = await getPackagingDescriptions(medicationName);
      console.log("Package options for", medicationName, ":", options);
      setPackagingOptions(options);
    } catch (error) {
      console.error("Error fetching packaging options:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Fehler beim Laden der Verpackungsoptionen.",
      });
    } finally {
      setIsLoadingPackaging(false);
    }
  };

  const fetchOptionsAndProcess = async (transcriptionText: string) => {
    console.log("Processing text:", transcriptionText);
    try {
      const { data, error } = await supabase.functions.invoke('match-text', {
        body: { transcription: transcriptionText }
      });

      if (error) throw error;

      console.log("Matching results:", data);

      setFormData(prev => {
        const newData = { ...prev };
        
        if (data.diagnoses && data.diagnoses.length > 0) {
          newData.diagnose = data.diagnoses.map((d: any) => d.name).join(', ');
        }
        
        if (data.medications && data.medications.length > 0) {
          const med = data.medications[0];
          newData.medikament = med.name || "";
          newData.medikamentTyp = med.medication_type?.name || "";
          
          if (med.amount && med.unit) {
            newData.medikamentMenge = `${med.amount} ${med.unit}`;
          }

          if (med.name && med.name.length >= 2) {
            setShowMedicationDropdown(true);
          }
        }
        
        console.log("Updated form data:", newData);
        return newData;
      });

      toast({
        title: "Analyse erfolgreich",
        description: "Der Text wurde erfolgreich analysiert.",
      });

    } catch (error) {
      console.error('Error processing transcription:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Fehler bei der Verarbeitung der Transkription.",
      });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast({
        title: "Aufnahme gestartet",
        description: "Sprechen Sie jetzt...",
      });
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Zugriff auf das Mikrofon nicht möglich.",
      });
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    return new Promise<void>((resolve) => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
          const reader = new FileReader();
          
          reader.onloadend = async () => {
            if (reader.result) {
              await transcribeAudio(reader.result as string);
            }
            resolve();
          };
          
          reader.readAsDataURL(audioBlob);
        };
        
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      }
    });
  };

  const transcribeAudio = async (audioData: string) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('transcribe', {
        body: { audio: audioData },
      });

      if (error) throw error;

      if (data.text) {
        console.log("New transcription received:", data.text);
        setTranscription(data.text);
        await fetchOptionsAndProcess(data.text);
        
        toast({
          title: "Transkription erfolgreich",
          description: "Der Text wurde erfolgreich erstellt und analysiert.",
        });
      }
    } catch (error) {
      console.error("Transcription error:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Die Transkription konnte nicht erstellt werden.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMedicationSelect = (medicationName: string) => {
    console.log("Selected medication name:", medicationName);
    
    setFormData(prev => ({
      ...prev,
      medikament: medicationName,
      packungsbeschreibung: "",
      medikamentId: "",
    }));
    
    fetchPackagingOptions(medicationName);
    setShowMedicationDropdown(false);
  };

  const handlePackagingSelect = (packageId: string) => {
    const selectedPackage = packagingOptions.find(pkg => pkg.id === packageId);
    
    if (selectedPackage) {
      setFormData(prev => ({
        ...prev,
        medikamentId: packageId,
        packungsbeschreibung: selectedPackage.description,
      }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    
    setFormData(prev => ({ ...prev, [id]: value }));
    
    if (id === 'medikament' && value.trim().length >= 2) {
      setShowMedicationDropdown(true);
    }
  };

  const handleSave = async () => {
    try {
      console.log("Searching for diagnosis:", formData.diagnose);
      
      const allDiagnoses = await getAllDiagnoses();
      console.log("All diagnoses:", allDiagnoses);

      const diagnoseData = await findDiagnoseByName(formData.diagnose);
      
      if (!diagnoseData) {
        console.log("Available diagnoses:", allDiagnoses?.map(d => ({
          diagnose: d.diagnose,
          exact_match: d.diagnose === formData.diagnose,
          case_insensitive_match: d.diagnose.toLowerCase() === formData.diagnose.toLowerCase(),
          includes_match: d.diagnose.toLowerCase().includes(formData.diagnose.toLowerCase())
        })));
        throw new Error(`Keine Diagnose mit dem Namen "${formData.diagnose}" gefunden.`);
      }

      console.log("Found diagnose data:", diagnoseData);

      const amountMatch = formData.medikamentMenge.match(/(\d+(?:[.,]\d+)?)/);
      const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : null;

      const { error: behandlungError } = await supabase
        .from("behandlungen")
        .insert({
          diagnose_id: diagnoseData.id,
          medikament_id: formData.medikamentId || null,
          medikament_typ: formData.medikamentTyp,
          medikament_menge: amount,
          untersuchung_datum: new Date(formData.untersuchungsDatum).toISOString(),
          praxis_id: patientData?.praxis_id,
          patient_id: state?.patientId
        });

      if (behandlungError) throw behandlungError;

      toast({
        title: "Gespeichert",
        description: "Die Behandlung wurde erfolgreich gespeichert.",
      });

      navigate(`/patient/${state.patientId}`);
      
    } catch (error) {
      console.error("Save error:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message || "Die Behandlung konnte nicht gespeichert werden.",
      });
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Sprachaufnahme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-center">
              <Button
                size="lg"
                variant={isRecording ? "destructive" : "default"}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
              >
                {isRecording ? (
                  <>
                    <MicOff className="mr-2" />
                    Aufnahme stoppen
                  </>
                ) : (
                  <>
                    <Mic className="mr-2" />
                    Aufnahme starten
                  </>
                )}
              </Button>
            </div>

            {isProcessing && (
              <div className="text-center text-gray-500">
                Transkription wird erstellt...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Behandlungsdetails</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patientName">Patientenname</Label>
                <Input
                  id="patientName"
                  value={formData.patientName}
                  readOnly
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="besitzerName">Besitzername</Label>
                <Input
                  id="besitzerName"
                  value={formData.besitzerName}
                  readOnly
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="spezies">Spezies</Label>
                <Input
                  id="spezies"
                  value={formData.spezies}
                  readOnly
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rasse">Rasse</Label>
                <Input
                  id="rasse"
                  value={formData.rasse}
                  readOnly
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="diagnose">Diagnose</Label>
                <Input
                  id="diagnose"
                  value={formData.diagnose}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medikamentTyp">Medikamententyp</Label>
                <Input
                  id="medikamentTyp"
                  value={formData.medikamentTyp}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medikament">Medikament</Label>
                <Input
                  id="medikament"
                  value={formData.medikament}
                  onChange={handleInputChange}
                  placeholder="Medikament eingeben oder aus der Liste wählen"
                  className="mb-1"
                />
                {showMedicationDropdown && formData.medikament.trim().length >= 2 && (
                  <Select onValueChange={handleMedicationSelect}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Medikament auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingMedications ? (
                        <SelectItem value="loading" disabled>Lade Medikamente...</SelectItem>
                      ) : medicationOptions.length > 0 ? (
                        medicationOptions.map((med) => (
                          <SelectItem key={med.id} value={med.name}>
                            {med.name} ({med.masseinheit})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>Keine Medikamente gefunden</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="packungsbeschreibung">Packungsbeschreibung</Label>
                <Select 
                  onValueChange={handlePackagingSelect} 
                  value={formData.medikamentId}
                  disabled={packagingOptions.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Packung auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingPackaging ? (
                      <SelectItem value="loading" disabled>Lade Verpackungen...</SelectItem>
                    ) : packagingOptions.length > 0 ? (
                      packagingOptions.map((pack) => (
                        <SelectItem key={pack.id} value={pack.id}>
                          {pack.description}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        {formData.medikament ? 'Keine Packungen verfügbar' : 'Bitte zuerst ein Medikament auswählen'}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="medikamentMenge">Medikamentenmenge</Label>
                <Input
                  id="medikamentMenge"
                  value={formData.medikamentMenge}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="untersuchungsDatum">Untersuchungsdatum</Label>
                <Input
                  id="untersuchungsDatum"
                  type="date"
                  value={formData.untersuchungsDatum}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {transcription && (
              <div className="mt-4">
                <Label htmlFor="transcription">Transkription</Label>
                <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap mt-2">
                  {transcription}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSave}
                disabled={isProcessing}
              >
                Speichern
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Transcription;
