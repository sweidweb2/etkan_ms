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
      users: {
        Row: {
          id: number;
          username: string;
          email: string;
          password_hash: string;
          auth_id: string | null;
          role: RoleValue;
          created_at: string;
        };
        Insert: {
          id?: number;
          username: string;
          email: string;
          password_hash: string;
          auth_id?: string | null;
          role?: RoleValue;
          created_at?: string;
        };
        Update: {
          id?: number;
          username?: string;
          email?: string;
          password_hash?: string;
          auth_id?: string | null;
          role?: RoleValue;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: RoleValue;
    };
  };
};
