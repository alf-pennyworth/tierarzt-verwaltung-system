
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
  const [packagingOptions, setPackagingOptions] = useState<string[]>([]);
  const [isLoadingMedications, setIsLoadingMedications] = useState(false);

  const [formData, setFormData] = useState({
    patientName: "",
    besitzerName: "",
    spezies: "",
    rasse: "",
    diagnose: "",
    medikamentTyp: "",
    medikament: "",
    medikamentId: "", // New field to store selected medication ID
    medikamentMenge: "",
    packungsbeschreibung: "", // New field for package description
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
    // When medikament field is updated, search for matching medications
    const searchForMedications = async () => {
      if (formData.medikament.trim().length < 2) {
        setMedicationOptions([]);
        return;
      }
      
      try {
        setIsLoadingMedications(true);
        const medications = await searchMedications(formData.medikament);
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
  }, [formData.medikament, toast]);

  useEffect(() => {
    // When medication ID changes, fetch packaging options
    const fetchPackagingOptions = async () => {
      if (!formData.medikamentId) {
        setPackagingOptions([]);
        return;
      }
      
      try {
        const options = await getPackagingDescriptions(formData.medikamentId);
        setPackagingOptions(options);
      } catch (error) {
        console.error("Error fetching packaging options:", error);
        toast({
          variant: "destructive",
          title: "Fehler",
          description: "Fehler beim Laden der Verpackungsoptionen.",
        });
      }
    };

    fetchPackagingOptions();
  }, [formData.medikamentId, toast]);

  const fetchOptionsAndProcess = async (transcriptionText: string) => {
    console.log("Processing text:", transcriptionText);
    try {
      const { data, error } = await supabase.functions.invoke('match-text', {
        body: { transcription: transcriptionText }
      });

      if (error) throw error;

      console.log("Matching results:", data);

      setFormData(prev => ({
        ...prev,
        diagnose: data.diagnoses.map((m: any) => m.name).join(', '),
        medikament: data.medications.map((m: any) => m.name).join(', '),
        medikamentTyp: data.medications[0]?.medication_type?.name || "",
        medikamentMenge: data.medications[0]?.amount ? 
          `${data.medications[0].amount} ${data.medications[0].unit}` : 
          "",
      }));

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

  const handleMedicationSelect = (medicationId: string) => {
    const selectedMedication = medicationOptions.find(med => med.id === medicationId);
    
    setFormData(prev => ({
      ...prev,
      medikamentId: medicationId,
      medikament: selectedMedication?.name || prev.medikament,
      packungsbeschreibung: "", // Reset packaging description when medication changes
    }));
  };

  const handlePackagingSelect = (packaging: string) => {
    setFormData(prev => ({
      ...prev,
      packungsbeschreibung: packaging,
    }));
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

      // Parse the amount from medikamentMenge if it exists
      const amountMatch = formData.medikamentMenge.match(/(\d+(?:[.,]\d+)?)/);
      const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : null;

      const { error: behandlungError } = await supabase
        .from("behandlungen")
        .insert({
          diagnose_id: diagnoseData.id,
          medikament_id: formData.medikamentId || null, // Use the selected medication ID
          medikament_typ: formData.medikamentTyp,
          medikament_menge: amount, // Now passing a number or null
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
                  onChange={(e) => setFormData(prev => ({ ...prev, diagnose: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medikamentTyp">Medikamententyp</Label>
                <Input
                  id="medikamentTyp"
                  value={formData.medikamentTyp}
                  onChange={(e) => setFormData(prev => ({ ...prev, medikamentTyp: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medikament">Medikament</Label>
                <Input
                  id="medikament"
                  value={formData.medikament}
                  onChange={(e) => setFormData(prev => ({ ...prev, medikament: e.target.value }))}
                  placeholder="Medikament eingeben oder aus der Liste wählen"
                />
                {formData.medikament.length > 1 && (
                  <Select onValueChange={handleMedicationSelect} value={formData.medikamentId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Medikament auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingMedications ? (
                        <SelectItem value="loading" disabled>Lade Medikamente...</SelectItem>
                      ) : medicationOptions.length > 0 ? (
                        medicationOptions.map((med) => (
                          <SelectItem key={med.id} value={med.id}>
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
                  value={formData.packungsbeschreibung}
                  disabled={!formData.medikamentId || packagingOptions.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Packung auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {packagingOptions.length > 0 ? (
                      packagingOptions.map((pack, index) => (
                        <SelectItem key={index} value={pack}>
                          {pack}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        {formData.medikamentId ? 'Keine Packungen verfügbar' : 'Bitte zuerst ein Medikament auswählen'}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, medikamentMenge: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="untersuchungsDatum">Untersuchungsdatum</Label>
                <Input
                  id="untersuchungsDatum"
                  type="date"
                  value={formData.untersuchungsDatum}
                  onChange={(e) => setFormData(prev => ({ ...prev, untersuchungsDatum: e.target.value }))}
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
