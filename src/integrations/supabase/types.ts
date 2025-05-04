export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          end_time: string
          id: string
          patient_id: string
          praxis_id: string
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          end_time: string
          id?: string
          patient_id: string
          praxis_id: string
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          end_time?: string
          id?: string
          patient_id?: string
          praxis_id?: string
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_appointment_patient"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient"
            referencedColumns: ["id"]
          },
        ]
      }
      behandlungen: {
        Row: {
          created_at: string
          deleted_at: string | null
          diagnose_fallback: string | null
          diagnose_id: string | null
          diagnose_path: string[] | null
          diagnose_path_ids: string[] | null
          id: string
          medikament_id: string | null
          medikament_menge: number | null
          medikament_menge_formatted: string | null
          medikament_typ: string | null
          patient_id: string
          praxis_id: string
          SOAP: string | null
          untersuchung_datum: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          diagnose_fallback?: string | null
          diagnose_id?: string | null
          diagnose_path?: string[] | null
          diagnose_path_ids?: string[] | null
          id?: string
          medikament_id?: string | null
          medikament_menge?: number | null
          medikament_menge_formatted?: string | null
          medikament_typ?: string | null
          patient_id: string
          praxis_id: string
          SOAP?: string | null
          untersuchung_datum: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          diagnose_fallback?: string | null
          diagnose_id?: string | null
          diagnose_path?: string[] | null
          diagnose_path_ids?: string[] | null
          id?: string
          medikament_id?: string | null
          medikament_menge?: number | null
          medikament_menge_formatted?: string | null
          medikament_typ?: string | null
          patient_id?: string
          praxis_id?: string
          SOAP?: string | null
          untersuchung_datum?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "behandlungen_diagnose_id_fkey"
            columns: ["diagnose_id"]
            isOneToOne: false
            referencedRelation: "diagnose"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behandlungen_medikament_id_fkey"
            columns: ["medikament_id"]
            isOneToOne: false
            referencedRelation: "medikamente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behandlungen_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behandlungen_praxis_id_fkey"
            columns: ["praxis_id"]
            isOneToOne: false
            referencedRelation: "praxis"
            referencedColumns: ["id"]
          },
        ]
      }
      besitzer: {
        Row: {
          auth_id: string | null
          betriebsnummer: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          invitation_accepted_at: string | null
          invitation_sent_at: string | null
          invitation_token: string | null
          name: string
          password_hash: string | null
          postleitzahl: string | null
          praxis_id: string
          stadt: string | null
          strasse: string | null
          telefonnummer: string | null
          updated_at: string
        }
        Insert: {
          auth_id?: string | null
          betriebsnummer?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          invitation_accepted_at?: string | null
          invitation_sent_at?: string | null
          invitation_token?: string | null
          name: string
          password_hash?: string | null
          postleitzahl?: string | null
          praxis_id: string
          stadt?: string | null
          strasse?: string | null
          telefonnummer?: string | null
          updated_at?: string
        }
        Update: {
          auth_id?: string | null
          betriebsnummer?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          invitation_accepted_at?: string | null
          invitation_sent_at?: string | null
          invitation_token?: string | null
          name?: string
          password_hash?: string | null
          postleitzahl?: string | null
          praxis_id?: string
          stadt?: string | null
          strasse?: string | null
          telefonnummer?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "besitzer_praxis_id_fkey"
            columns: ["praxis_id"]
            isOneToOne: false
            referencedRelation: "praxis"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnose: {
        Row: {
          created_at: string
          deleted_at: string | null
          diagnose: string
          id: string
          nummer: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          diagnose: string
          id?: string
          nummer: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          diagnose?: string
          id?: string
          nummer?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnose_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "diagnose"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string | null
          created_at: string
          current_stock: number
          deleted_at: string | null
          description: string | null
          expiry_date: string | null
          id: string
          last_ordered: string | null
          location: string | null
          minimum_stock: number
          name: string
          praxis_id: string
          sku: string | null
          supplier: string | null
          unit: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          current_stock?: number
          deleted_at?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          last_ordered?: string | null
          location?: string | null
          minimum_stock?: number
          name: string
          praxis_id: string
          sku?: string | null
          supplier?: string | null
          unit: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          current_stock?: number
          deleted_at?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          last_ordered?: string | null
          location?: string | null
          minimum_stock?: number
          name?: string
          praxis_id?: string
          sku?: string | null
          supplier?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory_order_items: {
        Row: {
          id: string
          item_id: string
          notes: string | null
          order_id: string
          quantity: number
          received_quantity: number | null
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          item_id: string
          notes?: string | null
          order_id: string
          quantity: number
          received_quantity?: number | null
          total_price: number
          unit_price: number
        }
        Update: {
          id?: string
          item_id?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          received_quantity?: number | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "medikamente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "inventory_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_orders: {
        Row: {
          actual_delivery_date: string | null
          created_at: string
          created_by: string
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string | null
          praxis_id: string
          status: string
          supplier_id: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          actual_delivery_date?: string | null
          created_at?: string
          created_by: string
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string | null
          praxis_id: string
          status?: string
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          actual_delivery_date?: string | null
          created_at?: string
          created_by?: string
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string | null
          praxis_id?: string
          status?: string
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string
          created_by: string
          id: string
          item_id: string
          new_stock: number
          notes: string | null
          praxis_id: string
          previous_stock: number
          quantity: number
          transaction_date: string
          transaction_type: string
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          item_id: string
          new_stock: number
          notes?: string | null
          praxis_id: string
          previous_stock: number
          quantity: number
          transaction_date?: string
          transaction_type: string
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          item_id?: string
          new_stock?: number
          notes?: string | null
          praxis_id?: string
          previous_stock?: number
          quantity?: number
          transaction_date?: string
          transaction_type?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "medikamente"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          is_used: boolean | null
          praxis_id: string
          praxis_name: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          is_used?: boolean | null
          praxis_id: string
          praxis_name: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          is_used?: boolean | null
          praxis_id?: string
          praxis_name?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_praxis_id_fkey"
            columns: ["praxis_id"]
            isOneToOne: false
            referencedRelation: "praxis"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_types: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      medikamente: {
        Row: {
          category: string | null
          created_at: string
          current_stock: number
          deleted_at: string | null
          description: string | null
          eingangs_nr: string | null
          expiry_date: string | null
          id: string
          last_ordered: string | null
          location: string | null
          masseinheit: string
          medication_type_id: string | null
          minimum_stock: number
          name: string
          packungs_id: string | null
          packungsbeschreibung: string | null
          praxis_id: string | null
          sku: string | null
          unit_price: number | null
          updated_at: string
          zulassungsnummer: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          current_stock?: number
          deleted_at?: string | null
          description?: string | null
          eingangs_nr?: string | null
          expiry_date?: string | null
          id?: string
          last_ordered?: string | null
          location?: string | null
          masseinheit: string
          medication_type_id?: string | null
          minimum_stock?: number
          name: string
          packungs_id?: string | null
          packungsbeschreibung?: string | null
          praxis_id?: string | null
          sku?: string | null
          unit_price?: number | null
          updated_at?: string
          zulassungsnummer?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          current_stock?: number
          deleted_at?: string | null
          description?: string | null
          eingangs_nr?: string | null
          expiry_date?: string | null
          id?: string
          last_ordered?: string | null
          location?: string | null
          masseinheit?: string
          medication_type_id?: string | null
          minimum_stock?: number
          name?: string
          packungs_id?: string | null
          packungsbeschreibung?: string | null
          praxis_id?: string | null
          sku?: string | null
          unit_price?: number | null
          updated_at?: string
          zulassungsnummer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medikamente_medication_type_id_fkey"
            columns: ["medication_type_id"]
            isOneToOne: false
            referencedRelation: "medication_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medikamente_praxis_id_fkey"
            columns: ["praxis_id"]
            isOneToOne: false
            referencedRelation: "praxis"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_sessions: {
        Row: {
          accessed_at: string | null
          besitzer_id: string
          consultation_id: string | null
          created_at: string
          expires_at: string
          id: string
          token: string
        }
        Insert: {
          accessed_at?: string | null
          besitzer_id: string
          consultation_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          token: string
        }
        Update: {
          accessed_at?: string | null
          besitzer_id?: string
          consultation_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_sessions_besitzer_id_fkey"
            columns: ["besitzer_id"]
            isOneToOne: false
            referencedRelation: "besitzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_sessions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "video_consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      patient: {
        Row: {
          behandelnder_arzt: string | null
          besitzer_id: string
          bild_url: string | null
          created_at: string
          deleted_at: string | null
          geburtsdatum: string | null
          id: string
          name: string
          praxis_id: string
          rasse: string | null
          spezies: string
          tamb_form: Database["public"]["Enums"]["tamb_form"] | null
          updated_at: string
        }
        Insert: {
          behandelnder_arzt?: string | null
          besitzer_id: string
          bild_url?: string | null
          created_at?: string
          deleted_at?: string | null
          geburtsdatum?: string | null
          id?: string
          name: string
          praxis_id: string
          rasse?: string | null
          spezies: string
          tamb_form?: Database["public"]["Enums"]["tamb_form"] | null
          updated_at?: string
        }
        Update: {
          behandelnder_arzt?: string | null
          besitzer_id?: string
          bild_url?: string | null
          created_at?: string
          deleted_at?: string | null
          geburtsdatum?: string | null
          id?: string
          name?: string
          praxis_id?: string
          rasse?: string | null
          spezies?: string
          tamb_form?: Database["public"]["Enums"]["tamb_form"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_behandelnder_arzt_fkey"
            columns: ["behandelnder_arzt"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_besitzer_id_fkey"
            columns: ["besitzer_id"]
            isOneToOne: false
            referencedRelation: "besitzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_praxis_id_fkey"
            columns: ["praxis_id"]
            isOneToOne: false
            referencedRelation: "praxis"
            referencedColumns: ["id"]
          },
        ]
      }
      praxis: {
        Row: {
          betriebsnummer: string | null
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          betriebsnummer?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          betriebsnummer?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string
          Fachrichtung: string | null
          Gebäude: string | null
          id: string
          nachname: string
          praxis_id: string | null
          profilbild_url: string | null
          Raum: string | null
          rolle_id: string | null
          telefonnummer: string | null
          updated_at: string
          vorname: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email: string
          Fachrichtung?: string | null
          Gebäude?: string | null
          id: string
          nachname: string
          praxis_id?: string | null
          profilbild_url?: string | null
          Raum?: string | null
          rolle_id?: string | null
          telefonnummer?: string | null
          updated_at?: string
          vorname: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string
          Fachrichtung?: string | null
          Gebäude?: string | null
          id?: string
          nachname?: string
          praxis_id?: string | null
          profilbild_url?: string | null
          Raum?: string | null
          rolle_id?: string | null
          telefonnummer?: string | null
          updated_at?: string
          vorname?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_praxis_id_fkey"
            columns: ["praxis_id"]
            isOneToOne: false
            referencedRelation: "praxis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_rolle_id_fkey"
            columns: ["rolle_id"]
            isOneToOne: false
            referencedRelation: "rollen"
            referencedColumns: ["id"]
          },
        ]
      }
      rollen: {
        Row: {
          created_at: string
          id: string
          name: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          praxis_id: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          praxis_id: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          praxis_id?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      telemedizin_files: {
        Row: {
          consultation_id: string | null
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          storage_path: string
          uploader_id: string
        }
        Insert: {
          consultation_id?: string | null
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          storage_path: string
          uploader_id: string
        }
        Update: {
          consultation_id?: string | null
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          storage_path?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telemedizin_files_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "video_consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      telemedizin_messages: {
        Row: {
          consultation_id: string | null
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          recipient_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          consultation_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          recipient_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          consultation_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          recipient_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telemedizin_messages_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "video_consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      video_consultations: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          created_at: string
          description: string | null
          doctor_id: string
          id: string
          owner_invited: boolean | null
          owner_joined: boolean | null
          patient_id: string
          praxis_id: string
          room_id: string
          scheduled_end: string
          scheduled_start: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          description?: string | null
          doctor_id: string
          id?: string
          owner_invited?: boolean | null
          owner_joined?: boolean | null
          patient_id: string
          praxis_id: string
          room_id: string
          scheduled_end: string
          scheduled_start: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          description?: string | null
          doctor_id?: string
          id?: string
          owner_invited?: boolean | null
          owner_joined?: boolean | null
          patient_id?: string
          praxis_id?: string
          room_id?: string
          scheduled_end?: string
          scheduled_start?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_consultations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      diagnose_hierarchy: {
        Row: {
          diagnose: string | null
          id: string | null
          level: number | null
          nummer: string | null
          parent_id: string | null
          path: string[] | null
          path_ids: string[] | null
        }
        Relationships: []
      }
    }
    Functions: {
      complete_owner_registration: {
        Args: { token_param: string; auth_id_param: string }
        Returns: boolean
      }
      create_invite: {
        Args: { praxis_id_param: string; email_param: string }
        Returns: Json
      }
      create_owner_session: {
        Args: { besitzer_id_param: string; consultation_id_param: string }
        Returns: string
      }
      format_number_de: {
        Args: { n: number }
        Returns: string
      }
      get_user_praxis_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      invite_owner: {
        Args: { besitzer_id: string; clinic_user_id: string }
        Returns: Json
      }
      mark_invite_used: {
        Args: { token_param: string }
        Returns: undefined
      }
      validate_owner_session: {
        Args: { token_param: string }
        Returns: {
          besitzer_id: string
          consultation_id: string
        }[]
      }
      verify_invite: {
        Args: { token_param: string }
        Returns: Json
      }
      verify_owner_invitation: {
        Args: { token_param: string }
        Returns: Json
      }
    }
    Enums: {
      tamb_form:
        | "SON"
        | "RM4"
        | "RM5"
        | "RN3"
        | "RN6"
        | "RN7"
        | "SM0"
        | "SM1"
        | "SM2"
        | "SM4"
        | "SN3"
        | "HM1"
        | "HM3"
        | "HM4"
        | "HN2"
        | "PM1"
        | "PN2"
        | "X01"
        | "X02"
        | "X03"
        | "X04"
      user_role: "admin" | "vet"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      tamb_form: [
        "SON",
        "RM4",
        "RM5",
        "RN3",
        "RN6",
        "RN7",
        "SM0",
        "SM1",
        "SM2",
        "SM4",
        "SN3",
        "HM1",
        "HM3",
        "HM4",
        "HN2",
        "PM1",
        "PN2",
        "X01",
        "X02",
        "X03",
        "X04",
      ],
      user_role: ["admin", "vet"],
    },
  },
} as const
