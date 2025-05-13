
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if user has owner role
        if (user.user_metadata.role === 'owner') {
          navigate('/owner/dashboard');
        } else {
          // For other roles, we might have different dashboards in the future
          navigate('/');
        }
      } else {
        navigate('/auth');
      }
    };
    
    checkAuth();
  }, [navigate]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Weiterleitung...</h1>
      <p>Bitte warten, Sie werden weitergeleitet.</p>
    </div>
  );
};

export default Dashboard;
