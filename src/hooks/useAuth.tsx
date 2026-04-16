
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { toast } from "@/hooks/use-toast";

interface UserInfo {
  id: string | null; // Adding the id property to fix the TypeScript error
  isAdmin: boolean;
  praxisId: string | null;
  praxisName: string | undefined;
  fullName: string;
  email: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const navigate = useNavigate();
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);

  // Clear refresh timeout helper
  const clearRefreshTimeout = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  // Handle session expiry - redirect to login with toast
  const handleSessionExpired = useCallback(() => {
    console.log("Session expired, redirecting to login");
    toast({
      title: "Sitzung abgelaufen",
      description: "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.",
      variant: "destructive",
    });
    setUser(null);
    setUserInfo(null);
    navigate("/auth");
  }, [navigate]);

  // Refresh token before expiry
  const refreshToken = useCallback(async (session: Session) => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.error("Token refresh failed:", error);
        handleSessionExpired();
      } else {
        console.log("Token refreshed successfully");
      }
    } catch (err) {
      console.error("Token refresh error:", err);
      handleSessionExpired();
    } finally {
      isRefreshingRef.current = false;
    }
  }, [handleSessionExpired]);

  // Schedule token refresh before expiry
  const scheduleTokenRefresh = useCallback((session: Session) => {
    clearRefreshTimeout();

    if (!session.expires_at) return;

    const expiresAt = session.expires_at * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    
    // Refresh 5 minutes before expiry, or immediately if less than 5 minutes left
    const refreshBuffer = 5 * 60 * 1000; // 5 minutes in ms
    const refreshIn = Math.max(timeUntilExpiry - refreshBuffer, 0);

    if (refreshIn <= 0) {
      // Token already expired or about to expire - refresh now
      refreshToken(session);
      return;
    }

    console.log(`Scheduling token refresh in ${Math.round(refreshIn / 1000)} seconds`);
    refreshTimeoutRef.current = setTimeout(() => {
      refreshToken(session);
    }, refreshIn);
  }, [clearRefreshTimeout, refreshToken]);

  useEffect(() => {
    const fetchUserInfo = async (userId: string) => {
      try {
        console.log("Fetching user profile for ID:", userId);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('praxis_id, email, vorname, nachname, praxis:praxis_id(name)')
          .eq('id', userId)
          .single();

        if (error) {
          console.error("Error fetching user profile:", error);
          return;
        }

        console.log("User profile data:", data);

        // Check if user is an admin
        const { data: roleData } = await supabase.auth.getUser();
        const isAdmin = roleData.user?.user_metadata?.is_admin === true;
        const fullName = `${data?.vorname || ''} ${data?.nachname || ''}`.trim();

        console.log("User metadata:", roleData.user?.user_metadata);
        console.log("Is admin:", isAdmin);
        
        // Use praxis_id from profile if available, otherwise from metadata
        const praxisId = data?.praxis_id || roleData.user?.user_metadata?.praxis_id || null;
        console.log("Praxis ID:", praxisId);
        
        console.log("Praxis name:", data?.praxis?.name);

        setUserInfo({
          id: userId, // Set the ID to the userId parameter
          isAdmin,
          praxisId,
          praxisName: data?.praxis?.name || undefined,
          fullName,
          email: data?.email || roleData.user?.email || ''
        });
      } catch (err) {
        console.error("Error in fetchUserInfo:", err);
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session check:", session?.user?.id);
      setUser(session?.user ?? null);
      if (session?.user && session) {
        fetchUserInfo(session.user.id);
        scheduleTokenRefresh(session);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session?.user?.id);
      setUser(session?.user ?? null);
      
      if (session?.user && session) {
        fetchUserInfo(session.user.id);
        scheduleTokenRefresh(session);
      } else {
        setUserInfo(null);
        clearRefreshTimeout();
        
        // Handle explicit sign out or token refresh failure
        if (event === 'SIGNED_OUT') {
          console.log("User signed out");
        } else if (event === 'TOKEN_REFRESHED') {
          console.log("Token refreshed event received");
        }
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      clearRefreshTimeout();
    };
  }, [scheduleTokenRefresh, clearRefreshTimeout]);

  return { user, loading, userInfo };
};
