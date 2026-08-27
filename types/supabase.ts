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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: number
          maintenance_mode: boolean
          updated_at: string
        }
        Insert: {
          id?: number
          maintenance_mode?: boolean
          updated_at?: string
        }
        Update: {
          id?: number
          maintenance_mode?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      attendee: {
        Row: {
          created_at: string
          id: string
          note: string | null
          session_id: string
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          session_id: string
          status?: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          session_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendee_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendee_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          severity: string
          table_name: string | null
          user_id: string | null
          user_label: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          severity?: string
          table_name?: string | null
          user_id?: string | null
          user_label?: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          severity?: string
          table_name?: string | null
          user_id?: string | null
          user_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_history: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_label: string
          file_name: string
          id: string
          row_count: number
          scope: string
          table_count: number
          table_name: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_label: string
          file_name: string
          id?: string
          row_count?: number
          scope: string
          table_count?: number
          table_name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_label?: string
          file_name?: string
          id?: string
          row_count?: number
          scope?: string
          table_count?: number
          table_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backup_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      borrow_equipment: {
        Row: {
          borrowed_at: string | null
          equipment_id: string
          id: string
          quantity: number | null
          returned_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          borrowed_at?: string | null
          equipment_id: string
          id?: string
          quantity?: number | null
          returned_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          borrowed_at?: string | null
          equipment_id?: string
          id?: string
          quantity?: number | null
          returned_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "borrow_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrow_equipment_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cloudflare_ai_usage: {
        Row: {
          completion_tokens: number | null
          created_at: string
          error_message: string | null
          feature: string
          id: string
          metadata: Json | null
          model: string
          prompt: string
          prompt_tokens: number | null
          response: string | null
          status: string
          tool_rounds: number
          total_tokens: number | null
          user_id: string | null
          user_label: string
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string
          error_message?: string | null
          feature: string
          id?: string
          metadata?: Json | null
          model: string
          prompt: string
          prompt_tokens?: number | null
          response?: string | null
          status: string
          tool_rounds?: number
          total_tokens?: number | null
          user_id?: string | null
          user_label?: string
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string
          error_message?: string | null
          feature?: string
          id?: string
          metadata?: Json | null
          model?: string
          prompt?: string
          prompt_tokens?: number | null
          response?: string | null
          status?: string
          tool_rounds?: number
          total_tokens?: number | null
          user_id?: string | null
          user_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "cloudflare_ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_teacher: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          class_id: string
          id: string
          teacher_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          class_id: string
          id?: string
          teacher_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          class_id?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_teacher_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_teacher_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_teacher_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string | null
          id: string
          name: string
          semester_id: string | null
          status: string
          subject_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          semester_id?: string | null
          status?: string
          subject_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          semester_id?: string | null
          status?: string
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sent: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          locale: string
          reference_code: string
          reference_number: number
          template_id: string
          title: string
          updated_at: string
          year: number
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          locale?: string
          reference_code: string
          reference_number: number
          template_id: string
          title: string
          updated_at?: string
          year: number
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          locale?: string
          reference_code?: string
          reference_number?: number
          template_id?: string
          title?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_sent_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_users: {
        Row: {
          created_at: string
          delivery_status: string
          email_address: string
          email_sent_id: string
          id: string
          mailtrap_message_id: string | null
          opened_at: string | null
          sent_at: string | null
          student_id: string | null
        }
        Insert: {
          created_at?: string
          delivery_status?: string
          email_address: string
          email_sent_id: string
          id?: string
          mailtrap_message_id?: string | null
          opened_at?: string | null
          sent_at?: string | null
          student_id?: string | null
        }
        Update: {
          created_at?: string
          delivery_status?: string
          email_address?: string
          email_sent_id?: string
          id?: string
          mailtrap_message_id?: string | null
          opened_at?: string | null
          sent_at?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_users_email_sent_id_fkey"
            columns: ["email_sent_id"]
            isOneToOne: false
            referencedRelation: "email_sent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_users_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          quantity: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          quantity?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          quantity?: number | null
          unit_price?: number | null
        }
        Relationships: []
      }
      final_exam: {
        Row: {
          class_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          max_grade: number | null
          title: string
        }
        Insert: {
          class_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          max_grade?: number | null
          title: string
        }
        Update: {
          class_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          max_grade?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "final_exam_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: true
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_images: {
        Row: {
          created_at: string
          direct_url: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          direct_url: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          direct_url?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      guest_registration_invites: {
        Row: {
          application_id: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          guest_id: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          application_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          guest_id: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          application_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          guest_id?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_registration_invites_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "student_registration_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_registration_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_registration_invites_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: true
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_status_events: {
        Row: {
          created_at: string
          created_by: string | null
          guest_id: string
          id: string
          note: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          guest_id: string
          id?: string
          note?: string | null
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          guest_id?: string
          id?: string
          note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_status_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_status_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          age: number
          created_at: string
          created_by: string | null
          education_level: string
          full_name: string
          id: string
          interested_service: string
          notes: string | null
          phone: string
          school_or_university: string | null
          status: string
          updated_at: string
        }
        Insert: {
          age: number
          created_at?: string
          created_by?: string | null
          education_level: string
          full_name: string
          id?: string
          interested_service: string
          notes?: string | null
          phone: string
          school_or_university?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          age?: number
          created_at?: string
          created_by?: string | null
          education_level?: string
          full_name?: string
          id?: string
          interested_service?: string
          notes?: string | null
          phone?: string
          school_or_university?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_schedule_slots: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          entity_type: string
          id: string
          name: string
          record_id: string
          slot_date: string
          source_slot_id: string | null
          source_workshop_id: string | null
          start_time: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          entity_type: string
          id?: string
          name: string
          record_id: string
          slot_date: string
          source_slot_id?: string | null
          source_workshop_id?: string | null
          start_time: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          entity_type?: string
          id?: string
          name?: string
          record_id?: string
          slot_date?: string
          source_slot_id?: string | null
          source_workshop_id?: string | null
          start_time?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructor_schedule_slots_source_slot_id_fkey"
            columns: ["source_slot_id"]
            isOneToOne: false
            referencedRelation: "instructor_schedule_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_schedule_slots_source_workshop_id_fkey"
            columns: ["source_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_subject_capability: {
        Row: {
          created_at: string
          id: string
          mentor_subject_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentor_subject_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mentor_subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_subject_capability_mentor_subject_id_fkey"
            columns: ["mentor_subject_id"]
            isOneToOne: false
            referencedRelation: "mentor_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_subject_capability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_subjects: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_href: string | null
          audience: string
          body: string
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_read: boolean
          priority: string
          read_at: string | null
          recipient_id: string | null
          title: string
        }
        Insert: {
          action_href?: string | null
          audience?: string
          body: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          priority?: string
          read_at?: string | null
          recipient_id?: string | null
          title: string
        }
        Update: {
          action_href?: string | null
          audience?: string
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          priority?: string
          read_at?: string | null
          recipient_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_phases: {
        Row: {
          amount: number
          created_at: string
          duration_months: number
          end_date: string
          id: string
          name: string
          semester_code: string
          semester_id: string
          start_date: string
          status: string
          updated_at: string
          upfront_amount: number
        }
        Insert: {
          amount: number
          created_at?: string
          duration_months: number
          end_date: string
          id?: string
          name: string
          semester_code: string
          semester_id: string
          start_date: string
          status?: string
          updated_at?: string
          upfront_amount?: number
        }
        Update: {
          amount?: number
          created_at?: string
          duration_months?: number
          end_date?: string
          id?: string
          name?: string
          semester_code?: string
          semester_id?: string
          start_date?: string
          status?: string
          updated_at?: string
          upfront_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_phases_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          access: string
          created_at: string
          feature_group: string
          key: string
          label: string
        }
        Insert: {
          access: string
          created_at?: string
          feature_group: string
          key: string
          label: string
        }
        Update: {
          access?: string
          created_at?: string
          feature_group?: string
          key?: string
          label?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          is_instructor: boolean
          role: string
          username: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          is_instructor?: boolean
          role?: string
          username?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_instructor?: boolean
          role?: string
          username?: string | null
        }
        Relationships: []
      }
      public_projects: {
        Row: {
          author: string | null
          body: string
          category: string
          classification: string
          created_at: string
          href: string | null
          id: string
          image_url: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          body: string
          category: string
          classification: string
          created_at?: string
          href?: string | null
          id?: string
          image_url: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          body?: string
          category?: string
          classification?: string
          created_at?: string
          href?: string | null
          id?: string
          image_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      relationships: {
        Row: {
          created_at: string | null
          id: string
          is_useful: boolean | null
          major: string | null
          name: string
          phone: string | null
          relation_with: string | null
          speciality: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_useful?: boolean | null
          major?: string | null
          name: string
          phone?: string | null
          relation_with?: string | null
          speciality?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_useful?: boolean | null
          major?: string | null
          name?: string
          phone?: string | null
          relation_with?: string | null
          speciality?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          permission_key: string
          role: string
        }
        Insert: {
          permission_key: string
          role: string
        }
        Update: {
          permission_key?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      semesters: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          name: string
          nb_courses: number
          semester_code: string
          start_date: string | null
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          id?: string
          name: string
          nb_courses?: number
          semester_code: string
          start_date?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          name?: string
          nb_courses?: number
          semester_code?: string
          start_date?: string | null
          status?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          class_id: string
          created_at: string
          ends_at: string
          group_grade_level: string | null
          id: string
          nb_order: number
          semester_id: string | null
          starts_at: string
          topic: string
        }
        Insert: {
          class_id: string
          created_at?: string
          ends_at: string
          group_grade_level?: string | null
          id?: string
          nb_order: number
          semester_id?: string | null
          starts_at: string
          topic: string
        }
        Update: {
          class_id?: string
          created_at?: string
          ends_at?: string
          group_grade_level?: string | null
          id?: string
          nb_order?: number
          semester_id?: string | null
          starts_at?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      student_class: {
        Row: {
          class_id: string
          id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          class_id: string
          id?: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          class_id?: string
          id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_class_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_class_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_course_grade: {
        Row: {
          attendee_grades_json: Json | null
          class_id: string
          created_at: string | null
          final_exam_grade: number | null
          final_exam_weight: number | null
          group_grades_json: Json | null
          id: string
          task_json_grade_weights: Json | null
          task_total_grade: number | null
          task_weight: number | null
          type: string | null
          user_id: string
        }
        Insert: {
          attendee_grades_json?: Json | null
          class_id: string
          created_at?: string | null
          final_exam_grade?: number | null
          final_exam_weight?: number | null
          group_grades_json?: Json | null
          id?: string
          task_json_grade_weights?: Json | null
          task_total_grade?: number | null
          task_weight?: number | null
          type?: string | null
          user_id: string
        }
        Update: {
          attendee_grades_json?: Json | null
          class_id?: string
          created_at?: string | null
          final_exam_grade?: number | null
          final_exam_weight?: number | null
          group_grades_json?: Json | null
          id?: string
          task_json_grade_weights?: Json | null
          task_total_grade?: number | null
          task_weight?: number | null
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_course_grade_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_course_grade_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_finalexam_grade: {
        Row: {
          created_at: string
          final_exam_id: string
          grade: number | null
          graded_at: string | null
          id: string
          notes: string | null
          status: string
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          created_at?: string
          final_exam_id: string
          grade?: number | null
          graded_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          created_at?: string
          final_exam_id?: string
          grade?: number | null
          graded_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_finalexam_grade_final_exam_id_fkey"
            columns: ["final_exam_id"]
            isOneToOne: false
            referencedRelation: "final_exam"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_finalexam_grade_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_financial_adjustments: {
        Row: {
          created_at: string
          effective_date: string
          id: string
          reason: string | null
          student_payment_phase_id: string
          type: string
          updated_at: string
          value: number
          value_type: string
        }
        Insert: {
          created_at?: string
          effective_date: string
          id?: string
          reason?: string | null
          student_payment_phase_id: string
          type: string
          updated_at?: string
          value: number
          value_type: string
        }
        Update: {
          created_at?: string
          effective_date?: string
          id?: string
          reason?: string | null
          student_payment_phase_id?: string
          type?: string
          updated_at?: string
          value?: number
          value_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_financial_adjustments_student_payment_phase_id_fkey"
            columns: ["student_payment_phase_id"]
            isOneToOne: true
            referencedRelation: "student_payment_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      student_financial_forms: {
        Row: {
          affordable_monthly_payment: number | null
          agreed_to_rules: boolean
          both_parents_work: boolean
          certificates: string | null
          children_currently_learning: number | null
          created_at: string
          current_gpa: string | null
          date_of_birth: string | null
          family_chronic_disease: boolean
          family_hardship: boolean
          family_members: number | null
          full_name: string
          has_deceased_parent: boolean
          id: string
          invite_id: string | null
          parent_phone: string | null
          phone: string | null
          received_financial_aid_before: boolean
          school_or_university: string | null
          student_monthly_income: number | null
          student_payment_phase_id: string
          student_works: boolean
          total_family_income: number | null
          updated_at: string
          working_family_members: number | null
        }
        Insert: {
          affordable_monthly_payment?: number | null
          agreed_to_rules: boolean
          both_parents_work?: boolean
          certificates?: string | null
          children_currently_learning?: number | null
          created_at?: string
          current_gpa?: string | null
          date_of_birth?: string | null
          family_chronic_disease?: boolean
          family_hardship?: boolean
          family_members?: number | null
          full_name: string
          has_deceased_parent?: boolean
          id?: string
          invite_id?: string | null
          parent_phone?: string | null
          phone?: string | null
          received_financial_aid_before?: boolean
          school_or_university?: string | null
          student_monthly_income?: number | null
          student_payment_phase_id: string
          student_works?: boolean
          total_family_income?: number | null
          updated_at?: string
          working_family_members?: number | null
        }
        Update: {
          affordable_monthly_payment?: number | null
          agreed_to_rules?: boolean
          both_parents_work?: boolean
          certificates?: string | null
          children_currently_learning?: number | null
          created_at?: string
          current_gpa?: string | null
          date_of_birth?: string | null
          family_chronic_disease?: boolean
          family_hardship?: boolean
          family_members?: number | null
          full_name?: string
          has_deceased_parent?: boolean
          id?: string
          invite_id?: string | null
          parent_phone?: string | null
          phone?: string | null
          received_financial_aid_before?: boolean
          school_or_university?: string | null
          student_monthly_income?: number | null
          student_payment_phase_id?: string
          student_works?: boolean
          total_family_income?: number | null
          updated_at?: string
          working_family_members?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_financial_forms_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: true
            referencedRelation: "student_financial_form_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_financial_forms_student_payment_phase_id_fkey"
            columns: ["student_payment_phase_id"]
            isOneToOne: false
            referencedRelation: "student_payment_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      student_financial_form_invites: {
        Row: {
          created_at: string
          created_by: string | null
          form_id: string | null
          id: string
          student_payment_phase_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          form_id?: string | null
          id?: string
          student_payment_phase_id: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          form_id?: string | null
          id?: string
          student_payment_phase_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_financial_form_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_financial_form_invites_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "student_financial_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_financial_form_invites_student_payment_phase_id_fkey"
            columns: ["student_payment_phase_id"]
            isOneToOne: false
            referencedRelation: "student_payment_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      student_payment_phases: {
        Row: {
          adjustment_amount: number
          assigned_at: string
          created_at: string
          final_amount_due: number
          id: string
          original_amount: number
          payment_phase_id: string
          remaining_amount: number
          status: string
          student_id: string
          total_paid: number
          updated_at: string
        }
        Insert: {
          adjustment_amount?: number
          assigned_at: string
          created_at?: string
          final_amount_due?: number
          id?: string
          original_amount?: number
          payment_phase_id: string
          remaining_amount?: number
          status?: string
          student_id: string
          total_paid?: number
          updated_at?: string
        }
        Update: {
          adjustment_amount?: number
          assigned_at?: string
          created_at?: string
          final_amount_due?: number
          id?: string
          original_amount?: number
          payment_phase_id?: string
          remaining_amount?: number
          status?: string
          student_id?: string
          total_paid?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_payment_phases_payment_phase_id_fkey"
            columns: ["payment_phase_id"]
            isOneToOne: false
            referencedRelation: "payment_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_payment_phases_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          receipt_number: string | null
          received_by: string
          received_by_management: boolean
          student_payment_phase_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date: string
          payment_method: string
          receipt_number?: string | null
          received_by: string
          received_by_management?: boolean
          student_payment_phase_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          receipt_number?: string | null
          received_by?: string
          received_by_management?: boolean
          student_payment_phase_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_payments_student_payment_phase_id_fkey"
            columns: ["student_payment_phase_id"]
            isOneToOne: false
            referencedRelation: "student_payment_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      student_registration_applications: {
        Row: {
          additional_phone: string | null
          available_days: string[]
          blood_type: string
          city: string
          consent_privacy: boolean
          consent_terms: boolean
          created_at: string
          date_of_birth: string
          education_level: string
          email: string
          full_address: string
          full_name: string
          gender: string
          graduation_year: number | null
          guest_id: string | null
          guardian_name: string | null
          guardian_phone: string | null
          has_transportation: boolean
          id: string
          id_document_type: string
          job_status: string
          learning_goal: string
          learning_status: string
          notes: string | null
          organization_name: string | null
          phone: string
          preferred_program: string
          preferred_shifts: string[]
          referral_other: string | null
          referral_source: string
          self_learning_notes: string | null
          skills: string[]
          skills_other: string | null
          speciality: string | null
          status: string
          updated_at: string
          user_id: string | null
          weekly_available_hours: number
        }
        Insert: {
          additional_phone?: string | null
          available_days?: string[]
          blood_type: string
          city: string
          consent_privacy: boolean
          consent_terms: boolean
          created_at?: string
          date_of_birth: string
          education_level: string
          email: string
          full_address: string
          full_name: string
          gender: string
          graduation_year?: number | null
          guest_id?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          has_transportation: boolean
          id?: string
          id_document_type: string
          job_status: string
          learning_goal: string
          learning_status: string
          notes?: string | null
          organization_name?: string | null
          phone: string
          preferred_program: string
          preferred_shifts?: string[]
          referral_other?: string | null
          referral_source: string
          self_learning_notes?: string | null
          skills?: string[]
          skills_other?: string | null
          speciality?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          weekly_available_hours: number
        }
        Update: {
          additional_phone?: string | null
          available_days?: string[]
          blood_type?: string
          city?: string
          consent_privacy?: boolean
          consent_terms?: boolean
          created_at?: string
          date_of_birth?: string
          education_level?: string
          email?: string
          full_address?: string
          full_name?: string
          gender?: string
          graduation_year?: number | null
          guest_id?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          has_transportation?: boolean
          id?: string
          id_document_type?: string
          job_status?: string
          learning_goal?: string
          learning_status?: string
          notes?: string | null
          organization_name?: string | null
          phone?: string
          preferred_program?: string
          preferred_shifts?: string[]
          referral_other?: string | null
          referral_source?: string
          self_learning_notes?: string | null
          skills?: string[]
          skills_other?: string | null
          speciality?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          weekly_available_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_registration_applications_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_registration_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_registration_documents: {
        Row: {
          application_id: string
          created_at: string
          file_name: string
          file_size: number
          id: string
          mime_type: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          application_id: string
          created_at?: string
          file_name: string
          file_size: number
          id?: string
          mime_type: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          application_id?: string
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_registration_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "student_registration_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          birth_date: string | null
          created_at: string | null
          full_name: string
          id: string
          phone: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          full_name: string
          id?: string
          phone?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_semester: {
        Row: {
          created_at: string
          id: string
          semester_id: string
          status: string
          student_profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          semester_id: string
          status?: string
          student_profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          semester_id?: string
          status?: string
          student_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_semester_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_semester_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_takeouts: {
        Row: {
          created_at: string | null
          factor_id: string | null
          id: string
          user_id: string
          value: number | null
        }
        Insert: {
          created_at?: string | null
          factor_id?: string | null
          id?: string
          user_id: string
          value?: number | null
        }
        Update: {
          created_at?: string | null
          factor_id?: string | null
          id?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_takeouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_tasks: {
        Row: {
          grade: number | null
          graded_at: string | null
          id: string
          notes: string | null
          status: string
          student_id: string
          submitted_at: string | null
          task_id: string
        }
        Insert: {
          grade?: number | null
          graded_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          student_id: string
          submitted_at?: string | null
          task_id: string
        }
        Update: {
          grade?: number | null
          graded_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          student_id?: string
          submitted_at?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_tasks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string | null
          handout_link: string | null
          id: string
          name: string
          nb_sessions: number
          reference_link: string | null
          syllabus_link: string | null
        }
        Insert: {
          created_at?: string | null
          handout_link?: string | null
          id?: string
          name: string
          nb_sessions?: number
          reference_link?: string | null
          syllabus_link?: string | null
        }
        Update: {
          created_at?: string | null
          handout_link?: string | null
          id?: string
          name?: string
          nb_sessions?: number
          reference_link?: string | null
          syllabus_link?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          max_grade: number | null
          session_id: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          max_grade?: number | null
          session_id?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          max_grade?: number | null
          session_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          id: string
          notes: string | null
          payment_method: string | null
          recorded_by: string
          transaction_date: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          recorded_by: string
          transaction_date: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          recorded_by?: string
          transaction_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      weekly_schedule_slots: {
        Row: {
          color: string
          created_at: string
          end_time: string
          id: string
          name: string
          slot_date: string
          start_time: string
          type: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          end_time: string
          id?: string
          name: string
          slot_date: string
          start_time: string
          type: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          end_time?: string
          id?: string
          name?: string
          slot_date?: string
          start_time?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      workshop_documents: {
        Row: {
          created_at: string
          file_size: number | null
          id: string
          mime_type: string | null
          name: string
          storage_path: string
          uploaded_by: string | null
          workshop_id: string
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name: string
          storage_path: string
          uploaded_by?: string | null
          workshop_id: string
        }
        Update: {
          created_at?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          storage_path?: string
          uploaded_by?: string | null
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_documents_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_instructors: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          role: string
          user_id: string
          wage_amount: number | null
          wage_type: string
          workshop_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          role: string
          user_id: string
          wage_amount?: number | null
          wage_type: string
          workshop_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          role?: string
          user_id?: string
          wage_amount?: number | null
          wage_type?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_instructors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_instructors_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          type: string
          workshop_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date: string
          payment_method?: string | null
          type: string
          workshop_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          type?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_payments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_sessions: {
        Row: {
          created_at: string
          end_time: string
          id: string
          nb_hours: number
          nb_order: number
          notes: string | null
          participants_eval: number | null
          session_date: string
          session_eval: number | null
          start_time: string
          status: string
          suggestions: string | null
          topic: string
          updated_at: string
          workshop_id: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          nb_hours: number
          nb_order: number
          notes?: string | null
          participants_eval?: number | null
          session_date: string
          session_eval?: number | null
          start_time: string
          status?: string
          suggestions?: string | null
          topic: string
          updated_at?: string
          workshop_id: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          nb_hours?: number
          nb_order?: number
          notes?: string | null
          participants_eval?: number | null
          session_date?: string
          session_eval?: number | null
          start_time?: string
          status?: string
          suggestions?: string | null
          topic?: string
          updated_at?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshops: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          delivery_place: string | null
          end_date: string | null
          id: string
          name: string
          nb_participants: number | null
          number_of_sessions: number | null
          phone: string | null
          price: number | null
          proposal_notes: string | null
          start_date: string | null
          status: string
          subject: string | null
          target_audience: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_place?: string | null
          end_date?: string | null
          id?: string
          name: string
          nb_participants?: number | null
          number_of_sessions?: number | null
          phone?: string | null
          price?: number | null
          proposal_notes?: string | null
          start_date?: string | null
          status?: string
          subject?: string | null
          target_audience?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_place?: string | null
          end_date?: string | null
          id?: string
          name?: string
          nb_participants?: number | null
          number_of_sessions?: number | null
          phone?: string | null
          price?: number | null
          proposal_notes?: string | null
          start_date?: string | null
          status?: string
          subject?: string | null
          target_audience?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshops_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_email_sent_with_reference: {
        Args: {
          p_body: string
          p_created_by: string
          p_locale: string
          p_template_id: string
          p_title: string
          p_year?: number
        }
        Returns: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          locale: string
          reference_code: string
          reference_number: number
          template_id: string
          title: string
          updated_at: string
          year: number
        }
        SetofOptions: {
          from: "*"
          to: "email_sent"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_overdue_pending_work_missing: { Args: never; Returns: undefined }
      seed_late_join_attendees: {
        Args: { p_class_id: string; p_student_id: string }
        Returns: number
      }
      seed_late_join_attendees_for_students: {
        Args: { p_class_id: string; p_student_ids: string[] }
        Returns: number
      }
      seed_late_join_student_tasks: {
        Args: { p_class_id: string; p_student_id: string }
        Returns: number
      }
      seed_late_join_student_tasks_for_students: {
        Args: { p_class_id: string; p_student_ids: string[] }
        Returns: number
      }
      ensure_enrollment_final_exam_grade: {
        Args: { p_class_id: string; p_student_id: string }
        Returns: {
          created_at: string
          final_exam_id: string
          grade: number | null
          graded_at: string | null
          id: string
          notes: string | null
          status: string
          student_id: string
          submitted_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "student_finalexam_grade"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_enrollment_final_exam_grades: {
        Args: { p_class_id: string; p_student_ids: string[] }
        Returns: Json
      }
      enroll_student_in_class: {
        Args: { p_class_id: string; p_user_id: string }
        Returns: Json
      }
      enroll_students_in_class: {
        Args: { p_class_id: string; p_user_ids: string[] }
        Returns: Json
      }
      delete_student_class_membership: {
        Args: { p_class_id: string; p_id: string }
        Returns: {
          class_id: string
          id: string
          joined_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "student_class"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      transfer_student_between_classes: {
        Args: {
          p_from_class_id: string
          p_to_class_id: string
          p_user_id: string
        }
        Returns: Json
      }
      start_scheduled_semesters: { Args: never; Returns: undefined }
      sync_student_joined_class: {
        Args: { p_class_id: string; p_student_id: string }
        Returns: Json
      }
      sync_students_joined_class: {
        Args: { p_class_id: string; p_student_ids: string[] }
        Returns: Json
      }
      sync_student_left_class: {
        Args: { p_class_id: string; p_student_id: string }
        Returns: Json
      }
      ensure_session_attendees_for_members: {
        Args: { p_class_id: string; p_session_id: string }
        Returns: number
      }
      renumber_sessions_after_delete: {
        Args: { p_class_id: string }
        Returns: number
      }
      copy_weekly_schedule_from_last_week: {
        Args: { p_week_start: string }
        Returns: Json
      }
      seed_student_tasks_for_new_task: {
        Args: { p_task_id: string }
        Returns: {
          grade: number | null
          graded_at: string | null
          id: string
          notes: string | null
          status: string
          student_id: string
          submitted_at: string | null
          task_id: string
        }
        SetofOptions: {
          from: "*"
          to: "student_tasks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      find_sync_target_phase_for_class: {
        Args: { p_class_id: string }
        Returns: {
          amount: number
          created_at: string
          duration_months: number
          end_date: string
          id: string
          name: string
          semester_code: string
          semester_id: string
          start_date: string
          status: string
          updated_at: string
          upfront_amount: number
        }
        SetofOptions: {
          from: "*"
          to: "payment_phases"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_spp_for_student_on_phase: {
        Args: {
          p_assigned_at?: string
          p_phase_id: string
          p_student_id: string
        }
        Returns: Json
      }
      backfill_spps_for_class_become_in_progress: {
        Args: { p_class_id: string }
        Returns: Json
      }
      recalc_spp_and_phase_status: {
        Args: { p_spp_id: string }
        Returns: Json
      }
      recalc_non_cancelled_spps_for_phase: {
        Args: { p_phase_id: string }
        Returns: Json
      }
      create_student_payment: {
        Args: {
          p_amount: number
          p_notes?: string | null
          p_payment_date: string
          p_payment_method: string
          p_received_by: string
          p_received_by_management: boolean
          p_student_payment_phase_id: string
        }
        Returns: Json
      }
      update_student_payment: {
        Args: {
          p_amount: number
          p_id: string
          p_notes?: string | null
          p_payment_date: string
          p_payment_method: string
          p_received_by: string
          p_received_by_management: boolean
          p_student_payment_phase_id: string
        }
        Returns: Json
      }
      delete_student_payment: {
        Args: {
          p_id: string
          p_student_payment_phase_id?: string | null
        }
        Returns: Json
      }
      delete_student_payment_phase: {
        Args: { p_id: string }
        Returns: Json
      }
      create_student_financial_adjustment: {
        Args: {
          p_effective_date: string
          p_reason?: string | null
          p_student_payment_phase_id: string
          p_type: string
          p_value: number
          p_value_type: string
        }
        Returns: Json
      }
      update_student_financial_adjustment: {
        Args: {
          p_effective_date: string
          p_id: string
          p_reason?: string | null
          p_student_payment_phase_id: string
          p_type: string
          p_value: number
          p_value_type: string
        }
        Returns: Json
      }
      delete_student_financial_adjustment: {
        Args: {
          p_id: string
          p_student_payment_phase_id?: string | null
        }
        Returns: Json
      }
      create_payment_phase_with_spps: {
        Args: {
          p_amount: number
          p_duration_months: number
          p_end_date: string
          p_name: string
          p_semester_id: string
          p_start_date: string
          p_upfront_amount: number
        }
        Returns: Json
      }
      repair_missing_spp: {
        Args: { p_payment_phase_id: string; p_student_id: string }
        Returns: Json
      }
      transfer_student_payment_phase: {
        Args: {
          p_destination_payment_phase_id: string
          p_spp_id: string
        }
        Returns: Json
      }
      cancel_payment_phase: {
        Args: { p_payment_phase_id: string }
        Returns: Json
      }
      change_student_status: {
        Args: {
          p_remove_from_classes: boolean
          p_remove_open_spps: boolean
          p_target_status: string
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
