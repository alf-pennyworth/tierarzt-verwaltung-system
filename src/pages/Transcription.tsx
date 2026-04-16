
import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, AlertTriangle, Copy, Check, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { getAllDiagnoses, findDiagnoseByName } from "@/services/diagnoseService";
import { searchMedications, getPackagingDescriptions, getMedicationTypeByName } from "@/services/medicationService";
import { updateInventoryAfterUsage, createAutomaticReorder } from "@/services/inventoryIntegration";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";

const AutoResizingTextarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    resizeTextarea();
  }, [props.value]);

  return (
    <textarea
      {...props}
      ref={textareaRef}
      onInput={resizeTextarea}
      className={`w-full p-2 border border-gray-300 rounded resize-none ${props.className || ""}`}
    />
  );
};

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

interface EntityDetection {
  text: string;
  entity_type: string;
  start: number;
  end: number;
}

const Transcription = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [isGeneratingSoap, setIsGeneratingSoap] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const { toast } = useToast();
  const location = useLocation();
  const state = location.state as LocationState;
  const navigate = useNavigate();
  const { user, userInfo } = useAuth();

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
    soapNotes: "",
    untersuchungsDatum: format(new Date(), "yyyy-MM-dd"),
  });

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!state?.patientId) return;
      const { data, error } = await supabase
        .from("patient")
        .select(`
          name,
          spezies,
          rasse,
          praxis_id,
          besitzer (
            name
          )
        `)
        .eq("id", state.patientId)
        .single();
      if (error) {
        console.error("Error fetching patient data:", error);
        toast({
          variant: "destructive",
          title: "Fehler",
          description: "Patientendaten konnten nicht geladen werden.",
        });
        return;
      }
      if (data) {
        setPatientData(data);
        setFormData((prev) => ({
          ...prev,
          patientName: data.name,
          besitzerName: data.besitzer.name,
          spezies: data.spezies,
          rasse: data.rasse || "",
        }));
      }
    };
    fetchPatientData();
  }, [state?.patientId, toast]);

  useEffect(() => {
    if (formData.medikament.trim().length >= 2) {
      setShowMedicationDropdown(true);
    }
  }, [formData.medikament]);

  useEffect(() => {
    const searchForMedications = async () => {
      if (formData.medikament.trim().length < 2 || !showMedicationDropdown) return;
      try {
        setIsLoadingMedications(true);
        const medications = await searchMedications(formData.medikament, userInfo?.praxisId);
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
  }, [formData.medikament, showMedicationDropdown, toast, userInfo]);

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

  const callGeminiLLM = async (transcribedText: string) => {
    try {
      console.log("Calling Gemini LLM via Edge Function");
      const { data, error } = await supabase.functions.invoke("gemini", {
        body: { text: transcribedText },
      });
      
      if (error) {
        console.error("Error calling Gemini Edge Function:", error);
        throw error;
      }
      
      console.log("Raw Gemini response from Edge Function:", data);
      return data;
    } catch (error) {
      console.error("Error calling Gemini LLM:", error);
      return null;
    }
  };

  const handleAssemblyAIEntities = async (entities: EntityDetection[], transcriptionText: string) => {
    console.log("Processing AssemblyAI entities:", entities);
    const drugEntities = entities.filter((entity) => entity.entity_type === "drug");
    console.log("Drug entities found:", drugEntities);
    if (drugEntities.length > 0) {
      const firstDrug = drugEntities[0];
      const drugName = firstDrug.text;
      setFormData((prev) => ({
        ...prev,
        medikament: drugName,
      }));
      try {
        const medicationType = await getMedicationTypeByName(drugName);
        console.log("Found medication type:", medicationType);
        if (medicationType) {
          setFormData((prev) => ({
            ...prev,
            medikamentTyp: medicationType,
          }));
          toast({
            title: "Medikamenttyp erkannt",
            description: `Medikamenttyp "${medicationType}" wurde gefunden.`,
          });
        }
      } catch (error) {
        console.error("Error fetching medication type:", error);
      }
      if (drugName.length >= 2) {
        setShowMedicationDropdown(true);
      }
      toast({
        title: "Medikament erkannt",
        description: `Medikament "${drugName}" wurde im Text gefunden.`,
      });
    } else {
      console.log("No drug entities found in the transcription");
    }
    findDiagnosisInText(transcriptionText);
    extractMedicationAmount(transcriptionText);
  };

  const findDiagnosisInText = async (text: string) => {
    try {
      const diagnoses = await getAllDiagnoses();
      console.log("Searching for diagnoses in:", text);
      for (const diag of diagnoses) {
        if (text.toLowerCase().includes(diag.diagnose.toLowerCase())) {
          console.log(`Found diagnosis match: ${diag.diagnose}`);
          setFormData((prev) => ({
            ...prev,
            diagnose: diag.diagnose,
          }));
          toast({
            title: "Diagnose erkannt",
            description: `Diagnose "${diag.diagnose}" wurde im Text gefunden.`,
          });
          return;
        }
      }
      console.log("No diagnosis match found in text");
    } catch (error) {
      console.error("Error finding diagnosis in text:", error);
    }
  };

  const extractMedicationAmount = (text: string) => {
    const amountMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(mg|ml|g|tabletten|kapseln|stück)/i);
    if (amountMatch) {
      const amount = amountMatch[1];
      const unit = amountMatch[2].toLowerCase();
      console.log(`Found medication amount: ${amount} ${unit}`);
      setFormData((prev) => ({
        ...prev,
        medikamentMenge: `${amount} ${unit}`,
      }));
      toast({
        title: "Medikamentenmenge erkannt",
        description: `Menge "${amount} ${unit}" wurde im Text gefunden.`,
      });
    } else {
      console.log("No medication amount found in text");
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

      // Initialize audio analysis for visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyserRef = audioContextRef.current.createAnalyser();
      analyserRef.fftSize = 256;
      const bufferLength = analyserRef.frequencyBinCount;
      const dataArrayRef = new Uint8Array(bufferLength);
      source.connect(analyserRef);

      // Animation loop for audio visualization
      const animate = () => {
        if (analyserRef && dataArrayRef) {
          analyserRef.getByteTimeDomainData(dataArrayRef);
          let sum = 0;
          for (let i = 0; i < dataArrayRef.length; i++) {
            const value = dataArrayRef[i] - 128;
            sum += value * value;
          }
          const rms = Math.sqrt(sum / dataArrayRef.length);
          setAudioLevel(rms);
        }
        animationFrameIdRef.current = requestAnimationFrame(animate);
      };
      animate();

      // Start timer
      setRecordingTime(0);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
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
      if (!mediaRecorderRef.current) {
        resolve();
        return;
      }
      
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
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
      setIsRecording(false);

      // Clean up timer and animation
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setRecordingTime(0);
      setAudioLevel(0);
    });
  };

  const transcribeAudio = async (audioData: string) => {
    setIsProcessing(true);
    setTranscriptionError(null);
    try {
      console.log("Calling transcribe function with audio data length:", audioData.length);
      const { data, error } = await supabase.functions.invoke("transcribe", {
        body: { audio: audioData },
      });
      if (error) throw error;
      console.log("Full transcription response:", data);
      if (data.text) {
        console.log("Transcription text:", data.text);
        setTranscription(data.text);
        const geminiResponse = await callGeminiLLM(data.text);
        console.log("Parsed Gemini response object:", geminiResponse);
        if (geminiResponse && geminiResponse.data && geminiResponse.data.candidates && geminiResponse.data.candidates[0]?.content?.parts?.[0]?.text) {
          let candidateText = geminiResponse.data.candidates[0].content.parts[0].text;
          console.log("Raw Gemini generated text:", candidateText);
          candidateText = candidateText.replace(/```json/g, "").replace(/```/g, "").trim();
          console.log("Cleaned Gemini generated text:", candidateText);
          try {
            const structuredResult = JSON.parse(candidateText);
            console.log("Structured result from Gemini:", structuredResult);
            const { medikament, medikamentTyp, diagnose, medikamentMenge, soapNotes } = structuredResult;
            setFormData((prev) => ({
              ...prev,
              medikament: medikament || prev.medikament,
              medikamentTyp: medikamentTyp || prev.medikamentTyp,
              diagnose: diagnose || prev.diagnose,
              medikamentMenge: medikamentMenge !== undefined ? medikamentMenge : prev.medikamentMenge,
              soapNotes: soapNotes || prev.soapNotes,
            }));
            toast({
              title: "LLM extraction successful",
              description: `Extracted: ${medikament}, ${medikamentTyp}, ${diagnose}, ${medikamentMenge}, SOAP Notes generated.`,
            });
          } catch (jsonError) {
            console.error("JSON parsing error:", jsonError);
          }
        } else if (data.entities && data.entities.length > 0) {
          await handleAssemblyAIEntities(data.entities, data.text);
        } else {
          findDiagnosisInText(data.text);
          extractMedicationAmount(data.text);
        }
        toast({
          title: "Transkription erfolgreich",
          description: "Der Text wurde erfolgreich erstellt.",
        });
      }
    } catch (error) {
      console.error("Transcription error:", error);
      setTranscriptionError("Die Transkription konnte nicht erstellt werden. Bitte versuchen Sie es erneut.");
      toast({
        variant: "destructive",
        title: "Fehler bei der Transkription",
        description: "Die Transkription konnte nicht erstellt werden. Bitte versuchen Sie es erneut.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateSoapNote = async () => {
    if (!transcription) {
      toast({
        variant: "destructive",
        title: "Kein Transkript",
        description: "Bitte erstellen Sie zuerst eine Transkription.",
      });
      return;
    }

    setIsGeneratingSoap(true);
    try {
      const response = await fetch('/api/soap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          transcript: transcription,
          patient_info: {
            name: patientData?.name,
            species: patientData?.spezies,
            breed: patientData?.rasse,
          },
          language: 'de',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'SOAP-Generierung fehlgeschlagen');
      }

      const result = await response.json();
      
      if (result.soap) {
        setFormData((prev) => ({
          ...prev,
          soapNotes: result.soap,
        }));
        toast({
          title: "SOAP-Notiz erstellt",
          description: "Die SOAP-Notiz wurde erfolgreich generiert.",
        });
      }
    } catch (error: any) {
      console.error("SOAP generation error:", error);
      toast({
        variant: "destructive",
        title: "Fehler bei der SOAP-Generierung",
        description: error.message || "Die SOAP-Notiz konnte nicht erstellt werden.",
      });
    } finally {
      setIsGeneratingSoap(false);
    }
  };

  const copyTranscriptToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(transcription);
      setCopiedTranscript(true);
      toast({
        title: "Kopiert",
        description: "Transkript wurde in die Zwischenablage kopiert.",
      });
      setTimeout(() => setCopiedTranscript(false), 2000);
    } catch (error) {
      console.error("Copy error:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Transkript konnte nicht kopiert werden.",
      });
    }
  };

  const handleMedicationSelect = async (medicationName: string) => {
    console.log("Selected medication name:", medicationName);
    const selectedMedication = medicationOptions.find((med) => med.name === medicationName);
    setFormData((prev) => ({
      ...prev,
      medikament: medicationName,
      packungsbeschreibung: "",
      medikamentId: "",
    }));
    try {
      console.log("Fetching medication type for selected medication:", medicationName);
      const medicationType = await getMedicationTypeByName(medicationName);
      console.log("Found medication type for selected medication:", medicationType);
      if (medicationType) {
        setFormData((prev) => ({
          ...prev,
          medikamentTyp: medicationType,
        }));
        toast({
          title: "Medikamenttyp geladen",
          description: `Medikamenttyp "${medicationType}" wurde geladen.`,
        });
      } else {
        let defaultType = "Medikament";
        if (medicationName.toLowerCase().includes("amoxicillin")) {
          defaultType = "Antibiotikum";
        }
        setFormData((prev) => ({
          ...prev,
          medikamentTyp: defaultType,
        }));
        toast({
          title: "Medikamenttyp nicht gefunden",
          description: `Standard-Typ "${defaultType}" wurde verwendet.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching medication type for selected medication:", error);
      toast({
        title: "Fehler",
        description: "Fehler beim Laden des Medikamenttyps.",
        variant: "destructive",
      });
    }
    fetchPackagingOptions(medicationName);
    setShowMedicationDropdown(false);
  };

  const handlePackagingSelect = (packageId: string) => {
    const selectedPackage = packagingOptions.find((pkg) => pkg.id === packageId);
    if (selectedPackage) {
      setFormData((prev) => ({
        ...prev,
        medikamentId: packageId,
        packungsbeschreibung: selectedPackage.description,
      }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (id === "medikament" && value.trim().length >= 2) {
      setShowMedicationDropdown(true);
    }
  };

  const handleSave = async () => {
    try {
      console.log("Searching for diagnosis:", formData.diagnose);
      const allDiagnoses = await getAllDiagnoses();
      console.log("All diagnoses:", allDiagnoses);
      const diagnoseData = await findDiagnoseByName(formData.diagnose);
      const diagnose_id = diagnoseData ? diagnoseData.id : null;
      const diagnose_fallback = diagnoseData ? null : formData.diagnose;
      const amountMatch = formData.medikamentMenge.match(/(\d+(?:[.,]\d+)?)/);
      const amount = amountMatch ? parseFloat(amountMatch[1].replace(",", ".")) : null;
      
      // Create treatment record
      const { data: behandlung, error: behandlungError } = await supabase
        .from("behandlungen")
        .insert({
          diagnose_id,
          diagnose_fallback,
          SOAP: formData.soapNotes,
          medikament_id: formData.medikamentId || null,
          medikament_typ: formData.medikamentTyp,
          medikament_menge: amount,
          untersuchung_datum: new Date(formData.untersuchungsDatum).toISOString(),
          praxis_id: patientData?.praxis_id,
          patient_id: state?.patientId,
        })
        .select()
        .single();

      if (behandlungError) throw behandlungError;

      // Update inventory if medication was used
      if (formData.medikamentId && amount && amount > 0) {
        try {
          const inventoryResult = await updateInventoryAfterUsage({
            medicationId: formData.medikamentId,
            amount: amount,
            patientId: state?.patientId || '',
            treatmentId: behandlung.id
          });

          if (inventoryResult.lowStockWarning) {
            toast({
              title: "Lagerbestand niedrig",
              description: `${inventoryResult.medicationName} hat nur noch ${inventoryResult.newStock} Einheiten auf Lager.`,
              variant: "destructive",
            });
            
            // Create automatic reorder if stock is very low
            await createAutomaticReorder(formData.medikamentId);
          } else {
            toast({
              title: "Lagerbestand aktualisiert",
              description: `${inventoryResult.medicationName}: ${inventoryResult.newStock} Einheiten verbleibend.`,
            });
          }
        } catch (inventoryError) {
          console.error('Inventory update failed:', inventoryError);
          toast({
            title: "Warnung",
            description: "Behandlung gespeichert, aber Lagerbestand konnte nicht aktualisiert werden.",
            variant: "destructive",
          });
        }
      }

      // Create appointment follow-up suggestion
      if (formData.diagnose.toLowerCase().includes('nachkontrolle') || 
          formData.soapNotes.toLowerCase().includes('kontroll')) {
        toast({
          title: "Nachkontrolle empfohlen",
          description: "Möchten Sie einen Nachkontrolltermin planen?",
          action: (
            <Button 
              size="sm" 
              onClick={() => navigate(`/appointments?patientId=${state?.patientId}`)}
            >
              Termin planen
            </Button>
          ),
        });
      }

      toast({
        title: "Gespeichert",
        description: "Die Behandlung wurde erfolgreich gespeichert.",
      });
      navigate(`/patient/${state.patientId}`);
    } catch (error: any) {
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
            {isRecording && (
              <div className="mt-2 flex items-center space-x-4 justify-center">
                <span>Aufnahmezeit: {recordingTime}s</span>
                <div className="w-24 h-4 bg-gray-200 relative">
                  <div
                    style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
                    className="h-full bg-green-500 transition-all duration-100"
                  ></div>
                </div>
              </div>
            )}
            {isProcessing && (
              <div className="text-center text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                Transkription wird erstellt...
              </div>
            )}
            {transcriptionError && !isProcessing && (
              <div className="flex items-center justify-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
                <span>{transcriptionError}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transcript Display Card */}
      {transcription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Transkript</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyTranscriptToClipboard}
                  disabled={isProcessing}
                >
                  {copiedTranscript ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Kopiert
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Kopieren
                    </>
                  )}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={generateSoapNote}
                  disabled={isGeneratingSoap || isProcessing}
                >
                  {isGeneratingSoap ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generiere...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      SOAP-Notiz generieren
                    </>
                  )}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-sm">
              {transcription}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Behandlungsdetails</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patientName">Patientenname</Label>
                <Input id="patientName" value={formData.patientName} readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="besitzerName">Besitzername</Label>
                <Input id="besitzerName" value={formData.besitzerName} readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spezies">Spezies</Label>
                <Input id="spezies" value={formData.spezies} readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rasse">Rasse</Label>
                <Input id="rasse" value={formData.rasse} readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diagnose">Diagnose</Label>
                <Input id="diagnose" value={formData.diagnose} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medikamentTyp">Medikamententyp</Label>
                <Input id="medikamentTyp" value={formData.medikamentTyp} onChange={handleInputChange} />
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
                        <SelectItem value="loading" disabled>
                          Lade Medikamente...
                        </SelectItem>
                      ) : medicationOptions.length > 0 ? (
                        medicationOptions.map((med) => (
                          <SelectItem key={med.id} value={med.name}>
                            {med.name} ({med.masseinheit})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          Keine Medikamente gefunden
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="packungsbeschreibung">Packungsbeschreibung</Label>
                <Select onValueChange={handlePackagingSelect} value={formData.medikamentId} disabled={packagingOptions.length === 0}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Packung auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingPackaging ? (
                      <SelectItem value="loading" disabled>
                        Lade Verpackungen...
                      </SelectItem>
                    ) : packagingOptions.length > 0 ? (
                      packagingOptions.map((pack) => (
                        <SelectItem key={pack.id} value={pack.id}>
                          {pack.description}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        {formData.medikament ? "Keine Packungen verfügbar" : "Bitte zuerst ein Medikament auswählen"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="medikamentMenge">Medikamentenmenge</Label>
                <Input id="medikamentMenge" value={formData.medikamentMenge} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="untersuchungsDatum">Untersuchungsdatum</Label>
                <Input id="untersuchungsDatum" type="date" value={formData.untersuchungsDatum} onChange={handleInputChange} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="soapNotes">SOAP Notes</Label>
              <AutoResizingTextarea
                id="soapNotes"
                value={formData.soapNotes}
                onChange={handleInputChange}
                placeholder="SOAP Notizen"
              />
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={handleSave} disabled={isProcessing}>
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
