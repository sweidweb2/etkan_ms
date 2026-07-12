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
      accounts: {
        Row: {
          id: string
          opened_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          opened_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          opened_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      account_special_cases: {
        Row: {
          account_id: string
          approved_by: string | null
          case_type: string
          created_at: string
          explanation: string
          id: string
          percentage_discount: number
          semester_id: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          account_id: string
          approved_by?: string | null
          case_type: string
          created_at?: string
          explanation: string
          id?: string
          percentage_discount: number
          semester_id: string
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          approved_by?: string | null
          case_type?: string
          created_at?: string
          explanation?: string
          id?: string
          percentage_discount?: number
          semester_id?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_special_cases_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_special_cases_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_special_cases_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
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
      payments: {
        Row: {
          amount: number
          currency: string | null
          id: string
          method: string | null
          paid_at: string | null
          subscribed_semester_id: string
        }
        Insert: {
          amount: number
          currency?: string | null
          id?: string
          method?: string | null
          paid_at?: string | null
          subscribed_semester_id: string
        }
        Update: {
          amount?: number
          currency?: string | null
          id?: string
          method?: string | null
          paid_at?: string | null
          subscribed_semester_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscribed_semester_id_fkey"
            columns: ["subscribed_semester_id"]
            isOneToOne: false
            referencedRelation: "subscribed_semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          username: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          role?: string
          username?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          username?: string | null
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
      scheduled_payments: {
        Row: {
          amount: number | null
          created_at: string
          id: string
          note: string | null
          payment_date: string
          status: string
          subscribed_semester_id: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: string
          note?: string | null
          payment_date: string
          status?: string
          subscribed_semester_id: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: string
          note?: string | null
          payment_date?: string
          status?: string
          subscribed_semester_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_payments_subscribed_semester_id_fkey"
            columns: ["subscribed_semester_id"]
            isOneToOne: false
            referencedRelation: "subscribed_semesters"
            referencedColumns: ["id"]
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
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          id?: string
          name: string
          nb_courses?: number
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          name?: string
          nb_courses?: number
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
          status: string
          user_id: string
        }
        Insert: {
          class_id: string
          id?: string
          joined_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          class_id?: string
          id?: string
          joined_at?: string | null
          status?: string
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
      subscribed_semesters: {
        Row: {
          account_id: string
          amount: number
          created_at: string | null
          id: string
          semester_id: string | null
          status: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string | null
          id?: string
          semester_id?: string | null
          status?: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string | null
          id?: string
          semester_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscribed_semesters_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscribed_semesters_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
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
      weekly_schedule_slots: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: string
          end_time: string
          id: string
          room: string
          start_time: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: string
          end_time: string
          id?: string
          room: string
          start_time: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: string
          end_time?: string
          id?: string
          room?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_schedule_slots_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      mark_overdue_pending_work_missing: { Args: never; Returns: undefined }
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
