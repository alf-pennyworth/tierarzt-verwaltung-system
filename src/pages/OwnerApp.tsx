
import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import OwnerConsultationJoin from "@/components/telemedizin/OwnerConsultationJoin";
import OwnerConsultationRoom from "@/components/telemedizin/OwnerConsultationRoom";
import OwnerLogin from "@/components/owner/OwnerLogin";
import OwnerDashboard from "@/components/owner/OwnerDashboard";

const OwnerApp = () => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Check if owner is authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if user is logged in and has the "owner" role in metadata
      if (session?.user?.user_metadata?.role === 'owner') {
        setIsAuthenticated(true);
      } else if (session?.user) {
        // If logged in but not an owner, redirect to main app
        window.location.href = '/';
        return;
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
    return <div className="flex justify-center items-center h-screen">Lädt...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/owner/dashboard" /> : <OwnerLogin />} />
      <Route path="/dashboard" element={isAuthenticated ? <OwnerDashboard /> : <Navigate to="/owner" />} />
      <Route path="/join" element={<OwnerConsultationJoin />} />
      <Route path="/room/:id" element={<OwnerConsultationRoom />} />
      {/* Catch-all route for invalid paths in the owner area */}
      <Route path="*" element={<Navigate to="/owner" />} />
    </Routes>
  );
};

export default OwnerApp;
