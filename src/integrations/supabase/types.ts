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
      challenge_applications: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          pitch: string | null
          status: string | null
          team_id: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          pitch?: string | null
          status?: string | null
          team_id?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          pitch?: string | null
          status?: string | null
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_applications_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "sponsor_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_applications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          invite_code: string | null
          name: string
          university_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string | null
          name: string
          university_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string | null
          name?: string
          university_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clubs_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          idea_id: string | null
          project_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          idea_id?: string | null
          project_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          idea_id?: string | null
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_tags: {
        Row: {
          id: string
          idea_id: string
          tag: string
        }
        Insert: {
          id?: string
          idea_id: string
          tag: string
        }
        Update: {
          id?: string
          idea_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_tags_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          assumptions: string | null
          created_at: string
          created_by: string
          desired_teammates: string | null
          expected_timeline: string | null
          id: string
          is_public: boolean | null
          problem: string
          solution: string | null
          stage: Database["public"]["Enums"]["idea_stage"] | null
          target_user: string | null
          title: string
          university_id: string | null
          updated_at: string
          why_now: string | null
        }
        Insert: {
          assumptions?: string | null
          created_at?: string
          created_by: string
          desired_teammates?: string | null
          expected_timeline?: string | null
          id?: string
          is_public?: boolean | null
          problem: string
          solution?: string | null
          stage?: Database["public"]["Enums"]["idea_stage"] | null
          target_user?: string | null
          title: string
          university_id?: string | null
          updated_at?: string
          why_now?: string | null
        }
        Update: {
          assumptions?: string | null
          created_at?: string
          created_by?: string
          desired_teammates?: string | null
          expected_timeline?: string | null
          id?: string
          is_public?: boolean | null
          problem?: string
          solution?: string | null
          stage?: Database["public"]["Enums"]["idea_stage"] | null
          target_user?: string | null
          title?: string
          university_id?: string | null
          updated_at?: string
          why_now?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ideas_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      investing_pipeline: {
        Row: {
          created_at: string
          decision_notes: string | null
          defensibility_score: number | null
          flagged_by: string
          id: string
          market_score: number | null
          notes: string | null
          project_id: string
          stage: Database["public"]["Enums"]["pipeline_stage"] | null
          team_score: number | null
          traction_score: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          decision_notes?: string | null
          defensibility_score?: number | null
          flagged_by: string
          id?: string
          market_score?: number | null
          notes?: string | null
          project_id: string
          stage?: Database["public"]["Enums"]["pipeline_stage"] | null
          team_score?: number | null
          traction_score?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          decision_notes?: string | null
          defensibility_score?: number | null
          flagged_by?: string
          id?: string
          market_score?: number | null
          notes?: string | null
          project_id?: string
          stage?: Database["public"]["Enums"]["pipeline_stage"] | null
          team_score?: number | null
          traction_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investing_pipeline_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      join_requests: {
        Row: {
          created_at: string
          id: string
          idea_id: string | null
          message: string | null
          status: string | null
          team_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          idea_id?: string | null
          message?: string | null
          status?: string | null
          team_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          idea_id?: string | null
          message?: string | null
          status?: string | null
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          availability: string | null
          avatar_url: string | null
          bio: string | null
          club_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          github_url: string | null
          graduation_year: number | null
          id: string
          interests: string[] | null
          linkedin_url: string | null
          major: string | null
          onboarding_completed: boolean | null
          portfolio_url: string | null
          skills: string[] | null
          university_id: string | null
          updated_at: string
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Insert: {
          availability?: string | null
          avatar_url?: string | null
          bio?: string | null
          club_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          github_url?: string | null
          graduation_year?: number | null
          id: string
          interests?: string[] | null
          linkedin_url?: string | null
          major?: string | null
          onboarding_completed?: boolean | null
          portfolio_url?: string | null
          skills?: string[] | null
          university_id?: string | null
          updated_at?: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Update: {
          availability?: string | null
          avatar_url?: string | null
          bio?: string | null
          club_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          github_url?: string | null
          graduation_year?: number | null
          id?: string
          interests?: string[] | null
          linkedin_url?: string | null
          major?: string | null
          onboarding_completed?: boolean | null
          portfolio_url?: string | null
          skills?: string[] | null
          university_id?: string | null
          updated_at?: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      project_docs: {
        Row: {
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_docs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          project_id: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          idea_id: string | null
          name: string
          status: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          idea_id?: string | null
          name: string
          status?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          idea_id?: string | null
          name?: string
          status?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_challenges: {
        Row: {
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          prize: string | null
          sponsor_id: string
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          prize?: string | null
          sponsor_id: string
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          prize?: string | null
          sponsor_id?: string
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          role: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          idea_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          idea_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          idea_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      universities: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          logo_url: string | null
          name: string
          short_name: string | null
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          logo_url?: string | null
          name: string
          short_name?: string | null
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          short_name?: string | null
        }
        Relationships: []
      }
      university_resources: {
        Row: {
          contact_email: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          type: string
          university_id: string | null
          url: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          type: string
          university_id?: string | null
          url?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          type?: string
          university_id?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "university_resources_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workflow_artifacts: {
        Row: {
          content: string | null
          created_at: string
          id: string
          metadata: Json | null
          version: number | null
          workflow_run_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          version?: number | null
          workflow_run_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          version?: number | null
          workflow_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_artifacts_workflow_run_id_fkey"
            columns: ["workflow_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          idea_id: string | null
          inputs: Json | null
          project_id: string | null
          status: string | null
          user_id: string
          workflow_type: Database["public"]["Enums"]["workflow_type"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          idea_id?: string | null
          inputs?: Json | null
          project_id?: string | null
          status?: string | null
          user_id: string
          workflow_type: Database["public"]["Enums"]["workflow_type"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          idea_id?: string | null
          inputs?: Json | null
          project_id?: string | null
          status?: string | null
          user_id?: string
          workflow_type?: Database["public"]["Enums"]["workflow_type"]
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_verified: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "student"
        | "alumni"
        | "founder_pro"
        | "investor"
        | "sponsor"
        | "admin"
      idea_stage: "concept" | "validating" | "building" | "launched"
      pipeline_stage: "watchlist" | "diligence" | "pass" | "invest"
      verification_status: "pending" | "verified" | "rejected"
      workflow_type:
        | "idea_founder_fit"
        | "competitive_landscape"
        | "risk_moat_builder"
        | "product_mvp_design"
        | "team_talent"
        | "launch_plan"
        | "school_advantage"
        | "funding_pitch"
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
      app_role: [
        "student",
        "alumni",
        "founder_pro",
        "investor",
        "sponsor",
        "admin",
      ],
      idea_stage: ["concept", "validating", "building", "launched"],
      pipeline_stage: ["watchlist", "diligence", "pass", "invest"],
      verification_status: ["pending", "verified", "rejected"],
      workflow_type: [
        "idea_founder_fit",
        "competitive_landscape",
        "risk_moat_builder",
        "product_mvp_design",
        "team_talent",
        "launch_plan",
        "school_advantage",
        "funding_pitch",
      ],
    },
  },
} as const
