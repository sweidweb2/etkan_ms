import type { RoleValue } from "@/lib/constants/roles";

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
      profiles: {
        Row: {
          id: string;
          username: string | null;
          role: RoleValue;
          created_at: string | null;
        };
        Insert: {
          id: string;
          username?: string | null;
          role?: RoleValue;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          username?: string | null;
          role?: RoleValue;
          created_at?: string | null;
        };
        Relationships: [];
      };
      student_profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          birth_date: string | null;
          phone: string | null;
          status: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          birth_date?: string | null;
          phone?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string;
          birth_date?: string | null;
          phone?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "student_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
