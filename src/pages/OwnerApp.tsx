
import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import OwnerConsultationJoin from "@/components/telemedizin/OwnerConsultationJoin";
import OwnerConsultationRoom from "@/components/telemedizin/OwnerConsultationRoom";
import OwnerLogin from "@/components/owner/OwnerLogin";
import OwnerDashboard from "@/components/owner/OwnerDashboard";
import { toast } from "@/components/ui/use-toast";

const OwnerApp = () => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ownerData, setOwnerData] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Check if owner is authenticated
    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          setLoading(false);
          setIsAuthenticated(false);
          return;
        }
        
        // Check if user is logged in and has the "owner" role in metadata
        if (session?.user?.user_metadata?.role === 'owner') {
          console.log("Owner authenticated:", session.user.id);
          console.log("Owner metadata:", session.user.user_metadata);
          
          setIsAuthenticated(true);
          
          // Get owner details from besitzer table
          const { data: besitzerData, error: besitzerError } = await supabase
            .from('besitzer')
            .select('id, name, email')
            .eq('auth_id', session.user.id)
            .single();
          
          if (besitzerError) {
            console.error("Error fetching owner data:", besitzerError);
          } else if (besitzerData) {
            console.log("Owner DB record:", besitzerData);
            setOwnerData(besitzerData);
          } else {
            console.log("No owner record found in besitzer table");
            toast({
              title: "Hinweis",
              description: "Ihr Besitzerprofil wurde nicht gefunden. Bitte kontaktieren Sie Ihre Tierarztpraxis.",
            });
          }
        } else if (session?.user) {
          console.log("User is logged in but not an owner");
          // If logged in but not an owner, redirect to main app
          window.location.href = '/';
          return;
        } else {
          console.log("No authenticated session");
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Unexpected error in checkAuth:", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
    
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event);
      
      if (session?.user?.user_metadata?.role === 'owner') {
        setIsAuthenticated(true);
      } else if (session?.user) {
        // If logged in but not an owner, redirect to main app
        window.location.href = '/';
      } else {
        setIsAuthenticated(false);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Check for invitation token in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('token')) {
      // If we have a token in URL, make sure we stay on the login page
      if (location.pathname !== '/owner') {
        navigate(`/owner?${params.toString()}`);
      }
    }
  }, [location, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span>Lädt...</span>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/owner/dashboard" /> : <OwnerLogin />} />
      <Route 
        path="/dashboard" 
        element={
          isAuthenticated ? (
            <OwnerDashboard ownerData={ownerData} />
          ) : (
            <Navigate to="/owner" />
          )
        } 
      />
      <Route path="/join" element={<OwnerConsultationJoin />} />
      <Route path="/room/:id" element={<OwnerConsultationRoom />} />
      {/* Catch-all route for invalid paths in the owner area */}
      <Route path="*" element={<Navigate to="/owner" />} />
    </Routes>
  );
};

export default OwnerApp;
