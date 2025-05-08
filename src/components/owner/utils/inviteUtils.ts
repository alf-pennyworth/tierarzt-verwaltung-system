
import { supabase } from "@/integrations/supabase/client";

// Define the invitation response type
export interface OwnerInviteResponse {
  success: boolean;
  token: string;
  owner_id: string;
  owner_email: string;
  owner_name: string;
}

// Function to generate an invitation link
export const generateInvitationLink = (token: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/auth?token=${token}&type=owner-invitation`;
};

// Function to create owner invitation
export const createOwnerInvitation = async (ownerId: string): Promise<OwnerInviteResponse | null> => {
  try {
    // Call the RPC function to generate an invitation
    const { data, error } = await supabase.rpc('invite_owner', {
      besitzer_id: ownerId,
      clinic_user_id: null
    });

    if (error) throw error;

    // First cast to unknown, then to the expected type to avoid TypeScript error
    if (data && typeof data === 'object') {
      return data as unknown as OwnerInviteResponse;
    } else {
      throw new Error("Invalid response format");
    }
  } catch (error) {
    console.error("Error creating owner invitation:", error);
    return null;
  }
};

// Function to copy text to clipboard
export const copyToClipboard = (text: string): boolean => {
  try {
    navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
};
