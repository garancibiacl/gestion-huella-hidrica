export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_events: {
        Row: {
          country: string | null
          created_at: string
          device_type: string | null
          duration_ms: number | null
          event_type: string
          id: string
          metadata: Json | null
          page_path: string | null
          referrer: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          duration_ms?: number | null
          event_type: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          referrer?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          duration_ms?: number | null
          event_type?: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          referrer?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      human_water_consumption: {
        Row: {
          cantidad: number
          centro_trabajo: string
          created_at: string
          faena: string | null
          fecha: string | null
          formato: Database["public"]["Enums"]["water_format"]
          id: string
          organization_id: string
          period: string
          precio_unitario: number | null
          proveedor: string | null
          total_costo: number | null
          unidad: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cantidad?: number
          centro_trabajo: string
          created_at?: string
          faena?: string | null
          fecha?: string | null
          formato: Database["public"]["Enums"]["water_format"]
          id?: string
          organization_id: string
          period: string
          precio_unitario?: number | null
          proveedor?: string | null
          total_costo?: number | null
          unidad?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cantidad?: number
          centro_trabajo?: string
          created_at?: string
          faena?: string | null
          fecha?: string | null
          formato?: Database["public"]["Enums"]["water_format"]
          id?: string
          organization_id?: string
          period?: string
          precio_unitario?: number | null
          proveedor?: string | null
          total_costo?: number | null
          unidad?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "human_water_consumption_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_criteria: {
        Row: {
          created_at: string
          email_notificaciones: string | null
          frecuencia: string
          id: string
          informes_mensuales: boolean | null
          notificaciones_email: boolean | null
          objetivo_mensual: number | null
          reduccion_anual_pct: number | null
          umbral_alerta_pct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notificaciones?: string | null
          frecuencia?: string
          id?: string
          informes_mensuales?: boolean | null
          notificaciones_email?: boolean | null
          objetivo_mensual?: number | null
          reduccion_anual_pct?: number | null
          umbral_alerta_pct?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notificaciones?: string | null
          frecuencia?: string
          id?: string
          informes_mensuales?: boolean | null
          notificaciones_email?: boolean | null
          objetivo_mensual?: number | null
          reduccion_anual_pct?: number | null
          umbral_alerta_pct?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_criteria_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          organization_id: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sustainability_actions: {
        Row: {
          categoria: string | null
          created_at: string
          descripcion: string | null
          estado: Database["public"]["Enums"]["action_status"]
          fecha_implementacion: string | null
          id: string
          impacto_estimado: string | null
          indicador_asociado: string | null
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["action_status"]
          fecha_implementacion?: string | null
          id?: string
          impacto_estimado?: string | null
          indicador_asociado?: string | null
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["action_status"]
          fecha_implementacion?: string | null
          id?: string
          impacto_estimado?: string | null
          indicador_asociado?: string | null
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_runs: {
        Row: {
          created_at: string
          errors: Json | null
          finished_at: string | null
          id: string
          rows_inserted: number | null
          rows_updated: number | null
          source: string
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          errors?: Json | null
          finished_at?: string | null
          id?: string
          rows_inserted?: number | null
          rows_updated?: number | null
          source: string
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          errors?: Json | null
          finished_at?: string | null
          id?: string
          rows_inserted?: number | null
          rows_updated?: number | null
          source?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      water_readings: {
        Row: {
          consumo_m3: number
          costo: number | null
          created_at: string
          evidencia_url: string | null
          id: string
          observaciones: string | null
          organization_id: string
          period: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consumo_m3: number
          costo?: number | null
          created_at?: string
          evidencia_url?: string | null
          id?: string
          observaciones?: string | null
          organization_id: string
          period: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consumo_m3?: number
          costo?: number | null
          created_at?: string
          evidencia_url?: string | null
          id?: string
          observaciones?: string | null
          organization_id?: string
          period?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "water_readings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_analytics_overview: {
        Args: { days?: number }
        Returns: {
          avg_duration_ms: number
          avg_duration_ms_prev: number
          bounce_rate: number
          bounce_rate_prev: number
          daily_stats: Json
          page_views: number
          page_views_prev: number
          unique_visitors: number
          unique_visitors_prev: number
          views_per_visit: number
          views_per_visit_prev: number
        }[]
      }
      get_country_stats: {
        Args: { days?: number }
        Returns: {
          country: string
          percentage: number
          visits: number
        }[]
      }
      get_device_stats: {
        Args: { days?: number }
        Returns: {
          device_type: string
          percentage: number
          visits: number
        }[]
      }
      get_top_pages: {
        Args: { days?: number; limit_count?: number }
        Returns: {
          page_name: string
          page_path: string
          percentage: number
          views: number
        }[]
      }
      get_user_organization_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      action_status: "propuesta" | "evaluacion" | "implementada"
      app_role: "admin" | "prevencionista"
      water_format: "botella" | "bidon_20l"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      action_status: ["propuesta", "evaluacion", "implementada"],
      app_role: ["admin", "prevencionista"],
      water_format: ["botella", "bidon_20l"],
    },
  },
} as const
