export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      comments: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          post_id: string;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          post_id: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          post_id?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          code: string;
          created_at: string;
          created_by: string | null;
          department_id: string;
          description: string;
          drive_folder_url: string | null;
          id: string;
          level: number;
          past_questions_url: string | null;
          representative_id: string | null;
          semester: number;
          thumbnail_path: string | null;
          title: string;
          units: number;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by?: string | null;
          department_id: string;
          description?: string;
          drive_folder_url?: string | null;
          id?: string;
          level: number;
          past_questions_url?: string | null;
          representative_id?: string | null;
          semester: number;
          thumbnail_path?: string | null;
          title: string;
          units?: number;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string | null;
          department_id?: string;
          description?: string;
          drive_folder_url?: string | null;
          id?: string;
          level?: number;
          past_questions_url?: string | null;
          representative_id?: string | null;
          semester?: number;
          thumbnail_path?: string | null;
          title?: string;
          units?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      departments: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          group_id: string;
          joined_at: string;
          user_id: string;
        };
        Insert: {
          group_id: string;
          joined_at?: string;
          user_id: string;
        };
        Update: {
          group_id?: string;
          joined_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          image_path: string | null;
          is_private: boolean;
          name: string;
          owner_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          id?: string;
          image_path?: string | null;
          is_private?: boolean;
          name: string;
          owner_id: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          image_path?: string | null;
          is_private?: boolean;
          name?: string;
          owner_id?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          author_id: string;
          body: string;
          class_level: number | null;
          created_at: string;
          id: string;
          image_url: string | null;
          scope: Database["public"]["Enums"]["feed_scope"];
          scope_id: string | null;
          session_id: string | null;
        };
        Insert: {
          author_id: string;
          body: string;
          class_level?: number | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          scope: Database["public"]["Enums"]["feed_scope"];
          scope_id?: string | null;
          session_id?: string | null;
        };
        Update: {
          author_id?: string;
          body?: string;
          class_level?: number | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          scope?: Database["public"]["Enums"]["feed_scope"];
          scope_id?: string | null;
          session_id?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          department_id: string | null;
          email: string | null;
          full_name: string;
          id: string;
          level: number | null;
          matric_number: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          department_id?: string | null;
          email?: string | null;
          full_name?: string;
          id: string;
          level?: number | null;
          matric_number?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          department_id?: string | null;
          email?: string | null;
          full_name?: string;
          id?: string;
          level?: number | null;
          matric_number?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      reactions: {
        Row: {
          created_at: string;
          kind: Database["public"]["Enums"]["reaction_kind"];
          post_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          kind?: Database["public"]["Enums"]["reaction_kind"];
          post_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          kind?: Database["public"]["Enums"]["reaction_kind"];
          post_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          created_at: string;
          id: string;
          is_current: boolean;
          label: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_current?: boolean;
          label: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_current?: boolean;
          label?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          department_id: string | null;
          id: string;
          level: number | null;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          department_id?: string | null;
          id?: string;
          level?: number | null;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          department_id?: string | null;
          id?: string;
          level?: number | null;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      in_class: {
        Args: { _department_id: string; _level: number };
        Returns: boolean;
      };
      is_course_rep_for: {
        Args: { _department_id: string; _level: number; _user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "super_admin" | "course_rep" | "student";
      feed_scope: "public" | "department" | "class" | "group";
      reaction_kind: "like" | "celebrate" | "insightful";
    };
    CompositeTypes: Record<string, never>;
  };
};
