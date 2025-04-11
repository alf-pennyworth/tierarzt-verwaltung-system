
import { User } from "@supabase/supabase-js";

export interface VideoConsultation {
  id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  patient: {
    name: string;
    id: string;
    spezies: string;
  };
  doctor: {
    id: string;
    vorname: string;
    nachname: string;
  };
  room_id: string;
  description?: string;
  actual_start?: string;
  actual_end?: string;
  owner_invited?: boolean;
  owner_joined?: boolean;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  consultation_id?: string;
  sender?: {
    vorname: string;
    nachname: string;
  };
  recipient?: {
    vorname: string;
    nachname: string;
  };
}

export interface TelemedizinFile {
  id: string;
  consultation_id?: string;
  uploader_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  created_at: string;
}

export interface OwnerSession {
  besitzer_id: string;
  consultation_id: string;
  token: string;
  expires_at: string;
}
