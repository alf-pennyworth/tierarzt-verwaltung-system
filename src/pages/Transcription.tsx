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
import { searchMedications, getPackagingDescriptions, getMedicationTypeByName } from "@/services/medicationService";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

// Custom auto-resizing textarea component defined inline.
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
  // When true, the medication dropdown (select control) is rendered.
  const [showMedicationDropdown, setShowMedicationDropdown] = useState(false);

  // States for timer and audio visualization
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // When the "medikament" field has a value (for example, from transcription), render the dropdown.
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

  // Gemini LLM function remains unchanged
  const callGeminiLLM = async (transcribedText: string) => {
    const prompt = `
Extract the following details from the text:
- medikament: the medication name mentioned.
- medikamentTyp: based on the medication name, determine its type (for example, if the medikament is "amoxicillin", output "Antibiotikum").
- diagnose: extract the diagnosis name. First, check if any part of the text matches a diagnosis from the "Standart Diagnoseschlüssel" by Prof. Staufenbiel; if not, then check for a match in the ICD system (but return the diagnosis name, not the code); if still nothing is found, assume a plausible diagnosis.
- medikamentMenge: extract the medication amount with its unit (for example, "500 mg" or "2 ml").
- soapNotes: generate a concise SOAP note based on the text. The note should briefly cover Subjective, Objective, Assessment, and Plan. The SOAP notes need to be in German.

Return the result strictly as a JSON object with exactly these keys. For example:
{
  "medikament": "Amoxicillin",
  "medikamentTyp": "Antibiotikum",
  "diagnose": "Atemwegsinfektion",
  "medikamentMenge": "500 mg",
  "soapNotes": "Subjective: ... Objective: ... Assessment: ... Plan: ..."
}

Text: ${transcribedText}
    `;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`;
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      });
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }
      const data = await response.json();
      console.log("Raw Gemini response:", data);
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

  // Start recording: set up MediaRecorder, audio visualization, and timer
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

      // Set up audio visualization using Web Audio API
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      source.connect(analyserRef.current);

      const animate = () => {
        if (analyserRef.current && dataArrayRef.current) {
          analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
          let sum = 0;
          for (let i = 0; i < dataArrayRef.current.length; i++) {
            const value = dataArrayRef.current[i] - 128;
            sum += value * value;
          }
          const rms = Math.sqrt(sum / dataArrayRef.current.length);
          setAudioLevel(rms);
        }
        animationFrameIdRef.current = requestAnimationFrame(animate);
      };
      animate();

      // Start timer
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => {
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

  // Stop recording: clean up MediaRecorder, audio context, visualization, and timer
  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;
    return new Promise<void>((resolve) => {
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
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);

      // Clean up audio visualization and timer
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
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
        // Call Gemini LLM to extract structured data including soapNotes
        const geminiResponse = await callGeminiLLM(data.text);
        console.log("Parsed Gemini response object:", geminiResponse);
        if (geminiResponse && geminiResponse.candidates && geminiResponse.candidates[0]?.content?.parts?.[0]?.text) {
          let candidateText = geminiResponse.candidates[0].content.parts[0].text;
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
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Die Transkription konnte nicht erstellt werden.",
      });
    } finally {
      setIsProcessing(false);
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
    // Hide the dropdown after selection.
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
      // Try to find a matching diagnosis from the table
      const diagnoseData = await findDiagnoseByName(formData.diagnose);
      // If found, use the id; if not, use the diagnosis text as a fallback.
      const diagnose_id = diagnoseData ? diagnoseData.id : null;
      const diagnose_fallback = diagnoseData ? null : formData.diagnose;
      const amountMatch = formData.medikamentMenge.match(/(\d+(?:[.,]\d+)?)/);
      const amount = amountMatch ? parseFloat(amountMatch[1].replace(",", ".")) : null;
      const { error: behandlungError } = await supabase
        .from("behandlungen")
        .insert({
          diagnose_id,
          diagnose_fallback,
          SOAP: formData.soapNotes, // Save SOAP notes to the soap column.
          medikament_id: formData.medikamentId || null,
          medikament_typ: formData.medikamentTyp,
          medikament_menge: amount,
          untersuchung_datum: new Date(formData.untersuchungsDatum).toISOString(),
          praxis_id: patientData?.praxis_id,
          patient_id: state?.patientId,
        });
      if (behandlungError) throw behandlungError;
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
            {/* First grid: most fields except SOAP Notes */}
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
              {/* Two fields in one row */}
              <div className="space-y-2">
                <Label htmlFor="medikamentMenge">Medikamentenmenge</Label>
                <Input id="medikamentMenge" value={formData.medikamentMenge} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="untersuchungsDatum">Untersuchungsdatum</Label>
                <Input id="untersuchungsDatum" type="date" value={formData.untersuchungsDatum} onChange={handleInputChange} />
              </div>
            </div>
            {/* SOAP Notes full-width auto-resizing textarea */}
            <div className="space-y-2">
              <Label htmlFor="soapNotes">SOAP Notes</Label>
              <AutoResizingTextarea
                id="soapNotes"
                value={formData.soapNotes}
                onChange={handleInputChange}
                placeholder="SOAP Notizen"
              />
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
