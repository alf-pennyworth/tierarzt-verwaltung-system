
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error("Auth error:", error);
          navigate('/auth');
          return;
        }
        
        if (user) {
          console.log("User authenticated:", user.id);
          console.log("User metadata:", user.user_metadata);
          
          // Check if user has owner role
          if (user.user_metadata.role === 'owner') {
            console.log("Redirecting to owner dashboard");
            navigate('/owner/dashboard');
          } else {
            // For other roles, we might have different dashboards in the future
            console.log("Redirecting to main page (non-owner)");
            navigate('/');
          }
        } else {
          console.log("No user found, redirecting to auth");
          navigate('/auth');
        }
      } catch (error) {
        console.error("Unexpected error in checkAuth:", error);
        navigate('/auth');
      }
    };
    
    checkAuth();
  }, [navigate]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Weiterleitung...</h1>
      <div className="flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <p>Bitte warten, Sie werden weitergeleitet.</p>
      </div>
    </div>
  );
};

export default Dashboard;
