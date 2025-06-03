
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import OwnerConsultationRoom from "./OwnerConsultationRoom";

const OwnerConsultationRoomWrapper = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [consultation, setConsultation] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [sessionToken, setSessionToken] = useState<string>("");

  useEffect(() => {
    const validateSessionAndFetchData = async () => {
      try {
        // Get session token from URL params or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token') || localStorage.getItem('owner_session_token');
        
        if (!token) {
          toast({
            title: "Fehler",
            description: "Kein gültiger Session-Token gefunden.",
            variant: "destructive",
          });
          navigate('/owner/join');
          return;
        }

        setSessionToken(token);

        // Validate session token
        const { data: sessionData, error: sessionError } = await supabase
          .rpc('validate_owner_session', { token_param: token });

        if (sessionError || !sessionData || sessionData.length === 0) {
          console.error("Session validation error:", sessionError);
          toast({
            title: "Fehler",
            description: "Session ist ungültig oder abgelaufen.",
            variant: "destructive",
          });
          navigate('/owner/join');
          return;
        }

        const { besitzer_id, consultation_id } = sessionData[0];

        // Fetch consultation data
        const { data: consultationData, error: consultationError } = await supabase
          .from('video_consultations')
          .select(`
            *,
            patient:patient_id (
              id,
              name,
              spezies
            ),
            doctor:doctor_id (
              id,
              vorname,
              nachname
            )
          `)
          .eq('id', consultation_id)
          .single();

        if (consultationError) {
          console.error("Error fetching consultation:", consultationError);
          toast({
            title: "Fehler",
            description: "Konsultation konnte nicht geladen werden.",
            variant: "destructive",
          });
          return;
        }

        // Fetch owner data
        const { data: ownerData, error: ownerError } = await supabase
          .from('besitzer')
          .select('*')
          .eq('id', besitzer_id)
          .single();

        if (ownerError) {
          console.error("Error fetching owner:", ownerError);
          toast({
            title: "Fehler",
            description: "Besitzerdaten konnten nicht geladen werden.",
            variant: "destructive",
          });
          return;
        }

        setConsultation(consultationData);
        setOwner(ownerData);
        
        // Store token in localStorage for future use
        localStorage.setItem('owner_session_token', token);
        
      } catch (error) {
        console.error("Unexpected error:", error);
        toast({
          title: "Fehler",
          description: "Ein unerwarteter Fehler ist aufgetreten.",
          variant: "destructive",
        });
        navigate('/owner/join');
      } finally {
        setLoading(false);
      }
    };

    validateSessionAndFetchData();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span>Lädt Konsultation...</span>
      </div>
    );
  }

  if (!consultation || !owner) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Konsultation nicht gefunden</h2>
          <p className="text-muted-foreground">Die angeforderte Konsultation konnte nicht geladen werden.</p>
        </div>
      </div>
    );
  }

  return (
    <OwnerConsultationRoom 
      sessionToken={sessionToken}
      consultation={consultation}
      owner={owner}
    />
  );
};

export default OwnerConsultationRoomWrapper;
