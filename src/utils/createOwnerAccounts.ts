
import { supabase } from "@/integrations/supabase/client";

/**
 * Creates authentication accounts for owners who don't have one
 * and links them with their existing besitzer records
 */
export const createOwnerAccounts = async (defaultPassword = "password123") => {
  try {
    // 1. Get all besitzer without auth_id who have email
    const { data: besitzerList, error: besitzerError } = await supabase
      .from('besitzer')
      .select('id, name, email')
      .is('auth_id', null)
      .not('email', 'is', null);

    if (besitzerError) throw besitzerError;
    console.log(`Found ${besitzerList?.length} owners without auth accounts`);
    
    if (!besitzerList || besitzerList.length === 0) {
      console.log("No owners need authentication accounts");
      return { success: true, message: "No owners need authentication accounts" };
    }
    
    // Process each owner
    for (const besitzer of besitzerList) {
      if (!besitzer.email) continue;
      
      try {
        console.log(`Creating auth account for ${besitzer.email}`);
        
        // 2. Create auth user with owner role
        const { data: authData, error: signupError } = await supabase.auth.signUp({
          email: besitzer.email,
          password: defaultPassword,
          options: {
            data: {
              name: besitzer.name,
              role: 'owner'
            },
            emailRedirectTo: window.location.origin + '/owner/dashboard'
          }
        });

        if (signupError) {
          console.error(`Error creating auth account for ${besitzer.email}:`, signupError);
          continue;
        }

        // 3. Link the new auth account to the besitzer record
        if (authData?.user) {
          console.log(`Auth account created for ${besitzer.email}, user ID: ${authData.user.id}`);
          
          const { error: updateError } = await supabase
            .from('besitzer')
            .update({ auth_id: authData.user.id })
            .eq('id', besitzer.id);
            
          if (updateError) {
            console.error(`Error linking auth account to besitzer ${besitzer.id}:`, updateError);
          } else {
            console.log(`Successfully linked auth account to besitzer ${besitzer.id}`);
          }
        }
      } catch (ownerError) {
        console.error(`Error processing owner ${besitzer.email}:`, ownerError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error in createOwnerAccounts:", error);
    return { success: false, error };
  }
};
