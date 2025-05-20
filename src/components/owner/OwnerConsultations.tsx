import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { PatientConsultation } from "@/components/patient";
import { Loader2, Video, VideoOff, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isPast, isFuture } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Consultation {
  id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  room_id: string;
  patient: {
    id: string;
    name: string;
    spezies: string;
  };
  doctor: {
    id: string;
    vorname: string;
    nachname: string;
  };
}

const OwnerConsultations = () => {
  console.log('🔍 OWNER CONSULTATIONS COMPONENT MOUNTED');
  
  const [loading, setLoading] = useState(true);
  const [ownerName, setOwnerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const navigate = useNavigate();

  // WebRTC state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connected, setConnected] = useState(false);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  
  // Video refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    console.log('🔄 OWNER CONSULTATIONS EFFECT RUNNING');
    
    const fetchOwnerConsultations = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('👤 Current user:', user);
        
        if (!user) {
          console.error('❌ No authenticated user found');
          setLoading(false);
          setError("Bitte melden Sie sich an, um Ihre Sprechstunden zu sehen.");
          return;
        }

        // Get owner id based on auth_id
        const { data: ownerData, error: ownerError } = await supabase
          .from('besitzer')
          .select('*')  // Let's select all fields to see everything about the owner
          .eq('auth_id', user.id)
          .single();

        console.log('👤 Auth User ID:', user.id);
        console.log('🏠 Owner Query Result (FULL):', ownerData);
        console.log('🏠 Owner Error:', ownerError);

        if (ownerError || !ownerData) {
          console.error("Error fetching owner data:", ownerError);
          setLoading(false);
          setError("Besitzer-Daten konnten nicht geladen werden.");
          return;
        }

        setOwnerName(ownerData.name || "");
        console.log("Found owner:", ownerData);

        // Get patient IDs that belong to this owner
        console.log('🔍 Searching for patients with EXACT besitzer_id:', ownerData.id);
        console.log('🔍 Owner ID type:', typeof ownerData.id);
        console.log('🔍 Owner ID length:', ownerData.id.length);
        
        // First, let's get ALL patients to see what's in the database
        const { data: allPatientsInDB, error: allPatientsError } = await supabase
          .from('patient')
          .select('id, name, besitzer_id')
          .limit(10);

        console.log('🔍 First 10 patients in database:', allPatientsInDB);
        console.log('🔍 Any errors getting all patients:', allPatientsError);

        // Now try the specific query
        const { data: patientData, error: patientError } = await supabase
          .from('patient')
          .select('id, name, spezies, besitzer_id, praxis_id')
          .eq('besitzer_id', ownerData.id)
          .is('deleted_at', null);

        console.log('🐾 Active Patient Query Result:', { patientData, patientError });

        if (patientError) {
          console.error("Error fetching patients:", patientError);
          setLoading(false);
          setError("Patienten konnten nicht geladen werden.");
          return;
        }

        if (!patientData || patientData.length === 0) {
          console.log("No patients found for owner:", ownerData.id);
          setLoading(false);
          return;
        }

        console.log("Found patients for owner:", patientData);

        const ids = patientData.map(p => p.id);
        console.log("Patient IDs to search for:", ids);
        
        // Get consultations for these patients
        const { data: consultations, error: consultError } = await supabase
          .from('video_consultations')
          .select(`
            id, 
            title,
            scheduled_start,
            scheduled_end,
            status,
            room_id,
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
          .in('patient_id', ids)
          .in('status', ['scheduled', 'in-progress'])
          .order('scheduled_start', { ascending: true });
          
        if (consultError) {
          console.error("Error checking consultations:", consultError);
          setError("Konsultationen konnten nicht geladen werden.");
        } else {
          console.log("Found consultations:", consultations);
          setConsultations(consultations as Consultation[] || []);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        setError("Ein unerwarteter Fehler ist aufgetreten.");
      } finally {
        setLoading(false);
      }
    };

    fetchOwnerConsultations();
  }, []);

  const joinConsultation = async (consultationId: string) => {
    try {
      // Get owner id based on auth user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Fehler",
          description: "Sie müssen angemeldet sein, um der Sprechstunde beizutreten.",
          variant: "destructive",
        });
        return;
      }
      
      const { data: ownerData, error: ownerError } = await supabase
        .from('besitzer')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!ownerData || ownerError) {
        console.error("Error getting owner data:", ownerError);
        toast({
          title: "Fehler",
          description: "Besitzerdaten konnten nicht gefunden werden.",
          variant: "destructive",
        });
        return;
      }

      // Create a session token for this consultation
      const { data: sessionToken, error: sessionError } = await supabase.rpc(
        'create_owner_session',
        { 
          besitzer_id_param: ownerData.id,
          consultation_id_param: consultationId
        }
      );

      if (sessionError || !sessionToken) {
        console.error("Error creating session:", sessionError);
        toast({
          title: "Fehler",
          description: "Es konnte keine Sitzung erstellt werden.",
          variant: "destructive",
        });
        return;
      }

      // Store the token in session storage and navigate to the room
      sessionStorage.setItem('owner_access_token', sessionToken);
      navigate(`/telemedizin/owner/room/${consultationId}`);

    } catch (error) {
      console.error("Error joining consultation:", error);
      toast({
        title: "Fehler",
        description: "Der Videosprechstunde konnte nicht beigetreten werden.",
        variant: "destructive",
      });
    }
  };

  const initializePeerConnection = (ws: WebSocket) => {
    console.log('🔄 Initializing peer connection for owner');
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    const pc = new RTCPeerConnection(configuration);
    console.log('📡 Created new peer connection:', pc);
    
    // Add local stream to peer connection
    if (localStream) {
      console.log('📤 Adding local stream tracks to peer connection');
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('❄️ New ICE candidate:', event.candidate);
        ws.send(JSON.stringify({
          type: 'ice-candidate',
          target: 'doctor',
          candidate: event.candidate
        }));
      }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log("🔌 Connection state changed:", pc.connectionState);
      if (pc.connectionState === 'connected') {
        console.log('✅ Peer connection established!');
        setConnected(true);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        console.log('❌ Peer connection lost or failed');
        setConnected(false);
      }
    };
    
    // Handle receiving remote stream
    pc.ontrack = (event) => {
      console.log('📥 Received remote track:', event.track.kind);
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        console.log('🎥 Setting remote video stream');
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    
    // Handle WebSocket messages for signaling
    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log('📨 Received WebSocket message:', message.type);
      
      switch (message.type) {
        case 'offer':
          console.log('📩 Processing offer from doctor');
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(message));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({
              type: 'answer',
              target: message.sender,
              answer
            }));
            console.log('📤 Sent answer to doctor');
          } catch (error) {
            console.error("❌ Error handling offer:", error);
          }
          break;
          
        case 'answer':
          console.log('📩 Processing answer from doctor');
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(message));
            console.log('✅ Remote description set successfully');
          } catch (error) {
            console.error("❌ Error handling answer:", error);
          }
          break;
          
        case 'ice-candidate':
          console.log('❄️ Processing ICE candidate from doctor');
          try {
            await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
            console.log('✅ Added ICE candidate successfully');
          } catch (error) {
            console.error("❌ Error adding ICE candidate:", error);
          }
          break;
          
        case 'user-joined':
          console.log("👋 User joined:", message.userId);
          // When doctor joins, create an offer
          if (message.userId === 'doctor') {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              ws.send(JSON.stringify({
                type: 'offer',
                target: 'doctor',
                offer
              }));
              console.log('📤 Sent offer to doctor');
            } catch (error) {
              console.error("❌ Error creating offer:", error);
            }
          }
          break;
          
        case 'user-left':
          console.log("👋 User left:", message.userId);
          if (message.userId === 'doctor') {
            toast({
              title: "Tierarzt hat die Konsultation verlassen",
              description: "Der Tierarzt hat die Videokonsultation verlassen."
            });
          }
          break;
      }
    };
    
    setPeerConnection(pc);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fehler</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (consultations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keine Videosprechstunden</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            Es sind derzeit keine Videosprechstunden für Ihre Tiere geplant.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {consultations.map((consultation) => {
        const startDate = new Date(consultation.scheduled_start);
        const endDate = new Date(consultation.scheduled_end);
        const canJoin = consultation.status === 'in-progress' || 
          (consultation.status === 'scheduled' && 
           isPast(startDate) && 
           isFuture(new Date(startDate.getTime() + 30 * 60000)));

        return (
          <Card key={consultation.id}>
            <CardHeader>
              <CardTitle>{consultation.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Patient</p>
                  <p>{consultation.patient.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tierart</p>
                  <p>{consultation.patient.spezies}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Datum
                  </p>
                  <p>{format(startDate, "dd.MM.yyyy")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Uhrzeit
                  </p>
                  <p>
                    {format(startDate, "HH:mm")} - {format(endDate, "HH:mm")}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tierarzt</p>
                  <p>{consultation.doctor.vorname} {consultation.doctor.nachname}</p>
                </div>
              </div>

              <div className="flex justify-end mt-2">
                {canJoin ? (
                  <Button onClick={() => joinConsultation(consultation.id)}>
                    <Video className="mr-2 h-4 w-4" />
                    Sprechstunde beitreten
                  </Button>
                ) : (
                  <Button variant="outline" disabled>
                    <VideoOff className="mr-2 h-4 w-4" />
                    Nicht verfügbar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default OwnerConsultations;
