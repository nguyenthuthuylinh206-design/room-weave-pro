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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          address: string | null
          code: string
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          settings: Json | null
          status: string | null
          tenant_id: string
          total_floors: number | null
          total_rooms: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          settings?: Json | null
          status?: string | null
          tenant_id: string
          total_floors?: number | null
          total_rooms?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          settings?: Json | null
          status?: string | null
          tenant_id?: string
          total_floors?: number | null
          total_rooms?: number | null
          updated_at?: string | null
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
            referencedRelation: "users"
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
            referencedRelation: "item_availability"
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
      item_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          name_en: string | null
          sort_order: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          name_en?: string | null
          sort_order?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          name_en?: string | null
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_categories_tenant_id_fkey"
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
          images: string[] | null
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
          images?: string[] | null
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
          images?: string[] | null
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
            referencedRelation: "item_availability"
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
      maintenance_requests: {
        Row: {
          actual_cost: number | null
          assigned_at: string | null
          assigned_to: string | null
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
          actual_cost?: number | null
          assigned_at?: string | null
          assigned_to?: string | null
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
          actual_cost?: number | null
          assigned_at?: string | null
          assigned_to?: string | null
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
            foreignKeyName: "maintenance_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "item_availability"
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
            referencedRelation: "item_availability"
            referencedColumns: ["id"]
          },
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
      room_checks: {
        Row: {
          check_type: string
          checked_at: string | null
          checked_by: string
          cleanliness_score: number | null
          id: string
          items_complete: boolean | null
          items_damaged: Json | null
          items_missing: Json | null
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
          items_damaged?: Json | null
          items_missing?: Json | null
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
          items_damaged?: Json | null
          items_missing?: Json | null
          notes?: string | null
          photos?: string[] | null
          room_id?: string
        }
        Relationships: [
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
          item_id: string
          last_checked_at: string | null
          last_checked_by: string | null
          notes: string | null
          quantity: number
          room_id: string
        }
        Insert: {
          assigned_at?: string | null
          condition?: string | null
          id?: string
          item_id: string
          last_checked_at?: string | null
          last_checked_by?: string | null
          notes?: string | null
          quantity?: number
          room_id: string
        }
        Update: {
          assigned_at?: string | null
          condition?: string | null
          id?: string
          item_id?: string
          last_checked_at?: string | null
          last_checked_by?: string | null
          notes?: string | null
          quantity?: number
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_availability"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "item_availability"
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustment_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_availability"
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
            referencedRelation: "users"
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
      tenants: {
        Row: {
          created_at: string | null
          email: string
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          settings: Json | null
          subscription_expires_at: string | null
          subscription_plan: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          settings?: Json | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          settings?: Json | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
          avatar_url: string | null
          created_at: string | null
          department: string | null
          email: string
          full_name: string
          hotel_id: string | null
          id: string
          last_login_at: string | null
          metadata: Json | null
          phone: string | null
          role: string
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          email: string
          full_name: string
          hotel_id?: string | null
          id: string
          last_login_at?: string | null
          metadata?: Json | null
          phone?: string | null
          role?: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          email?: string
          full_name?: string
          hotel_id?: string | null
          id?: string
          last_login_at?: string | null
          metadata?: Json | null
          phone?: string | null
          role?: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
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
      item_availability: {
        Row: {
          brand: string | null
          category_id: string | null
          category_name: string | null
          code: string | null
          created_at: string | null
          current_wash_cycles: number | null
          description: string | null
          expected_lifetime_days: number | null
          hotel_id: string | null
          hotel_name: string | null
          id: string | null
          images: string[] | null
          max_wash_cycles: number | null
          minimum_stock: number | null
          model: string | null
          name: string | null
          name_en: string | null
          qr_code: string | null
          quantity_damaged: number | null
          quantity_in_laundry: number | null
          quantity_in_stock: number | null
          quantity_in_use: number | null
          quantity_lost: number | null
          quantity_total: number | null
          reorder_point: number | null
          specifications: Json | null
          status: string | null
          stock_status: string | null
          tenant_id: string | null
          unit: string | null
          unit_price: number | null
          updated_at: string | null
          utilization_rate: number | null
          wash_cycle_progress: number | null
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
    }
    Functions: {
      apply_room_standards: {
        Args: { p_room_id: string; p_user_id: string }
        Returns: Json
      }
      bulk_delete_items: {
        Args: { p_item_ids: string[]; p_user_id: string }
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
      create_default_categories: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      generate_unique_code: {
        Args: { column_name: string; prefix: string; table_name: string }
        Returns: string
      }
      get_categories_with_stats: {
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
      get_current_user_role: { Args: never; Returns: string }
      get_dashboard_stats: { Args: { p_tenant_id: string }; Returns: Json }
      get_floor_plan: { Args: { p_hotel_id: string }; Returns: Json }
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
          category_color: string
          category_id: string
          category_name: string
          code: string
          created_at: string
          id: string
          minimum_stock: number
          name: string
          name_en: string
          qr_code: string
          quantity_damaged: number
          quantity_in_laundry: number
          quantity_in_stock: number
          quantity_in_use: number
          quantity_lost: number
          quantity_total: number
          status: string
          stock_status: string
          thumbnail: string
          total_count: number
          unit: string
          unit_price: number
        }[]
      }
      get_monthly_expenses: {
        Args: { p_months?: number; p_tenant_id: string }
        Returns: {
          laundry: number
          maintenance: number
          month: string
          purchase: number
          total: number
        }[]
      }
      get_recent_activities: {
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
      get_room_detail: { Args: { p_room_id: string }; Returns: Json }
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
          floor: number
          id: string
          items_in_laundry: number
          last_check_at: string
          last_check_score: number
          max_guests: number
          missing_items: number
          room_number: string
          room_type: string
          status: string
          total_items: number
        }[]
      }
      get_top_items: {
        Args: { p_limit?: number; p_tenant_id: string }
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
      get_user_primary_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
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
      refresh_monthly_expenses: { Args: never; Returns: undefined }
      setup_new_tenant:
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
    }
    Enums: {
      app_role:
        | "super_admin"
        | "owner"
        | "hotel_manager"
        | "department_manager"
        | "staff"
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
    },
  },
} as const
