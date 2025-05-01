
import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import OwnerConsultationJoin from "@/components/telemedizin/OwnerConsultationJoin";
import OwnerConsultationRoom from "@/components/telemedizin/OwnerConsultationRoom";
import OwnerLogin from "@/components/owner/OwnerLogin";
import OwnerDashboard from "@/components/owner/OwnerDashboard";

const OwnerApp = () => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if owner is authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if user is logged in and has the "owner" role in metadata
      if (session?.user?.user_metadata?.role === 'owner') {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      
      setLoading(false);
    };
    
    checkAuth();
    
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.user_metadata?.role === 'owner') {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Lädt...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/owner/dashboard" /> : <OwnerLogin />} />
      <Route path="/dashboard" element={isAuthenticated ? <OwnerDashboard /> : <Navigate to="/owner" />} />
      <Route path="/join" element={<OwnerConsultationJoin />} />
      <Route path="/room/:id" element={<OwnerConsultationRoom />} />
    </Routes>
  );
};

export default OwnerApp;
