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
      behandlungen: {
        Row: {
          created_at: string
          deleted_at: string | null
          diagnose_id: string
          id: string
          medikament_id: string | null
          medikament_menge: number | null
          medikament_typ: string | null
          patient_id: string
          praxis_id: string
          untersuchung_datum: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          diagnose_id: string
          id?: string
          medikament_id?: string | null
          medikament_menge?: number | null
          medikament_typ?: string | null
          patient_id: string
          praxis_id: string
          untersuchung_datum: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          diagnose_id?: string
          id?: string
          medikament_id?: string | null
          medikament_menge?: number | null
          medikament_typ?: string | null
          patient_id?: string
          praxis_id?: string
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
          betriebsnummer: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          name: string
          postleitzahl: string | null
          praxis_id: string
          stadt: string | null
          strasse: string | null
          telefonnummer: string | null
          updated_at: string
        }
        Insert: {
          betriebsnummer?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name: string
          postleitzahl?: string | null
          praxis_id: string
          stadt?: string | null
          strasse?: string | null
          telefonnummer?: string | null
          updated_at?: string
        }
        Update: {
          betriebsnummer?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string
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
      medikamente: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          masseinheit: string
          name: string
          packungs_id: string | null
          updated_at: string
          zulassungsnummer: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          masseinheit: string
          name: string
          packungs_id?: string | null
          updated_at?: string
          zulassungsnummer?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          masseinheit?: string
          name?: string
          packungs_id?: string | null
          updated_at?: string
          zulassungsnummer?: string | null
        }
        Relationships: []
      }
      patient: {
        Row: {
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
          updated_at: string
        }
        Insert: {
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
          updated_at?: string
        }
        Update: {
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
          updated_at?: string
        }
        Relationships: [
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
      veterinaere: {
        Row: {
          auth_id: string | null
          created_at: string
          deleted_at: string | null
          email: string
          id: string
          nachname: string
          praxis_id: string
          rolle_id: string
          telefonnummer: string | null
          updated_at: string
          username: string
          vorname: string
        }
        Insert: {
          auth_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          id?: string
          nachname: string
          praxis_id: string
          rolle_id: string
          telefonnummer?: string | null
          updated_at?: string
          username: string
          vorname: string
        }
        Update: {
          auth_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          id?: string
          nachname?: string
          praxis_id?: string
          rolle_id?: string
          telefonnummer?: string | null
          updated_at?: string
          username?: string
          vorname?: string
        }
        Relationships: [
          {
            foreignKeyName: "veterinaere_praxis_id_fkey"
            columns: ["praxis_id"]
            isOneToOne: false
            referencedRelation: "praxis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veterinaere_rolle_id_fkey"
            columns: ["rolle_id"]
            isOneToOne: false
            referencedRelation: "rollen"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: "admin" | "vet"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
