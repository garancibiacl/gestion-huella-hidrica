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
      electric_meter_readings: {
        Row: {
          centro_trabajo: string
          consumo_kwh: number
          costo_total: number | null
          created_at: string
          id: string
          medidor: string
          organization_id: string
          period: string
          proveedor: string | null
          tipo_uso: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          centro_trabajo: string
          consumo_kwh?: number
          costo_total?: number | null
          created_at?: string
          id?: string
          medidor: string
          organization_id: string
          period: string
          proveedor?: string | null
          tipo_uso?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          centro_trabajo?: string
          consumo_kwh?: number
          costo_total?: number | null
          created_at?: string
          id?: string
          medidor?: string
          organization_id?: string
          period?: string
          proveedor?: string | null
          tipo_uso?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "electric_meter_readings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      pam_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          organization_id: string
          read_at: string | null
          task_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          organization_id: string
          read_at?: string | null
          task_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          organization_id?: string
          read_at?: string | null
          task_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pam_notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "pam_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      pam_task_evidences: {
        Row: {
          file_url: string
          id: string
          notes: string | null
          task_id: string
          uploaded_at: string
          uploaded_by_user_id: string
        }
        Insert: {
          file_url: string
          id?: string
          notes?: string | null
          task_id: string
          uploaded_at?: string
          uploaded_by_user_id: string
        }
        Update: {
          file_url?: string
          id?: string
          notes?: string | null
          task_id?: string
          uploaded_at?: string
          uploaded_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pam_task_evidences_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "pam_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      pam_tasks: {
        Row: {
          assignee_name: string | null
          assignee_user_id: string
          created_at: string
          date: string
          description: string
          has_evidence: boolean
          id: string
          location: string | null
          organization_id: string
          risk_type: string | null
          status: Database["public"]["Enums"]["pam_task_status"]
          updated_at: string
          week_number: number
          week_plan_id: string
          week_year: number
        }
        Insert: {
          assignee_name?: string | null
          assignee_user_id: string
          created_at?: string
          date: string
          description: string
          has_evidence?: boolean
          id?: string
          location?: string | null
          organization_id: string
          risk_type?: string | null
          status?: Database["public"]["Enums"]["pam_task_status"]
          updated_at?: string
          week_number: number
          week_plan_id: string
          week_year: number
        }
        Update: {
          assignee_name?: string | null
          assignee_user_id?: string
          created_at?: string
          date?: string
          description?: string
          has_evidence?: boolean
          id?: string
          location?: string | null
          organization_id?: string
          risk_type?: string | null
          status?: Database["public"]["Enums"]["pam_task_status"]
          updated_at?: string
          week_number?: number
          week_plan_id?: string
          week_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "pam_tasks_week_plan_id_fkey"
            columns: ["week_plan_id"]
            isOneToOne: false
            referencedRelation: "pam_weeks_plan"
            referencedColumns: ["id"]
          },
        ]
      }
      pam_weeks_plan: {
        Row: {
          id: string
          organization_id: string
          source_filename: string | null
          uploaded_at: string
          uploaded_by: string
          week_number: number
          week_year: number
        }
        Insert: {
          id?: string
          organization_id: string
          source_filename?: string | null
          uploaded_at?: string
          uploaded_by: string
          week_number: number
          week_year: number
        }
        Update: {
          id?: string
          organization_id?: string
          source_filename?: string | null
          uploaded_at?: string
          uploaded_by?: string
          week_number?: number
          week_year?: number
        }
        Relationships: []
      }
      petroleum_consumption: {
        Row: {
          center: string | null
          company: string | null
          created_at: string | null
          date_emission: string | null
          date_payment: string | null
          id: string
          is_mining_use: boolean | null
          liters: number | null
          mining_use_raw: string | null
          organization_id: string
          period: string
          period_label: string | null
          supplier: string | null
          total_cost: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          center?: string | null
          company?: string | null
          created_at?: string | null
          date_emission?: string | null
          date_payment?: string | null
          id?: string
          is_mining_use?: boolean | null
          liters?: number | null
          mining_use_raw?: string | null
          organization_id: string
          period: string
          period_label?: string | null
          supplier?: string | null
          total_cost?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          center?: string | null
          company?: string | null
          created_at?: string | null
          date_emission?: string | null
          date_payment?: string | null
          id?: string
          is_mining_use?: boolean | null
          liters?: number | null
          mining_use_raw?: string | null
          organization_id?: string
          period?: string
          period_label?: string | null
          supplier?: string | null
          total_cost?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "petroleum_consumption_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      risk_alerts: {
        Row: {
          actions: Json
          baseline_value: number | null
          center: string
          change_detected: boolean
          confidence: number | null
          created_at: string
          data_points: number | null
          delta_pct: number | null
          forecast_cost: number
          forecast_value: number
          id: string
          latest_value: number
          level: string
          metric: string
          mix_avg_pct: number | null
          mix_current_pct: number | null
          mix_shift_pct: number | null
          organization_id: string
          outlier: boolean
          period: string
          prev_value: number | null
          range_cost_max: number
          range_cost_min: number
          range_max: number
          range_min: number
          reasons: Json
          score: number
          seasonality_factor: number | null
          status: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          baseline_value?: number | null
          center: string
          change_detected?: boolean
          confidence?: number | null
          created_at?: string
          data_points?: number | null
          delta_pct?: number | null
          forecast_cost?: number
          forecast_value?: number
          id?: string
          latest_value?: number
          level?: string
          metric: string
          mix_avg_pct?: number | null
          mix_current_pct?: number | null
          mix_shift_pct?: number | null
          organization_id: string
          outlier?: boolean
          period: string
          prev_value?: number | null
          range_cost_max?: number
          range_cost_min?: number
          range_max?: number
          range_min?: number
          reasons?: Json
          score?: number
          seasonality_factor?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          baseline_value?: number | null
          center?: string
          change_detected?: boolean
          confidence?: number | null
          created_at?: string
          data_points?: number | null
          delta_pct?: number | null
          forecast_cost?: number
          forecast_value?: number
          id?: string
          latest_value?: number
          level?: string
          metric?: string
          mix_avg_pct?: number | null
          mix_current_pct?: number | null
          mix_shift_pct?: number | null
          organization_id?: string
          outlier?: boolean
          period?: string
          prev_value?: number | null
          range_cost_max?: number
          range_cost_min?: number
          range_max?: number
          range_min?: number
          reasons?: Json
          score?: number
          seasonality_factor?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_runs: {
        Row: {
          alerts_created: number | null
          alerts_skipped: number | null
          alerts_updated: number | null
          created_at: string
          errors: Json | null
          finished_at: string | null
          id: string
          organization_id: string
          started_at: string
        }
        Insert: {
          alerts_created?: number | null
          alerts_skipped?: number | null
          alerts_updated?: number | null
          created_at?: string
          errors?: Json | null
          finished_at?: string | null
          id?: string
          organization_id: string
          started_at?: string
        }
        Update: {
          alerts_created?: number | null
          alerts_skipped?: number | null
          alerts_updated?: number | null
          created_at?: string
          errors?: Json | null
          finished_at?: string | null
          id?: string
          organization_id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_runs_organization_id_fkey"
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
      water_alert_tasks: {
        Row: {
          alert_id: string
          assignee_id: string | null
          created_at: string
          due_date: string | null
          evidence_url: string | null
          id: string
          notes: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          alert_id: string
          assignee_id?: string | null
          created_at?: string
          due_date?: string | null
          evidence_url?: string | null
          id?: string
          notes?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          alert_id?: string
          assignee_id?: string | null
          created_at?: string
          due_date?: string | null
          evidence_url?: string | null
          id?: string
          notes?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "water_alert_tasks_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "water_meter_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      water_meter_alerts: {
        Row: {
          baseline_m3: number
          centro_trabajo: string
          confidence: number
          created_at: string
          current_m3: number
          data_points: number
          delta_pct: number
          id: string
          medidor: string
          organization_id: string
          period: string
          status: string
        }
        Insert: {
          baseline_m3: number
          centro_trabajo: string
          confidence: number
          created_at?: string
          current_m3: number
          data_points: number
          delta_pct: number
          id?: string
          medidor: string
          organization_id: string
          period: string
          status?: string
        }
        Update: {
          baseline_m3?: number
          centro_trabajo?: string
          confidence?: number
          created_at?: string
          current_m3?: number
          data_points?: number
          delta_pct?: number
          id?: string
          medidor?: string
          organization_id?: string
          period?: string
          status?: string
        }
        Relationships: []
      }
      water_meter_readings: {
        Row: {
          centro_trabajo: string
          consumo_m3: number
          costo_total: number | null
          created_at: string | null
          direccion: string | null
          id: string
          lectura_m3: number | null
          medidor: string
          observaciones: string | null
          organization_id: string
          period: string
          sobre_consumo_m3: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          centro_trabajo: string
          consumo_m3?: number
          costo_total?: number | null
          created_at?: string | null
          direccion?: string | null
          id?: string
          lectura_m3?: number | null
          medidor: string
          observaciones?: string | null
          organization_id: string
          period: string
          sobre_consumo_m3?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          centro_trabajo?: string
          consumo_m3?: number
          costo_total?: number | null
          created_at?: string | null
          direccion?: string | null
          id?: string
          lectura_m3?: number | null
          medidor?: string
          observaciones?: string | null
          organization_id?: string
          period?: string
          sobre_consumo_m3?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "water_meter_readings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      is_pam_admin: { Args: never; Returns: boolean }
      is_pam_worker: { Args: never; Returns: boolean }
      mark_all_pam_notifications_read: { Args: never; Returns: undefined }
      mark_pam_notification_read: {
        Args: { notification_id: string }
        Returns: undefined
      }
    }
    Enums: {
      action_status: "propuesta" | "evaluacion" | "implementada"
      app_role: "admin" | "prevencionista" | "worker"
      pam_task_status: "PENDING" | "IN_PROGRESS" | "DONE" | "OVERDUE"
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
      app_role: ["admin", "prevencionista", "worker"],
      pam_task_status: ["PENDING", "IN_PROGRESS", "DONE", "OVERDUE"],
      water_format: ["botella", "bidon_20l"],
    },
  },
} as const
