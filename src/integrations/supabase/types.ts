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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          description: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          tenant_id: string
          user_agent: string | null
          user_id: string | null
          user_name: string
          user_role: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          description: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          tenant_id: string
          user_agent?: string | null
          user_id?: string | null
          user_name: string
          user_role?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          tenant_id?: string
          user_agent?: string | null
          user_id?: string | null
          user_name?: string
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_logs: {
        Row: {
          backup_scope: string[]
          backup_type: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          duration_seconds: number | null
          error_message: string | null
          file_path: string | null
          file_size_bytes: number | null
          id: string
          status: string
          tenant_id: string
        }
        Insert: {
          backup_scope: string[]
          backup_type: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          status: string
          tenant_id: string
        }
        Update: {
          backup_scope?: string[]
          backup_type?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_payment_settings: {
        Row: {
          account_holder: string
          account_number: string
          bank_code: string
          bank_name: string
          created_at: string | null
          id: string
          is_active: boolean | null
          payment_prefix: string | null
          qr_template: string | null
          updated_at: string | null
        }
        Insert: {
          account_holder: string
          account_number: string
          bank_code: string
          bank_name: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          payment_prefix?: string | null
          qr_template?: string | null
          updated_at?: string | null
        }
        Update: {
          account_holder?: string
          account_number?: string
          bank_code?: string
          bank_name?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          payment_prefix?: string | null
          qr_template?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      booking_consumables: {
        Row: {
          booking_id: string
          consumed_quantity: number | null
          created_at: string
          id: string
          initial_quantity: number
          item_id: string
          notes: string | null
          remaining_quantity: number | null
          room_id: string
          supplemented_quantity: number
          tenant_id: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          booking_id: string
          consumed_quantity?: number | null
          created_at?: string
          id?: string
          initial_quantity?: number
          item_id: string
          notes?: string | null
          remaining_quantity?: number | null
          room_id: string
          supplemented_quantity?: number
          tenant_id: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          booking_id?: string
          consumed_quantity?: number | null
          created_at?: string
          id?: string
          initial_quantity?: number
          item_id?: string
          notes?: string | null
          remaining_quantity?: number | null
          room_id?: string
          supplemented_quantity?: number
          tenant_id?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_consumables_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "room_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_consumables_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_consumables_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_consumables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_engagement: {
        Row: {
          campaign_id: string
          clicked_at: string | null
          conversion_value: number | null
          converted_at: string | null
          email_opened_at: string | null
          email_sent_at: string | null
          id: string
          tenant_id: string
        }
        Insert: {
          campaign_id: string
          clicked_at?: string | null
          conversion_value?: number | null
          converted_at?: string | null
          email_opened_at?: string | null
          email_sent_at?: string | null
          id?: string
          tenant_id: string
        }
        Update: {
          campaign_id?: string
          clicked_at?: string | null
          conversion_value?: number | null
          converted_at?: string | null
          email_opened_at?: string | null
          email_sent_at?: string | null
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_engagement_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_engagement_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_values: {
        Row: {
          entity_id: string
          entity_type: string
          tenant_id: string
          updated_at: string | null
          values: Json
        }
        Insert: {
          entity_id: string
          entity_type: string
          tenant_id: string
          updated_at?: string | null
          values?: Json
        }
        Update: {
          entity_id?: string
          entity_type?: string
          tenant_id?: string
          updated_at?: string | null
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          created_at: string | null
          default_value: string | null
          description: string | null
          display_order: number | null
          entity_type: string
          field_name: string
          field_type: string
          id: string
          label: string
          max_length: number | null
          max_value: number | null
          min_length: number | null
          min_value: number | null
          options: Json | null
          required: boolean | null
          show_in_filters: boolean | null
          show_in_list: boolean | null
          status: string | null
          tenant_id: string
          updated_at: string | null
          validation_rule: string | null
        }
        Insert: {
          created_at?: string | null
          default_value?: string | null
          description?: string | null
          display_order?: number | null
          entity_type: string
          field_name: string
          field_type: string
          id?: string
          label: string
          max_length?: number | null
          max_value?: number | null
          min_length?: number | null
          min_value?: number | null
          options?: Json | null
          required?: boolean | null
          show_in_filters?: boolean | null
          show_in_list?: boolean | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          validation_rule?: string | null
        }
        Update: {
          created_at?: string | null
          default_value?: string | null
          description?: string | null
          display_order?: number | null
          entity_type?: string
          field_name?: string
          field_type?: string
          id?: string
          label?: string
          max_length?: number | null
          max_value?: number | null
          min_length?: number | null
          min_value?: number | null
          options?: Json | null
          required?: boolean | null
          show_in_filters?: boolean | null
          show_in_list?: boolean | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          validation_rule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_order_batches: {
        Row: {
          batch_number: number
          created_at: string | null
          distribution_order_id: string
          handed_over_at: string | null
          handed_over_by: string | null
          id: string
          received_at: string | null
          received_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          batch_number: number
          created_at?: string | null
          distribution_order_id: string
          handed_over_at?: string | null
          handed_over_by?: string | null
          id?: string
          received_at?: string | null
          received_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          batch_number?: number
          created_at?: string | null
          distribution_order_id?: string
          handed_over_at?: string | null
          handed_over_by?: string | null
          id?: string
          received_at?: string | null
          received_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_order_batches_distribution_order_id_fkey"
            columns: ["distribution_order_id"]
            isOneToOne: false
            referencedRelation: "distribution_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_order_batches_handed_over_by_fkey"
            columns: ["handed_over_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_order_batches_handed_over_by_fkey"
            columns: ["handed_over_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_order_batches_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_order_batches_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_order_items: {
        Row: {
          created_at: string | null
          distribution_order_room_id: string
          id: string
          item_id: string
          notes: string | null
          quantity: number
          quantity_confirmed: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          distribution_order_room_id: string
          id?: string
          item_id: string
          notes?: string | null
          quantity?: number
          quantity_confirmed?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          distribution_order_room_id?: string
          id?: string
          item_id?: string
          notes?: string | null
          quantity?: number
          quantity_confirmed?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_order_items_distribution_order_room_id_fkey"
            columns: ["distribution_order_room_id"]
            isOneToOne: false
            referencedRelation: "distribution_order_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_order_rooms: {
        Row: {
          batch_number: number | null
          booking_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          delivered_at: string | null
          delivered_by: string | null
          distribution_order_id: string
          exception_reason: string | null
          exception_type: string | null
          handover_at: string | null
          handover_to_order_id: string | null
          id: string
          notes: string | null
          rejection_reason: string | null
          returned_at: string | null
          room_id: string
          status: string
          stop_status: string | null
          updated_at: string | null
        }
        Insert: {
          batch_number?: number | null
          booking_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivered_by?: string | null
          distribution_order_id: string
          exception_reason?: string | null
          exception_type?: string | null
          handover_at?: string | null
          handover_to_order_id?: string | null
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          returned_at?: string | null
          room_id: string
          status?: string
          stop_status?: string | null
          updated_at?: string | null
        }
        Update: {
          batch_number?: number | null
          booking_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivered_by?: string | null
          distribution_order_id?: string
          exception_reason?: string | null
          exception_type?: string | null
          handover_at?: string | null
          handover_to_order_id?: string | null
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          returned_at?: string | null
          room_id?: string
          status?: string
          stop_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_order_rooms_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "room_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_order_rooms_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_order_rooms_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_order_rooms_delivered_by_fkey"
            columns: ["delivered_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_order_rooms_delivered_by_fkey"
            columns: ["delivered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_order_rooms_distribution_order_id_fkey"
            columns: ["distribution_order_id"]
            isOneToOne: false
            referencedRelation: "distribution_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_order_rooms_handover_to_order_id_fkey"
            columns: ["handover_to_order_id"]
            isOneToOne: false
            referencedRelation: "distribution_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_order_rooms_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_orders: {
        Row: {
          assigned_to: string | null
          batch_size: number | null
          completed_at: string | null
          created_at: string | null
          created_by: string
          floor: number | null
          hotel_id: string
          id: string
          notes: string | null
          order_code: string
          received_at: string | null
          received_by: string | null
          released_at: string | null
          released_by: string | null
          rooms_completed: number | null
          shift_code: string | null
          shift_date: string | null
          started_at: string | null
          status: string
          tenant_id: string
          total_items: number | null
          total_rooms: number | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          batch_size?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          floor?: number | null
          hotel_id: string
          id?: string
          notes?: string | null
          order_code: string
          received_at?: string | null
          received_by?: string | null
          released_at?: string | null
          released_by?: string | null
          rooms_completed?: number | null
          shift_code?: string | null
          shift_date?: string | null
          started_at?: string | null
          status?: string
          tenant_id: string
          total_items?: number | null
          total_rooms?: number | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          batch_size?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          floor?: number | null
          hotel_id?: string
          id?: string
          notes?: string | null
          order_code?: string
          received_at?: string | null
          received_by?: string | null
          released_at?: string | null
          released_by?: string | null
          rooms_completed?: number | null
          shift_code?: string | null
          shift_date?: string | null
          started_at?: string | null
          status?: string
          tenant_id?: string
          total_items?: number | null
          total_rooms?: number | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_orders_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "distribution_orders_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_orders_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_orders_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_orders_released_by_fkey"
            columns: ["released_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_orders_released_by_fkey"
            columns: ["released_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_orders_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "inventory_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          clicked_at: string | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          recipient_email: string
          recipient_name: string | null
          retry_count: number | null
          sent_at: string | null
          status: string
          subject: string
          template_id: string | null
          template_name: string | null
          tenant_id: string
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email: string
          recipient_name?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          subject: string
          template_id?: string | null
          template_name?: string | null
          tenant_id: string
        }
        Update: {
          clicked_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email?: string
          recipient_name?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          template_name?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_notifications: {
        Row: {
          body_html: string
          body_text: string | null
          created_at: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          metadata: Json | null
          notification_type: string
          retry_count: number | null
          sent_at: string | null
          status: string | null
          subject: string
          tenant_id: string | null
          to_email: string
          user_id: string | null
        }
        Insert: {
          body_html: string
          body_text?: string | null
          created_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          notification_type: string
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          subject: string
          tenant_id?: string | null
          to_email: string
          user_id?: string | null
        }
        Update: {
          body_html?: string
          body_text?: string | null
          created_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          notification_type?: string
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          tenant_id?: string | null
          to_email?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          attachments: Json | null
          available_variables: Json | null
          bcc: Json | null
          category: string
          cc: Json | null
          code: string
          created_at: string | null
          description: string | null
          from_email: string | null
          from_name: string | null
          html_body: string
          id: string
          is_system: boolean | null
          last_edited_at: string | null
          last_edited_by: string | null
          name: string
          reply_to: string | null
          status: string | null
          subject: string
          tenant_id: string
          text_body: string | null
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          available_variables?: Json | null
          bcc?: Json | null
          category: string
          cc?: Json | null
          code: string
          created_at?: string | null
          description?: string | null
          from_email?: string | null
          from_name?: string | null
          html_body: string
          id?: string
          is_system?: boolean | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          name: string
          reply_to?: string | null
          status?: string | null
          subject: string
          tenant_id: string
          text_body?: string | null
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          available_variables?: Json | null
          bcc?: Json | null
          category?: string
          cc?: Json | null
          code?: string
          created_at?: string | null
          description?: string | null
          from_email?: string | null
          from_name?: string | null
          html_body?: string
          id?: string
          is_system?: boolean | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          name?: string
          reply_to?: string | null
          status?: string | null
          subject?: string
          tenant_id?: string
          text_body?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          address: string | null
          city: string | null
          code: string
          country: string
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          inactive_at: string | null
          inactive_reason: string | null
          logo_url: string | null
          manager_email: string | null
          manager_id: string | null
          manager_name: string | null
          name: string
          phone: string | null
          postal_code: string | null
          settings: Json | null
          state: string | null
          status: string | null
          tenant_id: string
          total_floors: number | null
          total_rooms: number | null
          type: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          country?: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          inactive_at?: string | null
          inactive_reason?: string | null
          logo_url?: string | null
          manager_email?: string | null
          manager_id?: string | null
          manager_name?: string | null
          name: string
          phone?: string | null
          postal_code?: string | null
          settings?: Json | null
          state?: string | null
          status?: string | null
          tenant_id: string
          total_floors?: number | null
          total_rooms?: number | null
          type?: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          country?: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          inactive_at?: string | null
          inactive_reason?: string | null
          logo_url?: string | null
          manager_email?: string | null
          manager_id?: string | null
          manager_name?: string | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          settings?: Json | null
          state?: string | null
          status?: string | null
          tenant_id?: string
          total_floors?: number | null
          total_rooms?: number | null
          type?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotels_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotels_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      import_export_history: {
        Row: {
          completed_at: string | null
          created_at: string | null
          data_type: string
          duration_seconds: number | null
          error_message: string | null
          failed_count: number | null
          file_name: string | null
          filters: Json | null
          format: string | null
          id: string
          output_file_url: string | null
          skipped_count: number | null
          source_file_url: string | null
          started_at: string | null
          status: string
          success_count: number | null
          tenant_id: string
          total_rows: number | null
          type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          data_type: string
          duration_seconds?: number | null
          error_message?: string | null
          failed_count?: number | null
          file_name?: string | null
          filters?: Json | null
          format?: string | null
          id?: string
          output_file_url?: string | null
          skipped_count?: number | null
          source_file_url?: string | null
          started_at?: string | null
          status?: string
          success_count?: number | null
          tenant_id: string
          total_rows?: number | null
          type: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          data_type?: string
          duration_seconds?: number | null
          error_message?: string | null
          failed_count?: number | null
          file_name?: string | null
          filters?: Json | null
          format?: string | null
          id?: string
          output_file_url?: string | null
          skipped_count?: number | null
          source_file_url?: string | null
          started_at?: string | null
          status?: string
          success_count?: number | null
          tenant_id?: string
          total_rows?: number | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_export_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_export_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_export_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      in_app_notifications: {
        Row: {
          action_url: string | null
          body: string
          created_at: string | null
          icon: string | null
          id: string
          is_read: boolean | null
          metadata: Json | null
          read_at: string | null
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          read_at?: string | null
          tenant_id: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          read_at?: string | null
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "in_app_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "in_app_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "in_app_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          approved_by: string | null
          created_at: string | null
          created_by: string
          documents: string[] | null
          from_location: string | null
          hotel_id: string
          id: string
          item_id: string
          notes: string | null
          photos: string[] | null
          quantity: number
          quantity_after: number
          quantity_before: number
          related_id: string | null
          related_type: string | null
          tenant_id: string
          to_location: string | null
          total_value: number | null
          transaction_category: string | null
          transaction_code: string
          transaction_date: string | null
          transaction_type: string
          unit_price: number | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          created_by: string
          documents?: string[] | null
          from_location?: string | null
          hotel_id: string
          id?: string
          item_id: string
          notes?: string | null
          photos?: string[] | null
          quantity: number
          quantity_after: number
          quantity_before: number
          related_id?: string | null
          related_type?: string | null
          tenant_id: string
          to_location?: string | null
          total_value?: number | null
          transaction_category?: string | null
          transaction_code: string
          transaction_date?: string | null
          transaction_type: string
          unit_price?: number | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string
          documents?: string[] | null
          from_location?: string | null
          hotel_id?: string
          id?: string
          item_id?: string
          notes?: string | null
          photos?: string[] | null
          quantity?: number
          quantity_after?: number
          quantity_before?: number
          related_id?: string | null
          related_type?: string | null
          tenant_id?: string
          to_location?: string | null
          total_value?: number | null
          transaction_category?: string | null
          transaction_code?: string
          transaction_date?: string | null
          transaction_type?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "inventory_transactions_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          created_by: string | null
          discount_amount: number
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          items: Json | null
          notes: string | null
          paid_at: string | null
          period_end: string
          period_start: string
          status: string
          subscription_plan_id: string | null
          subtotal: number
          tax_amount: number
          tenant_id: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number
          due_date: string
          id?: string
          invoice_date?: string
          invoice_number: string
          items?: Json | null
          notes?: string | null
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: string
          subscription_plan_id?: string | null
          subtotal?: number
          tax_amount?: number
          tenant_id: string
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          items?: Json | null
          notes?: string | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: string
          subscription_plan_id?: string | null
          subtotal?: number
          tax_amount?: number
          tenant_id?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      item_categories: {
        Row: {
          code: string | null
          color: string | null
          created_at: string | null
          depreciable: boolean | null
          depreciation_rate: number | null
          description: string | null
          hotel_id: string | null
          icon: string | null
          id: string
          is_launderable: boolean | null
          level: number | null
          max_stock_level: number | null
          min_stock_level: number | null
          name: string
          name_en: string | null
          parent_id: string | null
          preferred_vendor_id: string | null
          reorder_point: number | null
          require_inspection: boolean | null
          sort_order: number | null
          status: string | null
          tenant_id: string
          track_serial_numbers: boolean | null
          updated_at: string | null
          useful_life_months: number | null
        }
        Insert: {
          code?: string | null
          color?: string | null
          created_at?: string | null
          depreciable?: boolean | null
          depreciation_rate?: number | null
          description?: string | null
          hotel_id?: string | null
          icon?: string | null
          id?: string
          is_launderable?: boolean | null
          level?: number | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name: string
          name_en?: string | null
          parent_id?: string | null
          preferred_vendor_id?: string | null
          reorder_point?: number | null
          require_inspection?: boolean | null
          sort_order?: number | null
          status?: string | null
          tenant_id: string
          track_serial_numbers?: boolean | null
          updated_at?: string | null
          useful_life_months?: number | null
        }
        Update: {
          code?: string | null
          color?: string | null
          created_at?: string | null
          depreciable?: boolean | null
          depreciation_rate?: number | null
          description?: string | null
          hotel_id?: string | null
          icon?: string | null
          id?: string
          is_launderable?: boolean | null
          level?: number | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name?: string
          name_en?: string | null
          parent_id?: string | null
          preferred_vendor_id?: string | null
          reorder_point?: number | null
          require_inspection?: boolean | null
          sort_order?: number | null
          status?: string | null
          tenant_id?: string
          track_serial_numbers?: boolean | null
          updated_at?: string | null
          useful_life_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "item_categories_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "item_categories_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_categories_preferred_vendor_id_fkey"
            columns: ["preferred_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      item_images: {
        Row: {
          created_at: string | null
          created_by: string | null
          display_order: number | null
          file_name: string | null
          file_size: number | null
          id: string
          is_primary: boolean | null
          item_id: string
          mime_type: string | null
          tenant_id: string
          url: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_primary?: boolean | null
          item_id: string
          mime_type?: string | null
          tenant_id: string
          url: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_primary?: boolean | null
          item_id?: string
          mime_type?: string | null
          tenant_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_images_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_images_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_images_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_images_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      item_units: {
        Row: {
          base_unit_id: string | null
          code: string
          conversion_factor: number | null
          created_at: string | null
          id: string
          name: string
          status: string | null
          symbol: string | null
          tenant_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          base_unit_id?: string | null
          code: string
          conversion_factor?: number | null
          created_at?: string | null
          id?: string
          name: string
          status?: string | null
          symbol?: string | null
          tenant_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          base_unit_id?: string | null
          code?: string
          conversion_factor?: number | null
          created_at?: string | null
          id?: string
          name?: string
          status?: string | null
          symbol?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_units_base_unit_id_fkey"
            columns: ["base_unit_id"]
            isOneToOne: false
            referencedRelation: "item_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          brand: string | null
          category_id: string | null
          code: string
          created_at: string | null
          current_wash_cycles: number | null
          description: string | null
          expected_lifetime_days: number | null
          hotel_id: string
          id: string
          item_type: Database["public"]["Enums"]["item_type"]
          max_wash_cycles: number | null
          minimum_stock: number | null
          model: string | null
          name: string
          name_en: string | null
          qr_code: string | null
          quantity_damaged: number | null
          quantity_in_laundry: number | null
          quantity_in_stock: number | null
          quantity_in_use: number | null
          quantity_lost: number | null
          quantity_pending: number | null
          quantity_total: number | null
          reorder_point: number | null
          specifications: Json | null
          status: string | null
          tenant_id: string
          unit: string
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          category_id?: string | null
          code: string
          created_at?: string | null
          current_wash_cycles?: number | null
          description?: string | null
          expected_lifetime_days?: number | null
          hotel_id: string
          id?: string
          item_type?: Database["public"]["Enums"]["item_type"]
          max_wash_cycles?: number | null
          minimum_stock?: number | null
          model?: string | null
          name: string
          name_en?: string | null
          qr_code?: string | null
          quantity_damaged?: number | null
          quantity_in_laundry?: number | null
          quantity_in_stock?: number | null
          quantity_in_use?: number | null
          quantity_lost?: number | null
          quantity_pending?: number | null
          quantity_total?: number | null
          reorder_point?: number | null
          specifications?: Json | null
          status?: string | null
          tenant_id: string
          unit?: string
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          category_id?: string | null
          code?: string
          created_at?: string | null
          current_wash_cycles?: number | null
          description?: string | null
          expected_lifetime_days?: number | null
          hotel_id?: string
          id?: string
          item_type?: Database["public"]["Enums"]["item_type"]
          max_wash_cycles?: number | null
          minimum_stock?: number | null
          model?: string | null
          name?: string
          name_en?: string | null
          qr_code?: string | null
          quantity_damaged?: number | null
          quantity_in_laundry?: number | null
          quantity_in_stock?: number | null
          quantity_in_use?: number | null
          quantity_lost?: number | null
          quantity_pending?: number | null
          quantity_total?: number | null
          reorder_point?: number | null
          specifications?: Json | null
          status?: string | null
          tenant_id?: string
          unit?: string
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "items_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      laundry_batch_items: {
        Row: {
          batch_id: string
          condition_note: string | null
          created_at: string | null
          id: string
          item_id: string
          quantity_damaged: number | null
          quantity_delivered: number
          quantity_lost: number | null
          quantity_returned: number | null
          return_condition: string | null
          weight_kg: number | null
        }
        Insert: {
          batch_id: string
          condition_note?: string | null
          created_at?: string | null
          id?: string
          item_id: string
          quantity_damaged?: number | null
          quantity_delivered: number
          quantity_lost?: number | null
          quantity_returned?: number | null
          return_condition?: string | null
          weight_kg?: number | null
        }
        Update: {
          batch_id?: string
          condition_note?: string | null
          created_at?: string | null
          id?: string
          item_id?: string
          quantity_damaged?: number | null
          quantity_delivered?: number
          quantity_lost?: number | null
          quantity_returned?: number | null
          return_condition?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "laundry_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "laundry_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laundry_batch_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      laundry_batches: {
        Row: {
          actual_cost: number | null
          actual_return_date: string | null
          batch_code: string
          compensation_amount: number | null
          created_at: string | null
          delivery_date: string
          delivery_person_name: string | null
          delivery_photos: string[] | null
          delivery_staff_id: string | null
          estimated_cost: number | null
          expected_return_date: string | null
          hotel_id: string
          id: string
          items_damaged: number | null
          items_lost: number | null
          notes: string | null
          quality_rating: number | null
          receiver_name: string | null
          return_notes: string | null
          return_photos: string[] | null
          return_staff_id: string | null
          status: string | null
          tenant_id: string
          timeliness_rating: number | null
          total_items: number
          total_weight_kg: number
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          actual_cost?: number | null
          actual_return_date?: string | null
          batch_code: string
          compensation_amount?: number | null
          created_at?: string | null
          delivery_date: string
          delivery_person_name?: string | null
          delivery_photos?: string[] | null
          delivery_staff_id?: string | null
          estimated_cost?: number | null
          expected_return_date?: string | null
          hotel_id: string
          id?: string
          items_damaged?: number | null
          items_lost?: number | null
          notes?: string | null
          quality_rating?: number | null
          receiver_name?: string | null
          return_notes?: string | null
          return_photos?: string[] | null
          return_staff_id?: string | null
          status?: string | null
          tenant_id: string
          timeliness_rating?: number | null
          total_items: number
          total_weight_kg: number
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          actual_cost?: number | null
          actual_return_date?: string | null
          batch_code?: string
          compensation_amount?: number | null
          created_at?: string | null
          delivery_date?: string
          delivery_person_name?: string | null
          delivery_photos?: string[] | null
          delivery_staff_id?: string | null
          estimated_cost?: number | null
          expected_return_date?: string | null
          hotel_id?: string
          id?: string
          items_damaged?: number | null
          items_lost?: number | null
          notes?: string | null
          quality_rating?: number | null
          receiver_name?: string | null
          return_notes?: string | null
          return_photos?: string[] | null
          return_staff_id?: string | null
          status?: string | null
          tenant_id?: string
          timeliness_rating?: number | null
          total_items?: number
          total_weight_kg?: number
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "laundry_batches_delivery_staff_id_fkey"
            columns: ["delivery_staff_id"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laundry_batches_delivery_staff_id_fkey"
            columns: ["delivery_staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laundry_batches_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "laundry_batches_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laundry_batches_return_staff_id_fkey"
            columns: ["return_staff_id"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laundry_batches_return_staff_id_fkey"
            columns: ["return_staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laundry_batches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laundry_batches_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "laundry_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      laundry_categories: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          display_order: number | null
          express_surcharge: number | null
          express_turnaround_hours: number | null
          id: string
          name: string
          price_per_item: number | null
          price_per_kg: number | null
          require_count_verification: boolean | null
          require_weight_verification: boolean | null
          standard_turnaround_hours: number | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          express_surcharge?: number | null
          express_turnaround_hours?: number | null
          id?: string
          name: string
          price_per_item?: number | null
          price_per_kg?: number | null
          require_count_verification?: boolean | null
          require_weight_verification?: boolean | null
          standard_turnaround_hours?: number | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          express_surcharge?: number | null
          express_turnaround_hours?: number | null
          id?: string
          name?: string
          price_per_item?: number | null
          price_per_kg?: number | null
          require_count_verification?: boolean | null
          require_weight_verification?: boolean | null
          standard_turnaround_hours?: number | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "laundry_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      laundry_vendors: {
        Row: {
          address: string | null
          code: string
          contact_person: string | null
          contract_info: Json | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          rating: number | null
          status: string | null
          tenant_id: string
          total_orders: number | null
          total_value: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code: string
          contact_person?: string | null
          contract_info?: Json | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          status?: string | null
          tenant_id: string
          total_orders?: number | null
          total_value?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          contact_person?: string | null
          contract_info?: Json | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          status?: string | null
          tenant_id?: string
          total_orders?: number | null
          total_value?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "laundry_vendors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_categories: {
        Row: {
          checklist_items: string[] | null
          code: string
          color: string | null
          created_at: string | null
          default_assignee_id: string | null
          default_priority: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          name: string
          require_approval: boolean | null
          require_photos: boolean | null
          sla_hours: number | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          checklist_items?: string[] | null
          code: string
          color?: string | null
          created_at?: string | null
          default_assignee_id?: string | null
          default_priority?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name: string
          require_approval?: boolean | null
          require_photos?: boolean | null
          sla_hours?: number | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          checklist_items?: string[] | null
          code?: string
          color?: string | null
          created_at?: string | null
          default_assignee_id?: string | null
          default_priority?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name?: string
          require_approval?: boolean | null
          require_photos?: boolean | null
          sla_hours?: number | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_categories_default_assignee_id_fkey"
            columns: ["default_assignee_id"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_categories_default_assignee_id_fkey"
            columns: ["default_assignee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          accepted_at: string | null
          actual_cost: number | null
          completed_at: string | null
          completion_notes: string | null
          completion_photos: string[] | null
          created_at: string | null
          description: string
          documents: string[] | null
          estimated_cost: number | null
          expected_completion_date: string | null
          hotel_id: string
          id: string
          issue_type: string
          item_id: string | null
          location: string
          notes: string | null
          parts_used: string[] | null
          photos: string[] | null
          priority: string | null
          reported_at: string | null
          reported_by: string
          request_code: string
          room_id: string | null
          solution: string | null
          started_at: string | null
          status: string | null
          tenant_id: string
          title: string
          under_warranty: boolean | null
          updated_at: string | null
          warranty_info: string | null
        }
        Insert: {
          accepted_at?: string | null
          actual_cost?: number | null
          completed_at?: string | null
          completion_notes?: string | null
          completion_photos?: string[] | null
          created_at?: string | null
          description: string
          documents?: string[] | null
          estimated_cost?: number | null
          expected_completion_date?: string | null
          hotel_id: string
          id?: string
          issue_type: string
          item_id?: string | null
          location: string
          notes?: string | null
          parts_used?: string[] | null
          photos?: string[] | null
          priority?: string | null
          reported_at?: string | null
          reported_by: string
          request_code: string
          room_id?: string | null
          solution?: string | null
          started_at?: string | null
          status?: string | null
          tenant_id: string
          title: string
          under_warranty?: boolean | null
          updated_at?: string | null
          warranty_info?: string | null
        }
        Update: {
          accepted_at?: string | null
          actual_cost?: number | null
          completed_at?: string | null
          completion_notes?: string | null
          completion_photos?: string[] | null
          created_at?: string | null
          description?: string
          documents?: string[] | null
          estimated_cost?: number | null
          expected_completion_date?: string | null
          hotel_id?: string
          id?: string
          issue_type?: string
          item_id?: string | null
          location?: string
          notes?: string | null
          parts_used?: string[] | null
          photos?: string[] | null
          priority?: string | null
          reported_at?: string | null
          reported_by?: string
          request_code?: string
          room_id?: string | null
          solution?: string | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string
          title?: string
          under_warranty?: boolean | null
          updated_at?: string | null
          warranty_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "maintenance_requests_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          banner_text: string | null
          campaign_type: string
          clicks: number | null
          conversions: number | null
          created_at: string | null
          created_by: string | null
          cta_link: string | null
          cta_text: string | null
          description: string | null
          email_subject: string | null
          email_template: string | null
          emails_opened: number | null
          emails_sent: number | null
          ends_at: string | null
          id: string
          name: string
          promotional_code_id: string | null
          starts_at: string
          status: string | null
          target_audience: string | null
          target_plan_codes: string[] | null
          updated_at: string | null
        }
        Insert: {
          banner_text?: string | null
          campaign_type: string
          clicks?: number | null
          conversions?: number | null
          created_at?: string | null
          created_by?: string | null
          cta_link?: string | null
          cta_text?: string | null
          description?: string | null
          email_subject?: string | null
          email_template?: string | null
          emails_opened?: number | null
          emails_sent?: number | null
          ends_at?: string | null
          id?: string
          name: string
          promotional_code_id?: string | null
          starts_at: string
          status?: string | null
          target_audience?: string | null
          target_plan_codes?: string[] | null
          updated_at?: string | null
        }
        Update: {
          banner_text?: string | null
          campaign_type?: string
          clicks?: number | null
          conversions?: number | null
          created_at?: string | null
          created_by?: string | null
          cta_link?: string | null
          cta_text?: string | null
          description?: string | null
          email_subject?: string | null
          email_template?: string | null
          emails_opened?: number | null
          emails_sent?: number | null
          ends_at?: string | null
          id?: string
          name?: string
          promotional_code_id?: string | null
          starts_at?: string
          status?: string | null
          target_audience?: string | null
          target_plan_codes?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_promotional_code_id_fkey"
            columns: ["promotional_code_id"]
            isOneToOne: false
            referencedRelation: "promotional_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          critical_stock_threshold: number | null
          daily_report_time: string | null
          email_daily_report: boolean | null
          email_laundry_completed: boolean | null
          email_low_stock: boolean | null
          email_maintenance_new: boolean | null
          email_po_approved: boolean | null
          email_weekly_report: boolean | null
          id: string
          inapp_approval_request: boolean | null
          inapp_laundry_completed: boolean | null
          inapp_low_stock: boolean | null
          inapp_maintenance_new: boolean | null
          inapp_realtime: boolean | null
          inapp_task_assigned: boolean | null
          laundry_delay_hours: number | null
          low_stock_threshold: number | null
          overdue_maintenance_days: number | null
          push_enabled: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
          weekly_report_day: number | null
        }
        Insert: {
          created_at?: string | null
          critical_stock_threshold?: number | null
          daily_report_time?: string | null
          email_daily_report?: boolean | null
          email_laundry_completed?: boolean | null
          email_low_stock?: boolean | null
          email_maintenance_new?: boolean | null
          email_po_approved?: boolean | null
          email_weekly_report?: boolean | null
          id?: string
          inapp_approval_request?: boolean | null
          inapp_laundry_completed?: boolean | null
          inapp_low_stock?: boolean | null
          inapp_maintenance_new?: boolean | null
          inapp_realtime?: boolean | null
          inapp_task_assigned?: boolean | null
          laundry_delay_hours?: number | null
          low_stock_threshold?: number | null
          overdue_maintenance_days?: number | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
          weekly_report_day?: number | null
        }
        Update: {
          created_at?: string | null
          critical_stock_threshold?: number | null
          daily_report_time?: string | null
          email_daily_report?: boolean | null
          email_laundry_completed?: boolean | null
          email_low_stock?: boolean | null
          email_maintenance_new?: boolean | null
          email_po_approved?: boolean | null
          email_weekly_report?: boolean | null
          id?: string
          inapp_approval_request?: boolean | null
          inapp_laundry_completed?: boolean | null
          inapp_low_stock?: boolean | null
          inapp_maintenance_new?: boolean | null
          inapp_realtime?: boolean | null
          inapp_task_assigned?: boolean | null
          laundry_delay_hours?: number | null
          low_stock_threshold?: number | null
          overdue_maintenance_days?: number | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
          weekly_report_day?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          category: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          related_id: string | null
          related_type: string | null
          role: string | null
          tenant_id: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          category: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          role?: string | null
          tenant_id: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          category?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          role?: string | null
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_otps: {
        Row: {
          attempts: number
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_hash: string
          used: boolean
        }
        Insert: {
          attempts?: number
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_hash: string
          used?: boolean
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_hash?: string
          used?: boolean
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          billing_address: Json | null
          billing_email: string | null
          billing_name: string | null
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last4: string | null
          created_at: string | null
          gateway: string
          gateway_payment_method_id: string
          id: string
          is_default: boolean | null
          is_verified: boolean | null
          tenant_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          billing_address?: Json | null
          billing_email?: string | null
          billing_name?: string | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          gateway: string
          gateway_payment_method_id: string
          id?: string
          is_default?: boolean | null
          is_verified?: boolean | null
          tenant_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          billing_address?: Json | null
          billing_email?: string | null
          billing_name?: string | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          gateway?: string
          gateway_payment_method_id?: string
          id?: string
          is_default?: boolean | null
          is_verified?: boolean | null
          tenant_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          billing_cycle: string | null
          created_at: string | null
          currency: string
          gateway_transaction_id: string | null
          id: string
          invoice_id: string | null
          metadata: Json | null
          notes: string | null
          payment_date: string | null
          payment_gateway: string | null
          payment_method: string | null
          payment_status: string
          plan_id: string | null
          tenant_id: string
          transaction_reference: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          billing_cycle?: string | null
          created_at?: string | null
          currency?: string
          gateway_transaction_id?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          notes?: string | null
          payment_date?: string | null
          payment_gateway?: string | null
          payment_method?: string | null
          payment_status?: string
          plan_id?: string | null
          tenant_id: string
          transaction_reference?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          billing_cycle?: string | null
          created_at?: string | null
          currency?: string
          gateway_transaction_id?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          notes?: string | null
          payment_date?: string | null
          payment_gateway?: string | null
          payment_method?: string | null
          payment_status?: string
          plan_id?: string | null
          tenant_id?: string
          transaction_reference?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_payment_invoice"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_webhook_logs: {
        Row: {
          created_at: string | null
          error: string | null
          event_id: string | null
          event_type: string
          gateway: string
          id: string
          payload: Json
          processed: boolean | null
          processed_at: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          event_id?: string | null
          event_type: string
          gateway: string
          id?: string
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          event_id?: string | null
          event_type?: string
          gateway?: string
          id?: string
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
        }
        Relationships: []
      }
      pending_group_links: {
        Row: {
          added_by: string
          chat_id: string | null
          created_at: string | null
          department: string | null
          expires_at: string | null
          group_type: string | null
          hotel_id: string | null
          id: string
          notification_types: string[] | null
          status: string | null
          telegram_user_id: string
          tenant_id: string
        }
        Insert: {
          added_by: string
          chat_id?: string | null
          created_at?: string | null
          department?: string | null
          expires_at?: string | null
          group_type?: string | null
          hotel_id?: string | null
          id?: string
          notification_types?: string[] | null
          status?: string | null
          telegram_user_id: string
          tenant_id: string
        }
        Update: {
          added_by?: string
          chat_id?: string | null
          created_at?: string | null
          department?: string | null
          expires_at?: string | null
          group_type?: string | null
          hotel_id?: string | null
          id?: string
          notification_types?: string[] | null
          status?: string | null
          telegram_user_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_group_links_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "pending_group_links_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_group_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          code: string
          created_at: string | null
          description: string | null
          id: string
          module: string
          name: string
          updated_at: string | null
        }
        Insert: {
          action: string
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          module: string
          name: string
          updated_at?: string | null
        }
        Update: {
          action?: string
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      plan_price_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_price_monthly: number | null
          new_price_yearly: number | null
          old_price_monthly: number | null
          old_price_yearly: number | null
          plan_id: string
          reason: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_price_monthly?: number | null
          new_price_yearly?: number | null
          old_price_monthly?: number | null
          old_price_yearly?: number | null
          plan_id: string
          reason?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_price_monthly?: number | null
          new_price_yearly?: number | null
          old_price_monthly?: number | null
          old_price_yearly?: number | null
          plan_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_price_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_price_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_price_history_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          code: string
          created_at: string | null
          department: string | null
          description: string | null
          display_order: number | null
          id: string
          name: string
          status: string | null
          tenant_id: string
          updated_at: string | null
          user_level_code: string
        }
        Insert: {
          code: string
          created_at?: string | null
          department?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          user_level_code: string
        }
        Update: {
          code?: string
          created_at?: string | null
          department?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_level_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_code_usage: {
        Row: {
          discount_applied: number
          final_amount: number
          id: string
          original_amount: number
          payment_transaction_id: string | null
          promo_code_id: string
          tenant_id: string
          used_at: string | null
        }
        Insert: {
          discount_applied: number
          final_amount: number
          id?: string
          original_amount: number
          payment_transaction_id?: string | null
          promo_code_id: string
          tenant_id: string
          used_at?: string | null
        }
        Update: {
          discount_applied?: number
          final_amount?: number
          id?: string
          original_amount?: number
          payment_transaction_id?: string | null
          promo_code_id?: string
          tenant_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_usage_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promotional_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      promotional_codes: {
        Row: {
          applicable_billing_cycles: string[] | null
          applicable_plans: string[] | null
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          max_uses_per_tenant: number | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_billing_cycles?: string[] | null
          applicable_plans?: string[] | null
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_tenant?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_billing_cycles?: string[] | null
          applicable_plans?: string[] | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_tenant?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotional_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotional_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          notes: string | null
          po_id: string
          quantity_ordered: number
          quantity_received: number | null
          total_price: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          notes?: string | null
          po_id: string
          quantity_ordered: number
          quantity_received?: number | null
          total_price?: number | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          po_id?: string
          quantity_ordered?: number
          quantity_received?: number | null
          total_price?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          actual_delivery_date: string | null
          approved_by: string | null
          created_at: string | null
          expected_delivery_date: string | null
          hotel_id: string
          id: string
          notes: string | null
          order_date: string
          po_code: string
          requested_by: string
          shipping_address: string | null
          shipping_fee: number | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          tenant_id: string
          total_amount: number | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          actual_delivery_date?: string | null
          approved_by?: string | null
          created_at?: string | null
          expected_delivery_date?: string | null
          hotel_id: string
          id?: string
          notes?: string | null
          order_date?: string
          po_code: string
          requested_by: string
          shipping_address?: string | null
          shipping_fee?: number | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tenant_id: string
          total_amount?: number | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          actual_delivery_date?: string | null
          approved_by?: string | null
          created_at?: string | null
          expected_delivery_date?: string | null
          hotel_id?: string
          id?: string
          notes?: string | null
          order_date?: string
          po_code?: string
          requested_by?: string
          shipping_address?: string | null
          shipping_fee?: number | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tenant_id?: string
          total_amount?: number | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "purchase_orders_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          device_name: string | null
          endpoint: string
          failed_count: number | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          p256dh_key: string
          tenant_id: string
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          device_name?: string | null
          endpoint: string
          failed_count?: number | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          p256dh_key: string
          tenant_id: string
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          device_name?: string | null
          endpoint?: string
          failed_count?: number | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          p256dh_key?: string
          tenant_id?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_reminders: {
        Row: {
          created_at: string | null
          email_body: string | null
          email_subject: string | null
          error_message: string | null
          id: string
          reminder_type: string
          scheduled_for: string
          sent_at: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          email_body?: string | null
          email_subject?: string | null
          error_message?: string | null
          id?: string
          reminder_type: string
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          email_body?: string | null
          email_subject?: string | null
          error_message?: string | null
          id?: string
          reminder_type?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          hierarchy_level: number
          id: string
          is_system: boolean | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          hierarchy_level?: number
          id?: string
          is_system?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          hierarchy_level?: number
          id?: string
          is_system?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      room_bookings: {
        Row: {
          actual_check_in: string | null
          actual_check_out: string | null
          amount_paid: number | null
          booking_group_id: string | null
          booking_reference: string | null
          booking_source: string | null
          check_in_date: string
          check_out_date: string
          created_at: string | null
          created_by: string | null
          deposit_amount: number | null
          early_checkin_charge: number | null
          expected_check_in_time: string | null
          expected_check_out_time: string | null
          extra_charges: number | null
          guest_count: number | null
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          hotel_id: string
          id: string
          late_checkout_charge: number | null
          net_revenue: number | null
          notes: string | null
          ota_commission_amount: number | null
          ota_commission_rate: number | null
          ota_paid_amount: number | null
          ota_payment_type: string | null
          paid_at: string | null
          payment_status: string | null
          room_id: string
          room_price: number | null
          service_charges: number | null
          service_fee_amount: number | null
          service_fee_rate: number | null
          status: string
          subtotal: number | null
          tenant_id: string
          total_amount: number | null
          updated_at: string | null
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          actual_check_in?: string | null
          actual_check_out?: string | null
          amount_paid?: number | null
          booking_group_id?: string | null
          booking_reference?: string | null
          booking_source?: string | null
          check_in_date: string
          check_out_date: string
          created_at?: string | null
          created_by?: string | null
          deposit_amount?: number | null
          early_checkin_charge?: number | null
          expected_check_in_time?: string | null
          expected_check_out_time?: string | null
          extra_charges?: number | null
          guest_count?: number | null
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          hotel_id: string
          id?: string
          late_checkout_charge?: number | null
          net_revenue?: number | null
          notes?: string | null
          ota_commission_amount?: number | null
          ota_commission_rate?: number | null
          ota_paid_amount?: number | null
          ota_payment_type?: string | null
          paid_at?: string | null
          payment_status?: string | null
          room_id: string
          room_price?: number | null
          service_charges?: number | null
          service_fee_amount?: number | null
          service_fee_rate?: number | null
          status?: string
          subtotal?: number | null
          tenant_id: string
          total_amount?: number | null
          updated_at?: string | null
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          actual_check_in?: string | null
          actual_check_out?: string | null
          amount_paid?: number | null
          booking_group_id?: string | null
          booking_reference?: string | null
          booking_source?: string | null
          check_in_date?: string
          check_out_date?: string
          created_at?: string | null
          created_by?: string | null
          deposit_amount?: number | null
          early_checkin_charge?: number | null
          expected_check_in_time?: string | null
          expected_check_out_time?: string | null
          extra_charges?: number | null
          guest_count?: number | null
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          hotel_id?: string
          id?: string
          late_checkout_charge?: number | null
          net_revenue?: number | null
          notes?: string | null
          ota_commission_amount?: number | null
          ota_commission_rate?: number | null
          ota_paid_amount?: number | null
          ota_payment_type?: string | null
          paid_at?: string | null
          payment_status?: string | null
          room_id?: string
          room_price?: number | null
          service_charges?: number | null
          service_fee_amount?: number | null
          service_fee_rate?: number | null
          status?: string
          subtotal?: number | null
          tenant_id?: string
          total_amount?: number | null
          updated_at?: string | null
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "room_bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_bookings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "room_bookings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      room_check_sessions: {
        Row: {
          check_type: string
          id: string
          room_id: string
          started_at: string
          tenant_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          check_type: string
          id?: string
          room_id: string
          started_at?: string
          tenant_id: string
          user_id: string
          user_name: string
        }
        Update: {
          check_type?: string
          id?: string
          room_id?: string
          started_at?: string
          tenant_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_check_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_check_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      room_checks: {
        Row: {
          check_type: string
          checked_at: string | null
          checked_by: string
          cleanliness_score: number | null
          id: string
          items_complete: boolean | null
          items_consumed: Json | null
          items_damaged: Json | null
          items_lost: Json | null
          items_missing: Json | null
          items_replaced: Json | null
          items_sent_to_laundry: Json | null
          notes: string | null
          photos: string[] | null
          room_id: string
        }
        Insert: {
          check_type: string
          checked_at?: string | null
          checked_by: string
          cleanliness_score?: number | null
          id?: string
          items_complete?: boolean | null
          items_consumed?: Json | null
          items_damaged?: Json | null
          items_lost?: Json | null
          items_missing?: Json | null
          items_replaced?: Json | null
          items_sent_to_laundry?: Json | null
          notes?: string | null
          photos?: string[] | null
          room_id: string
        }
        Update: {
          check_type?: string
          checked_at?: string | null
          checked_by?: string
          cleanliness_score?: number | null
          id?: string
          items_complete?: boolean | null
          items_consumed?: Json | null
          items_damaged?: Json | null
          items_lost?: Json | null
          items_missing?: Json | null
          items_replaced?: Json | null
          items_sent_to_laundry?: Json | null
          notes?: string | null
          photos?: string[] | null
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_checks_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_checks_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_checks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_items: {
        Row: {
          assigned_at: string | null
          condition: string | null
          id: string
          is_verified: boolean | null
          item_id: string
          last_checked_at: string | null
          last_checked_by: string | null
          notes: string | null
          quantity: number
          room_id: string
          standard_quantity: number | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          assigned_at?: string | null
          condition?: string | null
          id?: string
          is_verified?: boolean | null
          item_id: string
          last_checked_at?: string | null
          last_checked_by?: string | null
          notes?: string | null
          quantity?: number
          room_id: string
          standard_quantity?: number | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          assigned_at?: string | null
          condition?: string | null
          id?: string
          is_verified?: boolean | null
          item_id?: string
          last_checked_at?: string | null
          last_checked_by?: string | null
          notes?: string | null
          quantity?: number
          room_id?: string
          standard_quantity?: number | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_items_last_checked_by_fkey"
            columns: ["last_checked_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_items_last_checked_by_fkey"
            columns: ["last_checked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_items_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_pricing_rules: {
        Row: {
          created_at: string | null
          default_service_fee_rate: number | null
          default_vat_rate: number | null
          early_checkin_5_9: number | null
          early_checkin_9_14: number | null
          early_checkin_before_5: number | null
          high_season_surcharge: number | null
          hotel_id: string | null
          id: string
          late_checkout_12_15: number | null
          late_checkout_15_18: number | null
          late_checkout_after_18: number | null
          standard_checkin_time: string | null
          standard_checkout_time: string | null
          tenant_id: string
          updated_at: string | null
          weekend_surcharge: number | null
        }
        Insert: {
          created_at?: string | null
          default_service_fee_rate?: number | null
          default_vat_rate?: number | null
          early_checkin_5_9?: number | null
          early_checkin_9_14?: number | null
          early_checkin_before_5?: number | null
          high_season_surcharge?: number | null
          hotel_id?: string | null
          id?: string
          late_checkout_12_15?: number | null
          late_checkout_15_18?: number | null
          late_checkout_after_18?: number | null
          standard_checkin_time?: string | null
          standard_checkout_time?: string | null
          tenant_id: string
          updated_at?: string | null
          weekend_surcharge?: number | null
        }
        Update: {
          created_at?: string | null
          default_service_fee_rate?: number | null
          default_vat_rate?: number | null
          early_checkin_5_9?: number | null
          early_checkin_9_14?: number | null
          early_checkin_before_5?: number | null
          high_season_surcharge?: number | null
          hotel_id?: string | null
          id?: string
          late_checkout_12_15?: number | null
          late_checkout_15_18?: number | null
          late_checkout_after_18?: number | null
          standard_checkin_time?: string | null
          standard_checkout_time?: string | null
          tenant_id?: string
          updated_at?: string | null
          weekend_surcharge?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "room_pricing_rules_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "room_pricing_rules_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_pricing_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      room_type_standards: {
        Row: {
          created_at: string | null
          hotel_id: string
          id: string
          item_id: string
          quantity: number
          room_type: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          hotel_id: string
          id?: string
          item_id: string
          quantity?: number
          room_type: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          hotel_id?: string
          id?: string
          item_id?: string
          quantity?: number
          room_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_type_standards_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "room_type_standards_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_type_standards_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_type_standards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      room_types: {
        Row: {
          base_price: number | null
          bed_type: string | null
          beds_count: number | null
          code: string
          color: string | null
          created_at: string | null
          default_items: Json | null
          description: string | null
          display_order: number | null
          has_balcony: boolean | null
          has_bathtub: boolean | null
          has_kitchen: boolean | null
          hotel_id: string | null
          icon: string | null
          id: string
          max_guests: number | null
          name: string
          square_meters: number | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          base_price?: number | null
          bed_type?: string | null
          beds_count?: number | null
          code: string
          color?: string | null
          created_at?: string | null
          default_items?: Json | null
          description?: string | null
          display_order?: number | null
          has_balcony?: boolean | null
          has_bathtub?: boolean | null
          has_kitchen?: boolean | null
          hotel_id?: string | null
          icon?: string | null
          id?: string
          max_guests?: number | null
          name: string
          square_meters?: number | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number | null
          bed_type?: string | null
          beds_count?: number | null
          code?: string
          color?: string | null
          created_at?: string | null
          default_items?: Json | null
          description?: string | null
          display_order?: number | null
          has_balcony?: boolean | null
          has_bathtub?: boolean | null
          has_kitchen?: boolean | null
          hotel_id?: string | null
          icon?: string | null
          id?: string
          max_guests?: number | null
          name?: string
          square_meters?: number | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_types_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "room_types_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          amenities: string[] | null
          area_sqm: number | null
          base_price: number | null
          bed_type: string | null
          created_at: string | null
          floor: number
          has_balcony: boolean | null
          has_window: boolean | null
          hotel_id: string
          id: string
          max_guests: number | null
          notes: string | null
          room_number: string
          room_type: string
          smoking_allowed: boolean | null
          status: string | null
          tenant_id: string
          updated_at: string | null
          view_type: string | null
        }
        Insert: {
          amenities?: string[] | null
          area_sqm?: number | null
          base_price?: number | null
          bed_type?: string | null
          created_at?: string | null
          floor: number
          has_balcony?: boolean | null
          has_window?: boolean | null
          hotel_id: string
          id?: string
          max_guests?: number | null
          notes?: string | null
          room_number: string
          room_type: string
          smoking_allowed?: boolean | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          view_type?: string | null
        }
        Update: {
          amenities?: string[] | null
          area_sqm?: number | null
          base_price?: number | null
          bed_type?: string | null
          created_at?: string | null
          floor?: number
          has_balcony?: boolean | null
          has_window?: boolean | null
          hotel_id?: string
          id?: string
          max_guests?: number | null
          notes?: string | null
          room_number?: string
          room_type?: string
          smoking_allowed?: boolean | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          view_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "rooms_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_statistics: {
        Row: {
          average_task_completion_time: unknown
          hotel_id: string
          id: string
          items_checked: number | null
          last_calculated_at: string | null
          laundry_batches_processed: number | null
          maintenance_tasks_completed: number | null
          on_time_completion_rate: number | null
          period_end: string
          period_start: string
          user_id: string
        }
        Insert: {
          average_task_completion_time?: unknown
          hotel_id: string
          id?: string
          items_checked?: number | null
          last_calculated_at?: string | null
          laundry_batches_processed?: number | null
          maintenance_tasks_completed?: number | null
          on_time_completion_rate?: number | null
          period_end: string
          period_start: string
          user_id: string
        }
        Update: {
          average_task_completion_time?: unknown
          hotel_id?: string
          id?: string
          items_checked?: number | null
          last_calculated_at?: string | null
          laundry_batches_processed?: number | null
          maintenance_tasks_completed?: number | null
          on_time_completion_rate?: number | null
          period_end?: string
          period_start?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_statistics_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "staff_statistics_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_statistics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_statistics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustment_items: {
        Row: {
          actual_quantity: number
          adjustment_id: string
          checked_at: string | null
          checked_by: string | null
          created_at: string | null
          difference: number | null
          discrepancy_reason: string | null
          id: string
          item_id: string
          notes: string | null
          photos: string[] | null
          status: string | null
          system_quantity: number
          unit_price: number | null
          value_difference: number | null
        }
        Insert: {
          actual_quantity: number
          adjustment_id: string
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          difference?: number | null
          discrepancy_reason?: string | null
          id?: string
          item_id: string
          notes?: string | null
          photos?: string[] | null
          status?: string | null
          system_quantity: number
          unit_price?: number | null
          value_difference?: number | null
        }
        Update: {
          actual_quantity?: number
          adjustment_id?: string
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          difference?: number | null
          discrepancy_reason?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          photos?: string[] | null
          status?: string | null
          system_quantity?: number
          unit_price?: number | null
          value_difference?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustment_items_adjustment_id_fkey"
            columns: ["adjustment_id"]
            isOneToOne: false
            referencedRelation: "stock_adjustments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustment_items_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustment_items_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustment_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          adjustment_code: string
          adjustment_type: string
          approval_notes: string | null
          approved_by: string | null
          assigned_to: string[] | null
          completed_at: string | null
          created_at: string | null
          created_by: string
          hotel_id: string
          id: string
          notes: string | null
          scheduled_date: string | null
          started_at: string | null
          status: string | null
          tenant_id: string
          total_discrepancies: number | null
          total_items_checked: number | null
          total_value_difference: number | null
          updated_at: string | null
        }
        Insert: {
          adjustment_code: string
          adjustment_type: string
          approval_notes?: string | null
          approved_by?: string | null
          assigned_to?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          hotel_id: string
          id?: string
          notes?: string | null
          scheduled_date?: string | null
          started_at?: string | null
          status?: string | null
          tenant_id: string
          total_discrepancies?: number | null
          total_items_checked?: number | null
          total_value_difference?: number | null
          updated_at?: string | null
        }
        Update: {
          adjustment_code?: string
          adjustment_type?: string
          approval_notes?: string | null
          approved_by?: string | null
          assigned_to?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          hotel_id?: string
          id?: string
          notes?: string | null
          scheduled_date?: string | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string
          total_discrepancies?: number | null
          total_items_checked?: number | null
          total_value_difference?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "stock_adjustments_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          display_order: number | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_hotels: number | null
          max_items: number | null
          max_rooms: number | null
          max_storage_gb: number | null
          max_users: number | null
          min_subscription_days: number | null
          name: string
          price_monthly: number
          price_per_room_daily: number | null
          price_yearly: number
          pricing_model: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_hotels?: number | null
          max_items?: number | null
          max_rooms?: number | null
          max_storage_gb?: number | null
          max_users?: number | null
          min_subscription_days?: number | null
          name: string
          price_monthly?: number
          price_per_room_daily?: number | null
          price_yearly?: number
          pricing_model?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_hotels?: number | null
          max_items?: number | null
          max_rooms?: number | null
          max_storage_gb?: number | null
          max_users?: number | null
          min_subscription_days?: number | null
          name?: string
          price_monthly?: number
          price_per_room_daily?: number | null
          price_yearly?: number
          pricing_model?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      super_admin_activity_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          description: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          description: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          description?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "super_admin_activity_log_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_admin_activity_log_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_connections: {
        Row: {
          chat_id: string
          chat_title: string | null
          chat_type: string | null
          created_at: string | null
          first_name: string | null
          id: string
          is_active: boolean | null
          notification_types: string[] | null
          tenant_id: string
          updated_at: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          chat_id: string
          chat_title?: string | null
          chat_type?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          notification_types?: string[] | null
          tenant_id: string
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          chat_id?: string
          chat_title?: string | null
          chat_type?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          notification_types?: string[] | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_groups: {
        Row: {
          added_by: string | null
          chat_id: string
          chat_title: string
          created_at: string | null
          department: string | null
          group_type: string | null
          hotel_id: string | null
          id: string
          is_active: boolean | null
          notification_types: string[] | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          added_by?: string | null
          chat_id: string
          chat_title: string
          created_at?: string | null
          department?: string | null
          group_type?: string | null
          hotel_id?: string | null
          id?: string
          is_active?: boolean | null
          notification_types?: string[] | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          added_by?: string | null
          chat_id?: string
          chat_title?: string
          created_at?: string | null
          department?: string | null
          group_type?: string | null
          hotel_id?: string | null
          id?: string
          is_active?: boolean | null
          notification_types?: string[] | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_groups_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_groups_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_groups_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "telegram_groups_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_usage: {
        Row: {
          current_hotels_count: number | null
          current_items_count: number | null
          current_rooms_count: number | null
          current_storage_bytes: number | null
          current_users_count: number | null
          id: string
          last_calculated_at: string | null
          peak_hotels_count: number | null
          peak_storage_bytes: number | null
          peak_users_count: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          current_hotels_count?: number | null
          current_items_count?: number | null
          current_rooms_count?: number | null
          current_storage_bytes?: number | null
          current_users_count?: number | null
          id?: string
          last_calculated_at?: string | null
          peak_hotels_count?: number | null
          peak_storage_bytes?: number | null
          peak_users_count?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          current_hotels_count?: number | null
          current_items_count?: number | null
          current_rooms_count?: number | null
          current_storage_bytes?: number | null
          current_users_count?: number | null
          id?: string
          last_calculated_at?: string | null
          peak_hotels_count?: number | null
          peak_storage_bytes?: number | null
          peak_users_count?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          auto_renew: boolean | null
          billing_address: string | null
          billing_cycle: string | null
          billing_email: string | null
          created_at: string | null
          email: string
          id: string
          logo_url: string | null
          name: string
          payment_method: string | null
          phone: string | null
          registered_rooms: number | null
          rejection_reason: string | null
          settings: Json | null
          subscription_current_period_end: string | null
          subscription_current_period_start: string | null
          subscription_duration_days: number | null
          subscription_end_date: string | null
          subscription_expires_at: string | null
          subscription_plan: string | null
          subscription_plan_id: string | null
          subscription_start_date: string | null
          subscription_started_at: string | null
          subscription_status: string | null
          tax_id: string | null
          trial_end_date: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          auto_renew?: boolean | null
          billing_address?: string | null
          billing_cycle?: string | null
          billing_email?: string | null
          created_at?: string | null
          email: string
          id?: string
          logo_url?: string | null
          name: string
          payment_method?: string | null
          phone?: string | null
          registered_rooms?: number | null
          rejection_reason?: string | null
          settings?: Json | null
          subscription_current_period_end?: string | null
          subscription_current_period_start?: string | null
          subscription_duration_days?: number | null
          subscription_end_date?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_plan_id?: string | null
          subscription_start_date?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          tax_id?: string | null
          trial_end_date?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          auto_renew?: boolean | null
          billing_address?: string | null
          billing_cycle?: string | null
          billing_email?: string | null
          created_at?: string | null
          email?: string
          id?: string
          logo_url?: string | null
          name?: string
          payment_method?: string | null
          phone?: string | null
          registered_rooms?: number | null
          rejection_reason?: string | null
          settings?: Json | null
          subscription_current_period_end?: string | null
          subscription_current_period_start?: string | null
          subscription_duration_days?: number | null
          subscription_end_date?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_plan_id?: string | null
          subscription_start_date?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          tax_id?: string | null
          trial_end_date?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_hotels: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          can_approve_requests: boolean | null
          can_create_managers: boolean | null
          can_create_staff: boolean | null
          can_export_data: boolean | null
          can_view_reports: boolean | null
          hotel_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          can_approve_requests?: boolean | null
          can_create_managers?: boolean | null
          can_create_staff?: boolean | null
          can_export_data?: boolean | null
          can_view_reports?: boolean | null
          hotel_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          can_approve_requests?: boolean | null
          can_create_managers?: boolean | null
          can_create_staff?: boolean | null
          can_export_data?: boolean | null
          can_view_reports?: boolean | null
          hotel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_hotels_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_hotels_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_hotels_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "user_hotels_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_hotels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_hotels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_levels: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          hierarchy_level: number
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          hierarchy_level: number
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          hierarchy_level?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          action: string
          created_at: string | null
          created_by: string | null
          enabled: boolean
          id: string
          module: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean
          id?: string
          module: string
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean
          id?: string
          module?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          current_hotel_id: string | null
          id: string
          preferences: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_hotel_id?: string | null
          id?: string
          preferences?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_hotel_id?: string | null
          id?: string
          preferences?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_current_hotel_id_fkey"
            columns: ["current_hotel_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "user_preferences_current_hotel_id_fkey"
            columns: ["current_hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          account_locked: boolean | null
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          deactivated_at: string | null
          deactivated_by: string | null
          deleted_at: string | null
          department: string | null
          email: string
          full_name: string
          hotel_id: string | null
          id: string
          is_primary_owner: boolean | null
          is_super_admin: boolean | null
          last_login_at: string | null
          last_login_ip: unknown
          locked_reason: string | null
          login_count: number | null
          metadata: Json | null
          must_change_password: boolean | null
          notes: string | null
          phone: string | null
          position_id: string | null
          reports_to: string | null
          role: string
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          user_level_code: string | null
        }
        Insert: {
          account_locked?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          deleted_at?: string | null
          department?: string | null
          email: string
          full_name: string
          hotel_id?: string | null
          id: string
          is_primary_owner?: boolean | null
          is_super_admin?: boolean | null
          last_login_at?: string | null
          last_login_ip?: unknown
          locked_reason?: string | null
          login_count?: number | null
          metadata?: Json | null
          must_change_password?: boolean | null
          notes?: string | null
          phone?: string | null
          position_id?: string | null
          reports_to?: string | null
          role?: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_level_code?: string | null
        }
        Update: {
          account_locked?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          deleted_at?: string | null
          department?: string | null
          email?: string
          full_name?: string
          hotel_id?: string | null
          id?: string
          is_primary_owner?: boolean | null
          is_super_admin?: boolean | null
          last_login_at?: string | null
          last_login_ip?: unknown
          locked_reason?: string | null
          login_count?: number | null
          metadata?: Json | null
          must_change_password?: boolean | null
          notes?: string | null
          phone?: string | null
          position_id?: string | null
          reports_to?: string | null
          role?: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_level_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_deactivated_by_fkey"
            columns: ["deactivated_by"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_deactivated_by_fkey"
            columns: ["deactivated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "users_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "user_with_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_user_level_code_fkey"
            columns: ["user_level_code"]
            isOneToOne: false
            referencedRelation: "user_levels"
            referencedColumns: ["code"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_name: string | null
          category: string
          code: string
          contact_person: string | null
          created_at: string | null
          created_by: string | null
          delivery_time: string | null
          documents: string[] | null
          email: string | null
          id: string
          minimum_order_value: number | null
          name: string
          notes: string | null
          on_time_delivery_rate: number | null
          payment_terms: string | null
          phone: string | null
          products_services: string[] | null
          rating: number | null
          status: string | null
          tax_code: string | null
          tenant_id: string
          total_orders: number | null
          total_value: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          category: string
          code: string
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_time?: string | null
          documents?: string[] | null
          email?: string | null
          id?: string
          minimum_order_value?: number | null
          name: string
          notes?: string | null
          on_time_delivery_rate?: number | null
          payment_terms?: string | null
          phone?: string | null
          products_services?: string[] | null
          rating?: number | null
          status?: string | null
          tax_code?: string | null
          tenant_id: string
          total_orders?: number | null
          total_value?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          category?: string
          code?: string
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_time?: string | null
          documents?: string[] | null
          email?: string | null
          id?: string
          minimum_order_value?: number | null
          name?: string
          notes?: string | null
          on_time_delivery_rate?: number | null
          payment_terms?: string | null
          phone?: string | null
          products_services?: string[] | null
          rating?: number | null
          status?: string | null
          tax_code?: string | null
          tenant_id?: string
          total_orders?: number | null
          total_value?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_actions: {
        Row: {
          action_config: Json
          action_type: string
          continue_on_failure: boolean | null
          created_at: string | null
          id: string
          max_retries: number | null
          order_index: number
          retry_delay_seconds: number | null
          updated_at: string | null
          workflow_id: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          continue_on_failure?: boolean | null
          created_at?: string | null
          id?: string
          max_retries?: number | null
          order_index?: number
          retry_delay_seconds?: number | null
          updated_at?: string | null
          workflow_id: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          continue_on_failure?: boolean | null
          created_at?: string | null
          id?: string
          max_retries?: number | null
          order_index?: number
          retry_delay_seconds?: number | null
          updated_at?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_actions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          actions_completed: number | null
          actions_failed: number | null
          completed_at: string | null
          created_at: string | null
          duration_seconds: number | null
          error_message: string | null
          execution_log: Json | null
          id: string
          started_at: string | null
          status: string
          trigger_data: Json | null
          workflow_id: string
        }
        Insert: {
          actions_completed?: number | null
          actions_failed?: number | null
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          execution_log?: Json | null
          id?: string
          started_at?: string | null
          status?: string
          trigger_data?: Json | null
          workflow_id: string
        }
        Update: {
          actions_completed?: number | null
          actions_failed?: number | null
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          execution_log?: Json | null
          id?: string
          started_at?: string | null
          status?: string
          trigger_data?: Json | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          conditions: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          failed_count: number | null
          id: string
          last_error: string | null
          last_run_at: string | null
          last_run_status: string | null
          name: string
          status: string | null
          success_count: number | null
          tenant_id: string
          total_executions: number | null
          trigger_event: string | null
          trigger_schedule: string | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          failed_count?: number | null
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          last_run_status?: string | null
          name: string
          status?: string | null
          success_count?: number | null
          tenant_id: string
          total_executions?: number | null
          trigger_event?: string | null
          trigger_schedule?: string | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          failed_count?: number | null
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          last_run_status?: string | null
          name?: string
          status?: string | null
          success_count?: number | null
          tenant_id?: string
          total_executions?: number | null
          trigger_event?: string | null
          trigger_schedule?: string | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      dashboard_activities: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          metadata: Json | null
          tenant_id: string | null
          type: string | null
          user_avatar: string | null
          user_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_stats: {
        Row: {
          active_laundry_batches: number | null
          cleaning_rooms: number | null
          hotel_id: string | null
          hotel_name: string | null
          low_stock_items_count: number | null
          maintenance_rooms: number | null
          occupied_rooms: number | null
          pending_maintenance_requests: number | null
          tenant_id: string | null
          total_damaged: number | null
          total_in_laundry: number | null
          total_in_stock: number | null
          total_in_use: number | null
          total_inventory_value: number | null
          total_items: number | null
          total_quantity: number | null
          total_rooms: number | null
          vacant_rooms: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hotels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_expenses: {
        Row: {
          laundry_amount: number | null
          maintenance_amount: number | null
          month: string | null
          purchase_amount: number | null
          tenant_id: string | null
          total_amount: number | null
        }
        Relationships: []
      }
      user_with_levels: {
        Row: {
          account_locked: boolean | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          hierarchy_level: number | null
          hotel_id: string | null
          id: string | null
          is_super_admin: boolean | null
          last_login_at: string | null
          login_count: number | null
          phone: string | null
          status: string | null
          tenant_id: string | null
          user_level_code: string | null
          user_level_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "users_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_user_level_code_fkey"
            columns: ["user_level_code"]
            isOneToOne: false
            referencedRelation: "user_levels"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Functions: {
      apply_promo_code: {
        Args: {
          p_original_amount: number
          p_promo_code: string
          p_tenant_id: string
        }
        Returns: Json
      }
      apply_room_standards:
        | { Args: { p_room_id: string }; Returns: Json }
        | { Args: { p_room_id: string; p_user_id?: string }; Returns: Json }
      approve_tenant: {
        Args: { p_admin_id: string; p_tenant_id: string }
        Returns: Json
      }
      assign_default_permissions_to_role: {
        Args: {
          p_permission_codes: string[]
          p_role_code: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      batch_confirm_room_deliveries: {
        Args: { p_confirmed_by: string; p_room_order_ids: string[] }
        Returns: Json
      }
      bulk_delete_items: {
        Args: { p_item_ids: string[]; p_user_id: string }
        Returns: Json
      }
      calculate_staff_statistics: {
        Args: {
          p_hotel_id: string
          p_period_end: string
          p_period_start: string
          p_user_id: string
        }
        Returns: undefined
      }
      calculate_tenant_storage: {
        Args: { p_tenant_id: string }
        Returns: number
      }
      can_create_user: {
        Args: {
          p_creator_id: string
          p_new_user_level: string
          p_tenant_id: string
        }
        Returns: boolean
      }
      can_manage_user: {
        Args: { p_manager_id: string; p_target_user_id: string }
        Returns: boolean
      }
      cancel_booking: {
        Args: { p_booking_id: string; p_room_id?: string }
        Returns: Json
      }
      cancel_distribution_order: {
        Args: { p_cancelled_by: string; p_order_id: string }
        Returns: Json
      }
      check_and_update_batch_status: {
        Args: { p_batch_id: string }
        Returns: undefined
      }
      check_and_update_order_status: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      check_expiring_subscriptions: { Args: never; Returns: undefined }
      check_tenant_can_add: {
        Args: { p_resource_type: string; p_tenant_id: string }
        Returns: boolean
      }
      cleanup_expired_otps: { Args: never; Returns: undefined }
      cleanup_old_check_sessions: { Args: never; Returns: undefined }
      cleanup_orphaned_auth_users: { Args: never; Returns: number }
      close_route_if_complete: {
        Args: { p_actor_id?: string; p_order_id: string }
        Returns: Json
      }
      complete_registration: {
        Args: {
          p_email: string
          p_full_name: string
          p_hotel_address: string
          p_hotel_email: string
          p_hotel_name: string
          p_hotel_phone: string
          p_phone: string
          p_tenant_name: string
          p_total_rooms: number
          p_user_id: string
        }
        Returns: Json
      }
      complete_room_delivery:
        | {
            Args: {
              p_confirmed_by: string
              p_distribution_order_room_id: string
              p_item_confirmations?: Json
            }
            Returns: Json
          }
        | {
            Args: {
              p_additional_items?: Json
              p_confirmed_by: string
              p_distribution_order_room_id: string
              p_item_confirmations?: Json
            }
            Returns: Json
          }
      confirm_delivery_from_room_check: {
        Args: { p_confirmed_by: string; p_room_order_id: string }
        Returns: Json
      }
      confirm_receive_order: {
        Args: { p_actor_id?: string; p_order_id: string }
        Returns: Json
      }
      confirm_room_delivery: {
        Args: { p_confirmed_by: string; p_room_order_id: string }
        Returns: Json
      }
      confirm_warehouse_delivery: {
        Args: {
          p_delivered_by: string
          p_item_confirmations?: Json
          p_room_order_id: string
        }
        Returns: Json
      }
      create_default_categories: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      create_default_tenant_roles: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      create_distribution_order: {
        Args: {
          p_assigned_to: string
          p_created_by: string
          p_hotel_id: string
          p_notes?: string
          p_rooms: Json
          p_tenant_id: string
        }
        Returns: Json
      }
      create_inbound_transaction: {
        Args: {
          p_created_by: string
          p_documents?: string[]
          p_from_location: string
          p_hotel_id: string
          p_items: Json
          p_notes?: string
          p_photos?: string[]
          p_related_id?: string
          p_related_type?: string
          p_tenant_id: string
          p_to_location: string
          p_transaction_category: string
        }
        Returns: Json
      }
      create_laundry_batch_with_items: {
        Args: {
          p_delivery_date: string
          p_delivery_staff_id: string
          p_expected_return_date: string
          p_hotel_id: string
          p_items: Json
          p_notes: string
          p_receiver_name: string
          p_tenant_id: string
          p_vendor_id: string
        }
        Returns: Json
      }
      create_laundry_loss_transaction:
        | {
            Args: {
              p_batch_code: string
              p_batch_id: string
              p_created_by: string
              p_hotel_id: string
              p_item_id: string
              p_loss_type: string
              p_notes?: string
              p_quantity: number
              p_tenant_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_created_by: string
              p_hotel_id: string
              p_items: Json
              p_loss_type: string
              p_notes?: string
              p_related_id?: string
              p_tenant_id: string
            }
            Returns: Json
          }
      create_laundry_return_transaction:
        | {
            Args: {
              p_batch_code: string
              p_batch_id: string
              p_created_by: string
              p_hotel_id: string
              p_item_id: string
              p_notes?: string
              p_quantity: number
              p_tenant_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_created_by: string
              p_from_location: string
              p_hotel_id: string
              p_items: Json
              p_notes?: string
              p_related_id?: string
              p_tenant_id: string
              p_to_location: string
            }
            Returns: Json
          }
      create_notification: {
        Args: {
          p_action_url?: string
          p_body: string
          p_icon?: string
          p_metadata?: Json
          p_tenant_id: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      create_notification_for_user: {
        Args: {
          p_action_url?: string
          p_body: string
          p_icon?: string
          p_metadata?: Json
          p_tenant_id: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      create_outbound_transaction: {
        Args: {
          p_created_by: string
          p_documents?: string[]
          p_from_location: string
          p_hotel_id: string
          p_items: Json
          p_notes?: string
          p_photos?: string[]
          p_recipient_name?: string
          p_recipient_signature?: string
          p_related_id?: string
          p_related_type?: string
          p_tenant_id: string
          p_to_location: string
          p_transaction_category: string
        }
        Returns: Json
      }
      create_stock_adjustment: {
        Args: {
          p_adjustment_type: string
          p_assigned_to: string[]
          p_created_by: string
          p_hotel_id: string
          p_item_ids: string[]
          p_notes?: string
          p_scheduled_date: string
          p_tenant_id: string
        }
        Returns: Json
      }
      create_super_admin: {
        Args: { p_email: string; p_full_name?: string }
        Returns: Json
      }
      delete_inventory_transaction: {
        Args: { p_transaction_id: string }
        Returns: Json
      }
      deliver_stop:
        | {
            Args: {
              p_actor_id?: string
              p_items_confirmed?: Json
              p_room_order_id: string
            }
            Returns: Json
          }
        | { Args: { p_actor_id?: string; p_stop_id: string }; Returns: Json }
      generate_invoice_number: { Args: never; Returns: string }
      generate_unique_code: {
        Args: { column_name: string; prefix: string; table_name: string }
        Returns: string
      }
      get_abc_analysis: {
        Args: { p_hotel_id: string; p_tenant_id: string }
        Returns: {
          abc_class: string
          category_name: string
          cumulative_percentage: number
          cumulative_value: number
          item_code: string
          item_id: string
          item_name: string
          percentage: number
          total_value: number
        }[]
      }
      get_categories_with_stats:
        | {
            Args: { p_tenant_id: string }
            Returns: {
              color: string
              description: string
              icon: string
              id: string
              items_count: number
              name: string
              name_en: string
              sort_order: number
              total_value: number
            }[]
          }
        | {
            Args: { p_hotel_id?: string; p_tenant_id: string }
            Returns: {
              color: string
              description: string
              icon: string
              id: string
              items_count: number
              name: string
              name_en: string
              sort_order: number
              total_value: number
            }[]
          }
      get_current_room_booking: {
        Args: { p_room_id: string }
        Returns: {
          actual_check_in: string
          check_in_date: string
          check_out_date: string
          guest_count: number
          guest_email: string
          guest_name: string
          guest_phone: string
          id: string
          notes: string
          status: string
        }[]
      }
      get_current_user_role: { Args: never; Returns: string }
      get_current_user_tenant_id: { Args: never; Returns: string }
      get_dashboard_stats: {
        Args: { p_hotel_id?: string; p_tenant_id: string }
        Returns: Json
      }
      get_distribution_order_detail: {
        Args: { p_order_id: string }
        Returns: Json
      }
      get_distribution_orders_count: {
        Args: {
          p_assigned_to?: string
          p_floor?: number
          p_hotel_id?: string
          p_shift_code?: string
          p_shift_date?: string
          p_status?: string
          p_tenant_id: string
        }
        Returns: number
      }
      get_distribution_orders_filtered:
        | {
            Args: {
              p_assigned_to?: string
              p_floor?: number
              p_hotel_id?: string
              p_limit?: number
              p_offset?: number
              p_shift_code?: string
              p_shift_date?: string
              p_status?: string
              p_tenant_id: string
            }
            Returns: {
              assigned_to: string
              assigned_to_name: string
              completed_at: string
              created_at: string
              created_by: string
              created_by_name: string
              floor: number
              hotel_id: string
              hotel_name: string
              id: string
              notes: string
              order_code: string
              released_at: string
              rooms_completed: number
              shift_code: string
              shift_date: string
              started_at: string
              status: string
              total_items: number
              total_rooms: number
            }[]
          }
        | {
            Args: {
              p_assigned_to?: string
              p_hotel_id?: string
              p_limit?: number
              p_offset?: number
              p_status?: string
              p_tenant_id: string
            }
            Returns: {
              assigned_to: string
              assigned_to_name: string
              completed_at: string
              created_at: string
              created_by: string
              created_by_name: string
              id: string
              notes: string
              order_code: string
              rooms_completed: number
              started_at: string
              status: string
              total_count: number
              total_items: number
              total_rooms: number
            }[]
          }
      get_financial_report: {
        Args: {
          p_end_date: string
          p_hotel_id: string
          p_start_date: string
          p_tenant_id: string
        }
        Returns: Json
      }
      get_floor_plan: { Args: { p_hotel_id: string }; Returns: Json }
      get_hotel_performance_stats: {
        Args: {
          p_from_date: string
          p_hotel_id: string
          p_tenant_id: string
          p_to_date: string
        }
        Returns: Json
      }
      get_hotels_breakdown_stats: {
        Args: { p_tenant_id: string }
        Returns: {
          hotel_code: string
          hotel_id: string
          hotel_name: string
          in_laundry: number
          in_stock: number
          in_use: number
          low_stock_count: number
          total_items: number
          total_value: number
        }[]
      }
      get_hotels_performance_comparison: {
        Args: { p_from_date: string; p_tenant_id: string; p_to_date: string }
        Returns: {
          cost_per_room: number
          efficiency_score: number
          hotel_code: string
          hotel_id: string
          hotel_name: string
          inventory_turnover_rate: number
          inventory_value: number
          laundry_cost: number
          laundry_quality: number
          maintenance_completion_rate: number
          maintenance_cost: number
          purchase_value: number
          total_operating_cost: number
          total_rooms: number
        }[]
      }
      get_inventory_dashboard_stats: {
        Args: { p_hotel_id: string; p_tenant_id: string }
        Returns: Json
      }
      get_inventory_report: {
        Args: {
          p_end_date: string
          p_hotel_id: string
          p_start_date: string
          p_tenant_id: string
        }
        Returns: Json
      }
      get_inventory_transactions_filtered: {
        Args: {
          p_category_id?: string
          p_created_by?: string
          p_date_from?: string
          p_date_to?: string
          p_hotel_id?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_tenant_id: string
          p_transaction_type?: string
        }
        Returns: {
          category_name: string
          created_at: string
          created_by: string
          created_by_avatar: string
          created_by_name: string
          from_location: string
          id: string
          item_code: string
          item_id: string
          item_images: string[]
          item_name: string
          notes: string
          quantity: number
          quantity_after: number
          quantity_before: number
          to_location: string
          total_count: number
          total_value: number
          transaction_category: string
          transaction_code: string
          transaction_type: string
          unit_price: number
        }[]
      }
      get_inventory_value_over_time: {
        Args: { p_hotel_id: string; p_months?: number; p_tenant_id: string }
        Returns: {
          month: string
          stock_value: number
          value_in: number
          value_out: number
        }[]
      }
      get_item_detail: { Args: { p_item_id: string }; Returns: Json }
      get_items_filtered: {
        Args: {
          p_category_id?: string
          p_hotel_id?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_status?: string
          p_stock_status?: string
          p_tenant_id: string
        }
        Returns: {
          brand: string
          category_color: string
          category_id: string
          category_name: string
          code: string
          created_at: string
          description: string
          hotel_id: string
          id: string
          minimum_stock: number
          model: string
          name: string
          name_en: string
          quantity_damaged: number
          quantity_in_laundry: number
          quantity_in_stock: number
          quantity_in_use: number
          quantity_lost: number
          quantity_total: number
          reorder_point: number
          status: string
          stock_status: string
          total_count: number
          unit: string
          unit_price: number
          updated_at: string
        }[]
      }
      get_laundry_batch_detail: { Args: { p_batch_id: string }; Returns: Json }
      get_laundry_batches_filtered: {
        Args: {
          p_from_date?: string
          p_hotel_id?: string
          p_limit?: number
          p_offset?: number
          p_status?: string
          p_tenant_id: string
          p_to_date?: string
          p_vendor_id?: string
        }
        Returns: {
          actual_cost: number
          actual_return_date: string
          batch_code: string
          created_at: string
          delivery_date: string
          estimated_cost: number
          expected_return_date: string
          id: string
          items_damaged: number
          items_lost: number
          quality_rating: number
          status: string
          timeliness_rating: number
          total_count: number
          total_items: number
          total_weight_kg: number
          vendor_id: string
          vendor_logo: string
          vendor_name: string
          vendor_rating: number
        }[]
      }
      get_laundry_dashboard_stats: {
        Args: { p_hotel_id?: string; p_tenant_id: string }
        Returns: Json
      }
      get_laundry_report:
        | {
            Args: {
              p_end_date: string
              p_hotel_id: string
              p_start_date: string
              p_tenant_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_end_date?: string
              p_start_date?: string
              p_tenant_id: string
            }
            Returns: Json
          }
      get_low_stock_items: {
        Args: { p_hotel_id: string; p_limit?: number; p_tenant_id: string }
        Returns: {
          category_id: string
          category_name: string
          code: string
          id: string
          images: string[]
          minimum_stock: number
          name: string
          quantity_in_stock: number
          reorder_point: number
          shortage: number
          shortage_percent: number
          unit_price: number
        }[]
      }
      get_missing_items_for_rooms: {
        Args: { p_room_ids: string[] }
        Returns: {
          current_qty: number
          item_id: string
          item_name: string
          item_stock: number
          missing_qty: number
          room_id: string
          room_number: string
          standard_qty: number
        }[]
      }
      get_missing_items_from_room_detail: {
        Args: { p_room_ids: string[] }
        Returns: {
          current_qty: number
          item_code: string
          item_id: string
          item_name: string
          item_stock: number
          missing_qty: number
          room_id: string
          room_number: string
          standard_qty: number
        }[]
      }
      get_monthly_expenses:
        | {
            Args: { p_months?: number; p_tenant_id: string }
            Returns: {
              laundry: number
              maintenance: number
              month: string
              purchase: number
              total: number
            }[]
          }
        | {
            Args: {
              p_hotel_id?: string
              p_months?: number
              p_tenant_id: string
            }
            Returns: {
              laundry: number
              maintenance: number
              month: string
              purchase: number
              total: number
            }[]
          }
      get_monthly_laundry_expenses: {
        Args: { p_hotel_id?: string; p_tenant_id: string; p_year?: number }
        Returns: {
          actual_cost: number
          estimated_cost: number
          month: string
          total_batches: number
          total_items: number
        }[]
      }
      get_pending_tenants: {
        Args: never
        Returns: {
          created_at: string
          owner_email: string
          owner_name: string
          subscription_tier: string
          tenant_id: string
          tenant_name: string
        }[]
      }
      get_recent_activities:
        | {
            Args: { p_limit?: number; p_tenant_id: string }
            Returns: {
              created_at: string
              description: string
              id: string
              metadata: Json
              type: string
              user_avatar: string
              user_name: string
            }[]
          }
        | {
            Args: { p_hotel_id?: string; p_limit?: number; p_tenant_id: string }
            Returns: {
              created_at: string
              description: string
              id: string
              metadata: Json
              type: string
              user_avatar: string
              user_name: string
            }[]
          }
      get_room_checks_report: {
        Args: {
          p_end_date?: string
          p_hotel_id?: string
          p_start_date?: string
          p_tenant_id: string
        }
        Returns: Json
      }
      get_room_detail: { Args: { p_room_id: string }; Returns: Json }
      get_room_distribution_history: {
        Args: { p_room_id: string }
        Returns: {
          assigned_to_name: string
          confirmed_at: string
          confirmed_by_name: string
          created_at: string
          delivered_at: string
          items: Json
          order_code: string
          order_id: string
          order_status: string
          rejection_reason: string
          room_status: string
          total_items: number
          total_quantity: number
        }[]
      }
      get_room_items_with_standards: {
        Args: { p_room_id: string }
        Returns: {
          category_id: string
          category_name: string
          condition: string
          id: string
          item_code: string
          item_id: string
          item_name: string
          item_type: string
          notes: string
          quantity: number
          room_id: string
          standard_quantity: number
          unit: string
        }[]
      }
      get_room_standards: {
        Args: { p_hotel_id: string; p_room_type: string }
        Returns: {
          category_color: string
          category_name: string
          id: string
          item_code: string
          item_id: string
          item_name: string
          item_thumbnail: string
          quantity: number
        }[]
      }
      get_rooms_filtered: {
        Args: {
          p_floor?: number
          p_hotel_id?: string
          p_missing_items_only?: boolean
          p_room_type?: string
          p_search?: string
          p_status?: string
          p_tenant_id: string
        }
        Returns: {
          amenities: string[]
          area_sqm: number
          base_price: number
          bed_type: string
          created_at: string
          floor: number
          has_balcony: boolean
          has_window: boolean
          hotel_code: string
          hotel_id: string
          hotel_name: string
          id: string
          items_in_laundry: number
          last_check_at: string
          last_check_score: number
          max_guests: number
          missing_items: number
          notes: string
          room_number: string
          room_type: string
          smoking_allowed: boolean
          status: string
          tenant_id: string
          total_items: number
          updated_at: string
          view_type: string
        }[]
      }
      get_rooms_report_stats: {
        Args: {
          p_end_date?: string
          p_hotel_id?: string
          p_start_date?: string
          p_tenant_id: string
        }
        Returns: Json
      }
      get_stock_adjustments_filtered: {
        Args: {
          p_adjustment_type?: string
          p_created_by?: string
          p_date_from?: string
          p_date_to?: string
          p_hotel_id?: string
          p_limit?: number
          p_offset?: number
          p_status?: string
          p_tenant_id: string
        }
        Returns: {
          adjustment_code: string
          adjustment_type: string
          approved_by: string
          approved_by_name: string
          assigned_to: string[]
          assigned_to_names: string[]
          completed_at: string
          created_at: string
          created_by: string
          created_by_name: string
          id: string
          notes: string
          scheduled_date: string
          started_at: string
          status: string
          total_count: number
          total_discrepancies: number
          total_items_checked: number
          total_value_difference: number
          updated_at: string
        }[]
      }
      get_super_admin_dashboard_stats: { Args: never; Returns: Json }
      get_tenant_billing_summary: {
        Args: { p_tenant_id: string }
        Returns: Json
      }
      get_top_items: {
        Args: { p_hotel_id?: string; p_limit?: number; p_tenant_id: string }
        Returns: {
          category_color: string
          category_name: string
          code: string
          id: string
          name: string
          quantity_in_use: number
          quantity_total: number
          stock_status: string
          thumbnail: string
          utilization_rate: number
        }[]
      }
      get_turnover_analysis: {
        Args: { p_hotel_id: string; p_months?: number; p_tenant_id: string }
        Returns: {
          avg_stock: number
          category_name: string
          days_in_stock: number
          item_code: string
          item_id: string
          item_name: string
          status: string
          total_usage: number
          turnover_rate: number
        }[]
      }
      get_user_hotels: {
        Args: { p_user_id: string }
        Returns: {
          city: string
          code: string
          id: string
          name: string
          status: string
          total_rooms: number
        }[]
      }
      get_user_level: { Args: { _user_id: string }; Returns: string }
      get_user_levels: {
        Args: never
        Returns: {
          code: string
          description: string
          hierarchy_level: number
          id: string
          name: string
        }[]
      }
      get_user_permissions: {
        Args: { _user_id: string }
        Returns: {
          action: string
          code: string
          module: string
          name: string
          source: string
        }[]
      }
      get_user_permissions_summary: {
        Args: { p_user_id: string }
        Returns: {
          can_approve: boolean
          can_create: boolean
          can_delete: boolean
          can_export: boolean
          can_update: boolean
          can_view: boolean
          module: string
        }[]
      }
      get_user_primary_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_subordinates: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          subordinate_count: number
          user_level_code: string
        }[]
      }
      get_vendor_performance: {
        Args: { p_days?: number; p_vendor_id: string }
        Returns: Json
      }
      get_workflow_analytics: {
        Args: { p_period?: string; p_workflow_id: string }
        Returns: Json
      }
      handle_successful_payment: {
        Args: { p_transaction_id: string }
        Returns: undefined
      }
      handover_batch: {
        Args: { p_actor_id?: string; p_batch_id: string }
        Returns: Json
      }
      handover_stop_create_next_route: {
        Args: {
          p_actor_id?: string
          p_next_assignee_id?: string
          p_next_shift_code: string
          p_room_order_id: string
        }
        Returns: Json
      }
      has_permission: {
        Args: { _permission_code: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_user_level: {
        Args: { _level_code: string; _user_id: string }
        Returns: boolean
      }
      has_user_permission: {
        Args: { p_action: string; p_module: string; p_user_id: string }
        Returns: boolean
      }
      increment_quantity_in_laundry: {
        Args: { p_item_id: string; p_quantity: number }
        Returns: undefined
      }
      increment_staff_stat: {
        Args: {
          p_hotel_id: string
          p_increment?: number
          p_stat_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      increment_workflow_stats: {
        Args: { p_success: boolean; p_workflow_id: string }
        Returns: undefined
      }
      is_distribution_leader: { Args: { _user_id: string }; Returns: boolean }
      is_level_higher_or_equal: {
        Args: { _min_level_code: string; _user_id: string }
        Returns: boolean
      }
      is_manager: { Args: never; Returns: boolean }
      is_route_assignee: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      is_storekeeper: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_tenant_owner: { Args: never; Returns: boolean }
      log_activity: {
        Args: {
          p_action: string
          p_description: string
          p_entity_id: string
          p_entity_name: string
          p_entity_type: string
          p_new_values?: Json
          p_old_values?: Json
          p_tenant_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      mark_cannot_access: {
        Args: {
          p_actor_id?: string
          p_exception_reason?: string
          p_exception_type: string
          p_room_order_id: string
        }
        Returns: Json
      }
      perform_checkin: {
        Args: {
          p_booking_id: string
          p_early_checkin_charge?: number
          p_room_id: string
        }
        Returns: Json
      }
      perform_checkout: {
        Args: {
          p_booking_id: string
          p_late_checkout_charge?: number
          p_room_id: string
          p_service_charges?: number
          p_service_fee_amount?: number
          p_subtotal?: number
          p_total_amount?: number
          p_vat_amount?: number
        }
        Returns: Json
      }
      process_expired_subscriptions: { Args: never; Returns: undefined }
      queue_email_notification: {
        Args: {
          p_body_html: string
          p_metadata?: Json
          p_notification_type: string
          p_subject: string
          p_tenant_id: string
          p_to_email: string
          p_user_id: string
        }
        Returns: string
      }
      reassign_subordinates: {
        Args: { p_new_manager_id: string; p_old_manager_id: string }
        Returns: number
      }
      receive_batch: {
        Args: { p_actor_id?: string; p_batch_id: string }
        Returns: Json
      }
      refresh_monthly_expenses: { Args: never; Returns: undefined }
      reject_room_delivery: {
        Args: {
          p_distribution_order_room_id: string
          p_rejected_by: string
          p_rejection_reason: string
        }
        Returns: Json
      }
      reject_tenant: {
        Args: { p_admin_id: string; p_reason: string; p_tenant_id: string }
        Returns: Json
      }
      retry_stop: {
        Args: { p_actor_id?: string; p_room_order_id: string }
        Returns: Json
      }
      return_to_stock_for_stop: {
        Args: { p_actor_id?: string; p_room_order_id: string }
        Returns: Json
      }
      schedule_renewal_reminders: { Args: never; Returns: undefined }
      setup_new_tenant:
        | {
            Args: {
              p_hotel_address: string
              p_hotel_name: string
              p_owner_user_id: string
              p_tenant_id: string
              p_total_rooms: number
            }
            Returns: string
          }
        | {
            Args: {
              p_hotel_address: string
              p_hotel_email: string
              p_hotel_name: string
              p_hotel_phone: string
              p_tenant_email: string
              p_tenant_name: string
              p_tenant_phone: string
              p_total_rooms: number
              p_user_id: string
            }
            Returns: Json
          }
      setup_room_initial:
        | {
            Args: { p_reset_quantities?: boolean; p_room_id: string }
            Returns: Json
          }
        | {
            Args: {
              p_reset_quantities?: boolean
              p_room_id: string
              p_user_id?: string
            }
            Returns: Json
          }
      sync_categories_for_hotel: {
        Args: { p_hotel_id: string; p_tenant_id: string }
        Returns: Json
      }
      undo_room_delivery_confirmation:
        | { Args: { p_distribution_order_room_id: string }; Returns: Json }
        | {
            Args: {
              p_distribution_order_room_id: string
              p_performed_by: string
            }
            Returns: Json
          }
      update_distribution_order: {
        Args: {
          p_assigned_to?: string
          p_notes?: string
          p_order_id: string
          p_rooms?: Json
        }
        Returns: Json
      }
      update_room_status_safe: {
        Args: {
          p_expected_updated_at?: string
          p_new_status: string
          p_room_id: string
        }
        Returns: Json
      }
      update_tenant_usage: { Args: { p_tenant_id: string }; Returns: undefined }
      user_has_hotel_access: {
        Args: { p_hotel_id: string; p_user_id: string }
        Returns: boolean
      }
      user_has_subordinates: { Args: { p_user_id: string }; Returns: boolean }
      validate_plan_change: {
        Args: { p_new_plan_id: string; p_tenant_id: string }
        Returns: Json
      }
      works_at_same_hotel: {
        Args: { target_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "owner"
        | "hotel_manager"
        | "department_manager"
        | "staff"
      item_type: "linen" | "consumable" | "equipment" | "furniture"
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
        "super_admin",
        "owner",
        "hotel_manager",
        "department_manager",
        "staff",
      ],
      item_type: ["linen", "consumable", "equipment", "furniture"],
    },
  },
} as const
