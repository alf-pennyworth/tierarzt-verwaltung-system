import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { findDatabaseMatches } from "@/utils/textMatching";

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

interface DiagnoseOption {
  id: string;
  diagnose: string;
}

interface MedikamentOption {
  id: string;
  name: string;
}

const Transcription = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [diagnoseOptions, setDiagnoseOptions] = useState<DiagnoseOption[]>([]);
  const [medikamentOptions, setMedikamentOptions] = useState<MedikamentOption[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const location = useLocation();
  const state = location.state as LocationState;

  const [formData, setFormData] = useState({
    patientName: "",
    besitzerName: "",
    spezies: "",
    rasse: "",
    diagnose: "",
    medikamentTyp: "",
    medikament: "",
    medikamentMenge: "",
    untersuchungsDatum: format(new Date(), "yyyy-MM-dd"),
  });

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const { data: diagnoseData, error: diagnoseError } = await supabase
          .from('diagnose')
          .select('id, diagnose')
          .is('deleted_at', null);
        
        if (diagnoseError) {
          console.error('Error fetching diagnoses:', diagnoseError);
          toast({
            variant: "destructive",
            title: "Fehler",
            description: "Diagnosen konnten nicht geladen werden.",
          });
          return;
        }
        
        const { data: medikamentData, error: medikamentError } = await supabase
          .from('medikamente')
          .select('id, name')
          .is('deleted_at', null);

        if (medikamentError) {
          console.error('Error fetching medications:', medikamentError);
          toast({
            variant: "destructive",
            title: "Fehler",
            description: "Medikamente konnten nicht geladen werden.",
          });
          return;
        }

        console.log('Loaded diagnoses:', diagnoseData);
        console.log('Loaded medications:', medikamentData);

        if (diagnoseData) setDiagnoseOptions(diagnoseData);
        if (medikamentData) setMedikamentOptions(medikamentData);
      } catch (error) {
        console.error('Error in fetchOptions:', error);
      }
    };

    fetchOptions();
  }, []);

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

  const extractMedicalInfo = (text: string) => {
    console.log("Processing transcription:", text);
    console.log("Available diagnose options:", diagnoseOptions);
    console.log("Available medication options:", medikamentOptions);
    
    const diagnosisMatch = findDatabaseMatches(text, diagnoseOptions.map(d => ({ 
      id: d.id, 
      name: d.diagnose 
    })));
    
    const medicationMatch = findDatabaseMatches(text, medikamentOptions.map(m => ({ 
      id: m.id, 
      name: m.name 
    })), true);

    console.log("Found diagnosis:", diagnosisMatch);
    console.log("Found medication:", medicationMatch);

    const extractedInfo = {
      diagnose: diagnosisMatch?.name || "",
      medikament: medicationMatch?.name || "",
      menge: medicationMatch?.amount || "",
    };

    console.log("Setting form data with:", extractedInfo);
    
    setFormData(prev => ({
      ...prev,
      diagnose: extractedInfo.diagnose,
      medikament: extractedInfo.medikament,
      medikamentMenge: extractedInfo.menge,
    }));

    return extractedInfo;
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
        console.log("New transcription received:", data.text); // Debug log
        setTranscription(data.text);
        const extractedInfo = extractMedicalInfo(data.text); // Pass the new text directly
        
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

  const handleSave = async () => {
    try {
      const { data: diagnoseData, error: diagnoseError } = await supabase
        .from("diagnose")
        .select("id")
        .ilike("diagnose", `%${formData.diagnose}%`)
        .single();

      if (diagnoseError) throw diagnoseError;

      const { data: medikamentData, error: medikamentError } = await supabase
        .from("medikamente")
        .select("id, masseinheit")
        .ilike("name", `%${formData.medikament}%`)
        .single();

      if (medikamentError && formData.medikament) throw medikamentError;

      const { error: behandlungError } = await supabase
        .from("behandlungen")
        .insert({
          patient_id: state?.patientId,
          diagnose_id: diagnoseData.id,
          medikament_id: medikamentData?.id,
          medikament_typ: formData.medikamentTyp,
          medikament_menge: parseFloat(formData.medikamentMenge),
          untersuchung_datum: formData.untersuchungsDatum,
          praxis_id: patientData?.praxis_id, // This should come from the authenticated user's context
        });

      if (behandlungError) throw behandlungError;

      toast({
        title: "Gespeichert",
        description: "Die Behandlung wurde erfolgreich gespeichert.",
      });
    } catch (error) {
      console.error("Save error:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Die Behandlung konnte nicht gespeichert werden.",
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medikamentMenge">Medikamentenmenge</Label>
                <Input
                  id="medikamentMenge"
                  type="number"
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
