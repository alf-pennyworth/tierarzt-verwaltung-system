
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Video } from "lucide-react";

interface ConsultationDetails {
  id: string;
  title: string;
  doctorName: string;
  patientName: string;
  scheduledStart: string;
  scheduledEnd: string;
}

const OwnerConsultationJoin = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [validatingToken, setValidatingToken] = useState(true);
  const [consultation, setConsultation] = useState<ConsultationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Kein Zugriffstoken gefunden. Bitte überprüfen Sie den Link.");
      setValidatingToken(false);
      return;
    }

    const validateToken = async () => {
      try {
        // Validate the token
        const { data, error: validateError } = await supabase
          .rpc('validate_owner_session', { token_param: token });
        
        if (validateError || !data || data.length === 0) {
          setError("Der Zugangslink ist ungültig oder abgelaufen.");
          setValidatingToken(false);
          return;
        }

        const { consultation_id } = data[0];
        
        // Get consultation details
        const { data: consultationData, error: consultationError } = await supabase
          .from('video_consultations')
          .select(`
            id,
            title,
            scheduled_start,
            scheduled_end,
            doctor:doctor_id(vorname, nachname),
            patient:patient_id(name)
          `)
          .eq('id', consultation_id)
          .single();
        
        if (consultationError || !consultationData) {
          setError("Die Konsultation konnte nicht gefunden werden.");
          setValidatingToken(false);
          return;
        }

        setConsultation({
          id: consultationData.id,
          title: consultationData.title,
          doctorName: `${consultationData.doctor.vorname} ${consultationData.doctor.nachname}`,
          patientName: consultationData.patient.name,
          scheduledStart: consultationData.scheduled_start,
          scheduledEnd: consultationData.scheduled_end
        });
        
        // Mark the consultation as having the owner joined
        await supabase
          .from('video_consultations')
          .update({ owner_joined: true })
          .eq('id', consultation_id);
      } catch (err) {
        console.error("Error validating token:", err);
        setError("Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.");
      } finally {
        setValidatingToken(false);
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const joinConsultation = () => {
    if (!consultation) return;
    
    // Store the token in session storage for use in the consultation room
    sessionStorage.setItem('owner_access_token', token!);
    navigate(`/telemedizin/owner/room/${consultation.id}`);
  };

  if (validatingToken) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Überprüfe Zugang...</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center p-6">
            <Loader2 className="animate-spin h-16 w-16 text-blue-500" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-500">Zugriffsfehler</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">{error}</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>
              Zurück zur Startseite
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Videokonsultation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">Keine Konsultationsdetails gefunden</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>
              Zurück zur Startseite
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Videokonsultation beitreten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium">Konsultation:</p>
            <p className="text-lg">{consultation.title}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Tierarzt:</p>
            <p>{consultation.doctorName}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Patient:</p>
            <p>{consultation.patientName}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Datum & Uhrzeit:</p>
            <p>
              {new Date(consultation.scheduledStart).toLocaleDateString()} 
              {' '}
              {new Date(consultation.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {' '}-{' '}
              {new Date(consultation.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={joinConsultation} className="w-full">
            <Video className="mr-2 h-4 w-4" />
            Videokonsultation beitreten
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default OwnerConsultationJoin;
