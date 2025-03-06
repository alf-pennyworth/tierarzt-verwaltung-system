
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface UserInfo {
  isAdmin: boolean;
  praxisId: string | null;
  praxisName?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    const fetchUserInfo = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('praxis_id, email, praxis:praxis_id(name)')
          .eq('id', userId)
          .single();

        if (error) {
          console.error("Error fetching user profile:", error);
          return;
        }

        // Check if user is an admin
        const { data: roleData } = await supabase.auth.getUser();
        const isAdmin = roleData.user?.user_metadata?.is_admin === true;

        setUserInfo({
          isAdmin,
          praxisId: data?.praxis_id || null,
          praxisName: data?.praxis?.name || undefined
        });
      } catch (err) {
        console.error("Error in fetchUserInfo:", err);
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserInfo(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserInfo(session.user.id);
      } else {
        setUserInfo(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading, userInfo };
};
