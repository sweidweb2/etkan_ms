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
      instructor_schedule_slots: {
        Row: {
          color: string
          created_at: string
          end_time: string
          entity_type: string
          id: string
          name: string
          record_id: string
          slot_date: string
          start_time: string
          type: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          end_time: string
          entity_type: string
          id?: string
          name: string
          record_id: string
          slot_date: string
          start_time: string
          type: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          end_time?: string
          entity_type?: string
          id?: string
          name?: string
          record_id?: string
          slot_date?: string
          start_time?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      instructor_subject_capability: {
        Row: {
          created_at: string
          id: string
          subject_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subject_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructor_subject_capability_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_subject_capability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          parent_phone: string | null
          phone: string | null
          received_financial_aid_before: boolean
          school_or_university: string | null
          student_financial_adjustment_id: string
          student_monthly_income: number | null
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
          parent_phone?: string | null
          phone?: string | null
          received_financial_aid_before?: boolean
          school_or_university?: string | null
          student_financial_adjustment_id: string
          student_monthly_income?: number | null
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
          parent_phone?: string | null
          phone?: string | null
          received_financial_aid_before?: boolean
          school_or_university?: string | null
          student_financial_adjustment_id?: string
          student_monthly_income?: number | null
          student_works?: boolean
          total_family_income?: number | null
          updated_at?: string
          working_family_members?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_financial_forms_student_financial_adjustment_id_fkey"
            columns: ["student_financial_adjustment_id"]
            isOneToOne: true
            referencedRelation: "student_financial_adjustments"
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
          price: number | null
          proposal_notes: string | null
          start_date: string | null
          status: string
          subject: string | null
          target_audience: string | null
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
          price?: number | null
          proposal_notes?: string | null
          start_date?: string | null
          status?: string
          subject?: string | null
          target_audience?: string | null
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
          price?: number | null
          proposal_notes?: string | null
          start_date?: string | null
          status?: string
          subject?: string | null
          target_audience?: string | null
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
      start_scheduled_semesters: { Args: never; Returns: undefined }
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
