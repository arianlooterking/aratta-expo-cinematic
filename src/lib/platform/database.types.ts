// Generated from supabase/migrations against a local Postgres. Regenerate with
// the Supabase CLI or MCP (generate_typescript_types) after schema changes.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          id: string;
          company_id: string;
          deal_id: string | null;
          contact_id: string | null;
          kind: Database["public"]["Enums"]["activity_kind"];
          summary: string;
          body: string | null;
          outcome: string | null;
          occurred_at: string;
          next_follow_up_at: string | null;
          author_id: string | null;
          import_key: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          deal_id?: string | null;
          contact_id?: string | null;
          kind: Database["public"]["Enums"]["activity_kind"];
          summary: string;
          body?: string | null;
          outcome?: string | null;
          occurred_at?: string;
          next_follow_up_at?: string | null;
          author_id?: string | null;
          import_key?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          deal_id?: string | null;
          contact_id?: string | null;
          kind?: Database["public"]["Enums"]["activity_kind"];
          summary?: string;
          body?: string | null;
          outcome?: string | null;
          occurred_at?: string;
          next_follow_up_at?: string | null;
          author_id?: string | null;
          import_key?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "activities_author_id_fkey"; columns: ["author_id"]; isOneToOne: false; referencedRelation: "staff_members"; referencedColumns: ["id"] },
          { foreignKeyName: "activities_company_id_fkey"; columns: ["company_id"]; isOneToOne: false; referencedRelation: "companies"; referencedColumns: ["id"] },
          { foreignKeyName: "activities_contact_id_fkey"; columns: ["contact_id"]; isOneToOne: false; referencedRelation: "contacts"; referencedColumns: ["id"] },
          { foreignKeyName: "activities_deal_id_fkey"; columns: ["deal_id"]; isOneToOne: false; referencedRelation: "deals"; referencedColumns: ["id"] },
        ];
      };
      attachments: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          bucket: string;
          path: string;
          file_name: string;
          mime_type: string | null;
          size_bytes: number | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_type: string;
          entity_id: string;
          bucket: string;
          path: string;
          file_name: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          entity_type?: string;
          entity_id?: string;
          bucket?: string;
          path?: string;
          file_name?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "attachments_uploaded_by_fkey"; columns: ["uploaded_by"]; isOneToOne: false; referencedRelation: "staff_members"; referencedColumns: ["id"] },
        ];
      };
      audit_log: {
        Row: {
          id: number;
          occurred_at: string;
          table_name: string;
          row_id: string | null;
          action: string;
          actor_id: string | null;
          actor_user_id: string | null;
          changes: Json;
        };
        Insert: {
          id?: number;
          occurred_at?: string;
          table_name: string;
          row_id?: string | null;
          action: string;
          actor_id?: string | null;
          actor_user_id?: string | null;
          changes?: Json;
        };
        Update: {
          id?: number;
          occurred_at?: string;
          table_name?: string;
          row_id?: string | null;
          action?: string;
          actor_id?: string | null;
          actor_user_id?: string | null;
          changes?: Json;
        };
        Relationships: [
          { foreignKeyName: "audit_log_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "staff_members"; referencedColumns: ["id"] },
        ];
      };
      booths: {
        Row: {
          id: string;
          hall_id: string;
          exhibition_id: string;
          code: string;
          x: number;
          y: number;
          width: number;
          depth: number;
          rotation: number;
          polygon: Json | null;
          area_m2: number;
          area_is_manual: boolean;
          open_sides: number;
          zone: string | null;
          status: Database["public"]["Enums"]["booth_status"];
          price_override: number | null;
          notes: string | null;
          import_key: string | null;
          created_at: string;
          updated_at: string;
          deal_id: string | null;
          manager_ids: string[];
          steps: Json;
        };
        Insert: {
          id?: string;
          hall_id: string;
          /** Filled from the hall by a trigger. */
          exhibition_id?: string;
          code: string;
          x: number;
          y: number;
          width: number;
          depth: number;
          rotation?: number;
          polygon?: Json | null;
          area_m2?: number;
          area_is_manual?: boolean;
          open_sides?: number;
          zone?: string | null;
          status?: Database["public"]["Enums"]["booth_status"];
          price_override?: number | null;
          notes?: string | null;
          import_key?: string | null;
          created_at?: string;
          updated_at?: string;
          deal_id?: string | null;
          manager_ids?: string[];
          steps?: Json;
        };
        Update: {
          id?: string;
          hall_id?: string;
          exhibition_id?: string;
          code?: string;
          x?: number;
          y?: number;
          width?: number;
          depth?: number;
          rotation?: number;
          polygon?: Json | null;
          area_m2?: number;
          area_is_manual?: boolean;
          open_sides?: number;
          zone?: string | null;
          status?: Database["public"]["Enums"]["booth_status"];
          price_override?: number | null;
          notes?: string | null;
          import_key?: string | null;
          created_at?: string;
          updated_at?: string;
          deal_id?: string | null;
          manager_ids?: string[];
          steps?: Json;
        };
        Relationships: [
          { foreignKeyName: "booths_deal_id_fkey"; columns: ["deal_id"]; isOneToOne: false; referencedRelation: "deals"; referencedColumns: ["id"] },
          { foreignKeyName: "booths_exhibition_id_fkey"; columns: ["exhibition_id"]; isOneToOne: false; referencedRelation: "exhibitions"; referencedColumns: ["id"] },
          { foreignKeyName: "booths_hall_id_fkey"; columns: ["hall_id"]; isOneToOne: false; referencedRelation: "halls"; referencedColumns: ["id"] },
        ];
      };
      build_permits: {
        Row: {
          id: string;
          exhibition_id: string;
          contractor_id: string;
          deal_id: string | null;
          booth_codes: string[];
          built_area_m2: number | null;
          permit_fee: number | null;
          permit_paid: boolean;
          guarantee_amount: number | null;
          guarantee_method: string | null;
          guarantee_status: Database["public"]["Enums"]["guarantee_status"];
          insurance_received: boolean;
          documents_received: boolean;
          equipment_paid: boolean;
          notes: string | null;
          import_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          exhibition_id: string;
          contractor_id: string;
          deal_id?: string | null;
          booth_codes?: string[];
          built_area_m2?: number | null;
          permit_fee?: number | null;
          permit_paid?: boolean;
          guarantee_amount?: number | null;
          guarantee_method?: string | null;
          guarantee_status?: Database["public"]["Enums"]["guarantee_status"];
          insurance_received?: boolean;
          documents_received?: boolean;
          equipment_paid?: boolean;
          notes?: string | null;
          import_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          exhibition_id?: string;
          contractor_id?: string;
          deal_id?: string | null;
          booth_codes?: string[];
          built_area_m2?: number | null;
          permit_fee?: number | null;
          permit_paid?: boolean;
          guarantee_amount?: number | null;
          guarantee_method?: string | null;
          guarantee_status?: Database["public"]["Enums"]["guarantee_status"];
          insurance_received?: boolean;
          documents_received?: boolean;
          equipment_paid?: boolean;
          notes?: string | null;
          import_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "build_permits_contractor_id_fkey"; columns: ["contractor_id"]; isOneToOne: false; referencedRelation: "companies"; referencedColumns: ["id"] },
          { foreignKeyName: "build_permits_deal_id_fkey"; columns: ["deal_id"]; isOneToOne: false; referencedRelation: "deals"; referencedColumns: ["id"] },
          { foreignKeyName: "build_permits_exhibition_id_fkey"; columns: ["exhibition_id"]; isOneToOne: false; referencedRelation: "exhibitions"; referencedColumns: ["id"] },
        ];
      };
      companies: {
        Row: {
          id: string;
          kind: Database["public"]["Enums"]["company_kind"];
          name_fa: string;
          name_en: string | null;
          legal_name: string | null;
          national_id: string | null;
          economic_code: string | null;
          sector: string | null;
          city: string | null;
          address: string | null;
          website: string | null;
          phone: string | null;
          email: string | null;
          owner_id: string | null;
          priority: string;
          tags: string[];
          notes: string | null;
          import_key: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kind?: Database["public"]["Enums"]["company_kind"];
          name_fa: string;
          name_en?: string | null;
          legal_name?: string | null;
          national_id?: string | null;
          economic_code?: string | null;
          sector?: string | null;
          city?: string | null;
          address?: string | null;
          website?: string | null;
          phone?: string | null;
          email?: string | null;
          owner_id?: string | null;
          priority?: string;
          tags?: string[];
          notes?: string | null;
          import_key?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kind?: Database["public"]["Enums"]["company_kind"];
          name_fa?: string;
          name_en?: string | null;
          legal_name?: string | null;
          national_id?: string | null;
          economic_code?: string | null;
          sector?: string | null;
          city?: string | null;
          address?: string | null;
          website?: string | null;
          phone?: string | null;
          email?: string | null;
          owner_id?: string | null;
          priority?: string;
          tags?: string[];
          notes?: string | null;
          import_key?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "companies_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "staff_members"; referencedColumns: ["id"] },
        ];
      };
      contacts: {
        Row: {
          id: string;
          company_id: string;
          full_name: string;
          job_title: string | null;
          phone: string | null;
          phone_alt: string | null;
          email: string | null;
          is_primary: boolean;
          notes: string | null;
          import_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          full_name: string;
          job_title?: string | null;
          phone?: string | null;
          phone_alt?: string | null;
          email?: string | null;
          is_primary?: boolean;
          notes?: string | null;
          import_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          full_name?: string;
          job_title?: string | null;
          phone?: string | null;
          phone_alt?: string | null;
          email?: string | null;
          is_primary?: boolean;
          notes?: string | null;
          import_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "contacts_company_id_fkey"; columns: ["company_id"]; isOneToOne: false; referencedRelation: "companies"; referencedColumns: ["id"] },
        ];
      };
      deals: {
        Row: {
          id: string;
          exhibition_id: string;
          company_id: string;
          contact_id: string | null;
          owner_id: string | null;
          stage: Database["public"]["Enums"]["deal_stage"];
          source: string | null;
          expected_area_m2: number | null;
          probability: number | null;
          estimated_value: number | null;
          next_follow_up_at: string | null;
          last_contact_at: string | null;
          lost_reason: string | null;
          sponsorship_tier: string | null;
          furniture_notes: string | null;
          furniture_confirmed_at: string | null;
          furniture_confirmed_by: string | null;
          notes: string | null;
          stage_changed_at: string;
          won_at: string | null;
          import_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          exhibition_id: string;
          company_id: string;
          contact_id?: string | null;
          owner_id?: string | null;
          stage?: Database["public"]["Enums"]["deal_stage"];
          source?: string | null;
          expected_area_m2?: number | null;
          probability?: number | null;
          estimated_value?: number | null;
          next_follow_up_at?: string | null;
          last_contact_at?: string | null;
          lost_reason?: string | null;
          sponsorship_tier?: string | null;
          furniture_notes?: string | null;
          furniture_confirmed_at?: string | null;
          furniture_confirmed_by?: string | null;
          notes?: string | null;
          stage_changed_at?: string;
          won_at?: string | null;
          import_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          exhibition_id?: string;
          company_id?: string;
          contact_id?: string | null;
          owner_id?: string | null;
          stage?: Database["public"]["Enums"]["deal_stage"];
          source?: string | null;
          expected_area_m2?: number | null;
          probability?: number | null;
          estimated_value?: number | null;
          next_follow_up_at?: string | null;
          last_contact_at?: string | null;
          lost_reason?: string | null;
          sponsorship_tier?: string | null;
          furniture_notes?: string | null;
          furniture_confirmed_at?: string | null;
          furniture_confirmed_by?: string | null;
          notes?: string | null;
          stage_changed_at?: string;
          won_at?: string | null;
          import_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "deals_company_id_fkey"; columns: ["company_id"]; isOneToOne: false; referencedRelation: "companies"; referencedColumns: ["id"] },
          { foreignKeyName: "deals_contact_id_fkey"; columns: ["contact_id"]; isOneToOne: false; referencedRelation: "contacts"; referencedColumns: ["id"] },
          { foreignKeyName: "deals_exhibition_id_fkey"; columns: ["exhibition_id"]; isOneToOne: false; referencedRelation: "exhibitions"; referencedColumns: ["id"] },
          { foreignKeyName: "deals_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "staff_members"; referencedColumns: ["id"] },
        ];
      };
      equipment_orders: {
        Row: {
          id: string;
          exhibition_id: string;
          booth_id: string | null;
          deal_id: string | null;
          item_id: string;
          quantity: number;
          unit_price: number | null;
          stage: Database["public"]["Enums"]["equipment_stage"];
          delivered_qty: number;
          collected_qty: number;
          damaged_qty: number;
          delivery_due_at: string | null;
          pickup_due_at: string | null;
          delivered_at: string | null;
          collected_at: string | null;
          handled_by: string | null;
          delivered_by: string[];
          collected_by: string[];
          notes: string | null;
          import_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          exhibition_id: string;
          booth_id?: string | null;
          deal_id?: string | null;
          item_id: string;
          quantity: number;
          unit_price?: number | null;
          stage?: Database["public"]["Enums"]["equipment_stage"];
          delivered_qty?: number;
          collected_qty?: number;
          damaged_qty?: number;
          delivery_due_at?: string | null;
          pickup_due_at?: string | null;
          delivered_at?: string | null;
          collected_at?: string | null;
          handled_by?: string | null;
          delivered_by?: string[];
          collected_by?: string[];
          notes?: string | null;
          import_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          exhibition_id?: string;
          booth_id?: string | null;
          deal_id?: string | null;
          item_id?: string;
          quantity?: number;
          unit_price?: number | null;
          stage?: Database["public"]["Enums"]["equipment_stage"];
          delivered_qty?: number;
          collected_qty?: number;
          damaged_qty?: number;
          delivery_due_at?: string | null;
          pickup_due_at?: string | null;
          delivered_at?: string | null;
          collected_at?: string | null;
          handled_by?: string | null;
          delivered_by?: string[];
          collected_by?: string[];
          notes?: string | null;
          import_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "equipment_orders_booth_id_fkey"; columns: ["booth_id"]; isOneToOne: false; referencedRelation: "booths"; referencedColumns: ["id"] },
          { foreignKeyName: "equipment_orders_deal_id_fkey"; columns: ["deal_id"]; isOneToOne: false; referencedRelation: "deals"; referencedColumns: ["id"] },
          { foreignKeyName: "equipment_orders_exhibition_id_fkey"; columns: ["exhibition_id"]; isOneToOne: false; referencedRelation: "exhibitions"; referencedColumns: ["id"] },
          { foreignKeyName: "equipment_orders_handled_by_fkey"; columns: ["handled_by"]; isOneToOne: false; referencedRelation: "staff_members"; referencedColumns: ["id"] },
          { foreignKeyName: "equipment_orders_item_id_fkey"; columns: ["item_id"]; isOneToOne: false; referencedRelation: "inventory_items"; referencedColumns: ["id"] },
        ];
      };
      exhibitions: {
        Row: {
          id: string;
          slug: string;
          name_fa: string;
          name_en: string | null;
          edition: number | null;
          year_label: string | null;
          venue_fa: string | null;
          venue_en: string | null;
          city_fa: string | null;
          city_en: string | null;
          starts_on: string | null;
          ends_on: string | null;
          build_starts_on: string | null;
          strike_ends_on: string | null;
          status: Database["public"]["Enums"]["exhibition_status"];
          color: string;
          currency: Database["public"]["Enums"]["currency_code"];
          vat_rate: number;
          space_rate: number | null;
          booth_build_rate: number | null;
          notes: string | null;
          import_key: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name_fa: string;
          name_en?: string | null;
          edition?: number | null;
          year_label?: string | null;
          venue_fa?: string | null;
          venue_en?: string | null;
          city_fa?: string | null;
          city_en?: string | null;
          starts_on?: string | null;
          ends_on?: string | null;
          build_starts_on?: string | null;
          strike_ends_on?: string | null;
          status?: Database["public"]["Enums"]["exhibition_status"];
          color?: string;
          currency?: Database["public"]["Enums"]["currency_code"];
          vat_rate?: number;
          space_rate?: number | null;
          booth_build_rate?: number | null;
          notes?: string | null;
          import_key?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name_fa?: string;
          name_en?: string | null;
          edition?: number | null;
          year_label?: string | null;
          venue_fa?: string | null;
          venue_en?: string | null;
          city_fa?: string | null;
          city_en?: string | null;
          starts_on?: string | null;
          ends_on?: string | null;
          build_starts_on?: string | null;
          strike_ends_on?: string | null;
          status?: Database["public"]["Enums"]["exhibition_status"];
          color?: string;
          currency?: Database["public"]["Enums"]["currency_code"];
          vat_rate?: number;
          space_rate?: number | null;
          booth_build_rate?: number | null;
          notes?: string | null;
          import_key?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "exhibitions_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "staff_members"; referencedColumns: ["id"] },
        ];
      };
      guest_travel: {
        Row: {
          id: string;
          exhibition_id: string;
          company_id: string | null;
          full_name: string;
          phone: string | null;
          arrival_at: string | null;
          arrival_flight: string | null;
          departure_at: string | null;
          departure_flight: string | null;
          airline: string | null;
          hotel: string | null;
          notes: string | null;
          import_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          exhibition_id: string;
          company_id?: string | null;
          full_name: string;
          phone?: string | null;
          arrival_at?: string | null;
          arrival_flight?: string | null;
          departure_at?: string | null;
          departure_flight?: string | null;
          airline?: string | null;
          hotel?: string | null;
          notes?: string | null;
          import_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          exhibition_id?: string;
          company_id?: string | null;
          full_name?: string;
          phone?: string | null;
          arrival_at?: string | null;
          arrival_flight?: string | null;
          departure_at?: string | null;
          departure_flight?: string | null;
          airline?: string | null;
          hotel?: string | null;
          notes?: string | null;
          import_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "guest_travel_company_id_fkey"; columns: ["company_id"]; isOneToOne: false; referencedRelation: "companies"; referencedColumns: ["id"] },
          { foreignKeyName: "guest_travel_exhibition_id_fkey"; columns: ["exhibition_id"]; isOneToOne: false; referencedRelation: "exhibitions"; referencedColumns: ["id"] },
        ];
      };
      hall_features: {
        Row: {
          id: string;
          hall_id: string;
          exhibition_id: string;
          kind: Database["public"]["Enums"]["feature_kind"];
          label_fa: string | null;
          label_en: string | null;
          x: number;
          y: number;
          width: number;
          depth: number;
          rotation: number;
          polygon: Json | null;
          style: Json;
          import_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          hall_id: string;
          /** Filled from the hall by a trigger. */
          exhibition_id?: string;
          kind: Database["public"]["Enums"]["feature_kind"];
          label_fa?: string | null;
          label_en?: string | null;
          x: number;
          y: number;
          width: number;
          depth: number;
          rotation?: number;
          polygon?: Json | null;
          style?: Json;
          import_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          hall_id?: string;
          exhibition_id?: string;
          kind?: Database["public"]["Enums"]["feature_kind"];
          label_fa?: string | null;
          label_en?: string | null;
          x?: number;
          y?: number;
          width?: number;
          depth?: number;
          rotation?: number;
          polygon?: Json | null;
          style?: Json;
          import_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "hall_features_exhibition_id_fkey"; columns: ["exhibition_id"]; isOneToOne: false; referencedRelation: "exhibitions"; referencedColumns: ["id"] },
          { foreignKeyName: "hall_features_hall_id_fkey"; columns: ["hall_id"]; isOneToOne: false; referencedRelation: "halls"; referencedColumns: ["id"] },
        ];
      };
      halls: {
        Row: {
          id: string;
          exhibition_id: string;
          name_fa: string;
          name_en: string | null;
          width_m: number;
          depth_m: number;
          grid_m: number;
          background_path: string | null;
          background_opacity: number;
          sort_order: number;
          import_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          exhibition_id: string;
          name_fa: string;
          name_en?: string | null;
          width_m: number;
          depth_m: number;
          grid_m?: number;
          background_path?: string | null;
          background_opacity?: number;
          sort_order?: number;
          import_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          exhibition_id?: string;
          name_fa?: string;
          name_en?: string | null;
          width_m?: number;
          depth_m?: number;
          grid_m?: number;
          background_path?: string | null;
          background_opacity?: number;
          sort_order?: number;
          import_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "halls_exhibition_id_fkey"; columns: ["exhibition_id"]; isOneToOne: false; referencedRelation: "exhibitions"; referencedColumns: ["id"] },
        ];
      };
      inventory_items: {
        Row: {
          id: string;
          sku: string;
          item_code: string | null;
          name_fa: string;
          name_en: string | null;
          category: Database["public"]["Enums"]["equipment_category"];
          unit_fa: string;
          unit_en: string;
          returnable: boolean;
          on_hand: number;
          low_stock_threshold: number;
          rental_rate: number | null;
          notes: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sku: string;
          item_code?: string | null;
          name_fa: string;
          name_en?: string | null;
          category?: Database["public"]["Enums"]["equipment_category"];
          unit_fa?: string;
          unit_en?: string;
          returnable?: boolean;
          on_hand?: number;
          low_stock_threshold?: number;
          rental_rate?: number | null;
          notes?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sku?: string;
          item_code?: string | null;
          name_fa?: string;
          name_en?: string | null;
          category?: Database["public"]["Enums"]["equipment_category"];
          unit_fa?: string;
          unit_en?: string;
          returnable?: boolean;
          on_hand?: number;
          low_stock_threshold?: number;
          rental_rate?: number | null;
          notes?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      invoice_lines: {
        Row: {
          id: string;
          invoice_id: string;
          service: Database["public"]["Enums"]["service_kind"];
          description: string | null;
          booth_id: string | null;
          quantity: number;
          unit: string;
          unit_price: number;
          discount: number;
          sort_order: number;
          import_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          service: Database["public"]["Enums"]["service_kind"];
          description?: string | null;
          booth_id?: string | null;
          quantity?: number;
          unit?: string;
          unit_price: number;
          discount?: number;
          sort_order?: number;
          import_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          service?: Database["public"]["Enums"]["service_kind"];
          description?: string | null;
          booth_id?: string | null;
          quantity?: number;
          unit?: string;
          unit_price?: number;
          discount?: number;
          sort_order?: number;
          import_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "invoice_lines_booth_id_fkey"; columns: ["booth_id"]; isOneToOne: false; referencedRelation: "booths"; referencedColumns: ["id"] },
          { foreignKeyName: "invoice_lines_invoice_id_fkey"; columns: ["invoice_id"]; isOneToOne: false; referencedRelation: "invoices"; referencedColumns: ["id"] },
        ];
      };
      invoices: {
        Row: {
          id: string;
          exhibition_id: string;
          company_id: string;
          deal_id: string | null;
          kind: Database["public"]["Enums"]["invoice_kind"];
          number: string | null;
          status: Database["public"]["Enums"]["invoice_status"];
          official: boolean;
          issued_on: string | null;
          due_on: string | null;
          currency: Database["public"]["Enums"]["currency_code"];
          vat_rate: number;
          notes: string | null;
          import_key: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          exhibition_id: string;
          company_id: string;
          deal_id?: string | null;
          kind?: Database["public"]["Enums"]["invoice_kind"];
          number?: string | null;
          status?: Database["public"]["Enums"]["invoice_status"];
          official?: boolean;
          issued_on?: string | null;
          due_on?: string | null;
          currency?: Database["public"]["Enums"]["currency_code"];
          vat_rate?: number;
          notes?: string | null;
          import_key?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          exhibition_id?: string;
          company_id?: string;
          deal_id?: string | null;
          kind?: Database["public"]["Enums"]["invoice_kind"];
          number?: string | null;
          status?: Database["public"]["Enums"]["invoice_status"];
          official?: boolean;
          issued_on?: string | null;
          due_on?: string | null;
          currency?: Database["public"]["Enums"]["currency_code"];
          vat_rate?: number;
          notes?: string | null;
          import_key?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "invoices_company_id_fkey"; columns: ["company_id"]; isOneToOne: false; referencedRelation: "companies"; referencedColumns: ["id"] },
          { foreignKeyName: "invoices_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "staff_members"; referencedColumns: ["id"] },
          { foreignKeyName: "invoices_deal_id_fkey"; columns: ["deal_id"]; isOneToOne: false; referencedRelation: "deals"; referencedColumns: ["id"] },
          { foreignKeyName: "invoices_exhibition_id_fkey"; columns: ["exhibition_id"]; isOneToOne: false; referencedRelation: "exhibitions"; referencedColumns: ["id"] },
        ];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          actor_id: string | null;
          kind: string;
          title: string;
          body: string | null;
          link: string | null;
          entity_type: string | null;
          entity_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          actor_id?: string | null;
          kind: string;
          title: string;
          body?: string | null;
          link?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          actor_id?: string | null;
          kind?: string;
          title?: string;
          body?: string | null;
          link?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "notifications_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "staff_members"; referencedColumns: ["id"] },
          { foreignKeyName: "notifications_recipient_id_fkey"; columns: ["recipient_id"]; isOneToOne: false; referencedRelation: "staff_members"; referencedColumns: ["id"] },
        ];
      };
      payments: {
        Row: {
          id: string;
          company_id: string;
          deal_id: string | null;
          invoice_id: string | null;
          amount: number;
          currency: Database["public"]["Enums"]["currency_code"];
          paid_on: string;
          method: Database["public"]["Enums"]["payment_method"];
          reference: string | null;
          notes: string | null;
          recorded_by: string | null;
          voided_at: string | null;
          void_reason: string | null;
          import_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          deal_id?: string | null;
          invoice_id?: string | null;
          amount: number;
          currency?: Database["public"]["Enums"]["currency_code"];
          paid_on?: string;
          method?: Database["public"]["Enums"]["payment_method"];
          reference?: string | null;
          notes?: string | null;
          recorded_by?: string | null;
          voided_at?: string | null;
          void_reason?: string | null;
          import_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          deal_id?: string | null;
          invoice_id?: string | null;
          amount?: number;
          currency?: Database["public"]["Enums"]["currency_code"];
          paid_on?: string;
          method?: Database["public"]["Enums"]["payment_method"];
          reference?: string | null;
          notes?: string | null;
          recorded_by?: string | null;
          voided_at?: string | null;
          void_reason?: string | null;
          import_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "payments_company_id_fkey"; columns: ["company_id"]; isOneToOne: false; referencedRelation: "companies"; referencedColumns: ["id"] },
          { foreignKeyName: "payments_deal_id_fkey"; columns: ["deal_id"]; isOneToOne: false; referencedRelation: "deals"; referencedColumns: ["id"] },
          { foreignKeyName: "payments_invoice_id_fkey"; columns: ["invoice_id"]; isOneToOne: false; referencedRelation: "invoices"; referencedColumns: ["id"] },
          { foreignKeyName: "payments_recorded_by_fkey"; columns: ["recorded_by"]; isOneToOne: false; referencedRelation: "staff_members"; referencedColumns: ["id"] },
        ];
      };
      problems: {
        Row: {
          id: string;
          exhibition_id: string;
          booth_id: string | null;
          deal_id: string | null;
          order_id: string | null;
          step: Database["public"]["Enums"]["problem_step"];
          note: string | null;
          raised_by: string | null;
          raised_at: string;
          assignee_id: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          resolution: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          exhibition_id: string;
          booth_id?: string | null;
          deal_id?: string | null;
          order_id?: string | null;
          step?: Database["public"]["Enums"]["problem_step"];
          note?: string | null;
          raised_by?: string | null;
          raised_at?: string;
          assignee_id?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          resolution?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          exhibition_id?: string;
          booth_id?: string | null;
          deal_id?: string | null;
          order_id?: string | null;
          step?: Database["public"]["Enums"]["problem_step"];
          note?: string | null;
          raised_by?: string | null;
          raised_at?: string;
          assignee_id?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          resolution?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "problems_booth_id_fkey"; columns: ["booth_id"]; isOneToOne: false; referencedRelation: "booths"; referencedColumns: ["id"] },
          { foreignKeyName: "problems_deal_id_fkey"; columns: ["deal_id"]; isOneToOne: false; referencedRelation: "deals"; referencedColumns: ["id"] },
          { foreignKeyName: "problems_exhibition_id_fkey"; columns: ["exhibition_id"]; isOneToOne: false; referencedRelation: "exhibitions"; referencedColumns: ["id"] },
          { foreignKeyName: "problems_order_id_fkey"; columns: ["order_id"]; isOneToOne: false; referencedRelation: "equipment_orders"; referencedColumns: ["id"] },
        ];
      };
      staff_members: {
        Row: {
          id: string;
          user_id: string | null;
          email: string;
          display_name: string | null;
          job_title: string | null;
          role: Database["public"]["Enums"]["staff_role"];
          departments: Database["public"]["Enums"]["department"][];
          status: Database["public"]["Enums"]["staff_status"];
          phone: string | null;
          avatar_url: string | null;
          locale: string;
          invited_by: string | null;
          last_seen_at: string | null;
          bio: string | null;
          start_date: string | null;
          skills: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          email: string;
          display_name?: string | null;
          job_title?: string | null;
          role?: Database["public"]["Enums"]["staff_role"];
          departments?: Database["public"]["Enums"]["department"][];
          status?: Database["public"]["Enums"]["staff_status"];
          phone?: string | null;
          avatar_url?: string | null;
          locale?: string;
          invited_by?: string | null;
          last_seen_at?: string | null;
          bio?: string | null;
          start_date?: string | null;
          skills?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          email?: string;
          display_name?: string | null;
          job_title?: string | null;
          role?: Database["public"]["Enums"]["staff_role"];
          departments?: Database["public"]["Enums"]["department"][];
          status?: Database["public"]["Enums"]["staff_status"];
          phone?: string | null;
          avatar_url?: string | null;
          locale?: string;
          invited_by?: string | null;
          last_seen_at?: string | null;
          bio?: string | null;
          start_date?: string | null;
          skills?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "staff_members_invited_by_fkey"; columns: ["invited_by"]; isOneToOne: false; referencedRelation: "staff_members"; referencedColumns: ["id"] },
        ];
      };
      teams: {
        Row: {
          id: string;
          name_fa: string;
          name_en: string | null;
          description: string | null;
          color: string;
          lead_id: string | null;
          member_ids: string[];
          exhibition_id: string | null;
          sort_order: number;
          archived_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name_fa: string;
          name_en?: string | null;
          description?: string | null;
          color?: string;
          lead_id?: string | null;
          member_ids?: string[];
          exhibition_id?: string | null;
          sort_order?: number;
          archived_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name_fa?: string;
          name_en?: string | null;
          description?: string | null;
          color?: string;
          lead_id?: string | null;
          member_ids?: string[];
          exhibition_id?: string | null;
          sort_order?: number;
          archived_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "teams_lead_id_fkey"; columns: ["lead_id"]; isOneToOne: false; referencedRelation: "staff_members"; referencedColumns: ["id"] },
          { foreignKeyName: "teams_exhibition_id_fkey"; columns: ["exhibition_id"]; isOneToOne: false; referencedRelation: "exhibitions"; referencedColumns: ["id"] },
        ];
      };
      task_comments: {
        Row: {
          id: string;
          task_id: string;
          author_id: string | null;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          author_id?: string | null;
          body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          author_id?: string | null;
          body?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "task_comments_author_id_fkey"; columns: ["author_id"]; isOneToOne: false; referencedRelation: "staff_members"; referencedColumns: ["id"] },
          { foreignKeyName: "task_comments_task_id_fkey"; columns: ["task_id"]; isOneToOne: false; referencedRelation: "tasks"; referencedColumns: ["id"] },
        ];
      };
      tasks: {
        Row: {
          id: string;
          exhibition_id: string | null;
          title: string;
          description: string | null;
          status: Database["public"]["Enums"]["task_status"];
          priority: Database["public"]["Enums"]["task_priority"];
          assignee_id: string | null;
          created_by: string | null;
          due_at: string | null;
          started_at: string | null;
          completed_at: string | null;
          booth_id: string | null;
          deal_id: string | null;
          company_id: string | null;
          checklist: Json;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          exhibition_id?: string | null;
          title: string;
          description?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          priority?: Database["public"]["Enums"]["task_priority"];
          assignee_id?: string | null;
          created_by?: string | null;
          due_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          booth_id?: string | null;
          deal_id?: string | null;
          company_id?: string | null;
          checklist?: Json;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          exhibition_id?: string | null;
          title?: string;
          description?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          priority?: Database["public"]["Enums"]["task_priority"];
          assignee_id?: string | null;
          created_by?: string | null;
          due_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          booth_id?: string | null;
          deal_id?: string | null;
          company_id?: string | null;
          checklist?: Json;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "tasks_assignee_id_fkey"; columns: ["assignee_id"]; isOneToOne: false; referencedRelation: "staff_members"; referencedColumns: ["id"] },
          { foreignKeyName: "tasks_booth_id_fkey"; columns: ["booth_id"]; isOneToOne: false; referencedRelation: "booths"; referencedColumns: ["id"] },
          { foreignKeyName: "tasks_company_id_fkey"; columns: ["company_id"]; isOneToOne: false; referencedRelation: "companies"; referencedColumns: ["id"] },
          { foreignKeyName: "tasks_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "staff_members"; referencedColumns: ["id"] },
          { foreignKeyName: "tasks_deal_id_fkey"; columns: ["deal_id"]; isOneToOne: false; referencedRelation: "deals"; referencedColumns: ["id"] },
          { foreignKeyName: "tasks_exhibition_id_fkey"; columns: ["exhibition_id"]; isOneToOne: false; referencedRelation: "exhibitions"; referencedColumns: ["id"] },
        ];
      };
    };
    Views: {
      deal_balances: {
        Row: {
          deal_id: string | null;
          exhibition_id: string | null;
          company_id: string | null;
          invoiced: number | null;
          paid: number | null;
          balance: number | null;
        };
        Relationships: [];
      };
      inventory_allocation: {
        Row: {
          item_id: string | null;
          exhibition_id: string | null;
          on_hand: number | null;
          allocated: number | null;
          available: number | null;
          awaiting_collection: number | null;
        };
        Relationships: [];
      };
      invoice_totals: {
        Row: {
          invoice_id: string | null;
          exhibition_id: string | null;
          company_id: string | null;
          deal_id: string | null;
          currency: Database["public"]["Enums"]["currency_code"] | null;
          subtotal: number | null;
          vat: number | null;
          total: number | null;
          paid: number | null;
          balance: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      current_staff_id: { Args: Record<PropertyKey, never>; Returns: string };
      has_role: { Args: { minimum: Database["public"]["Enums"]["staff_role"] }; Returns: boolean };
      is_staff: { Args: Record<PropertyKey, never>; Returns: boolean };
      in_department: { Args: { dept: Database["public"]["Enums"]["department"] }; Returns: boolean };
      can_manage_finance: { Args: Record<PropertyKey, never>; Returns: boolean };
      mark_notifications_read: { Args: { p_ids?: string[] }; Returns: number };
      set_my_avatar: { Args: { p_avatar: string | null }; Returns: Database["public"]["Tables"]["staff_members"]["Row"] };
      update_my_profile: { Args: { p_display_name?: string; p_job_title?: string; p_phone?: string; p_locale?: string; p_bio?: string; p_skills?: string[] }; Returns: Database["public"]["Tables"]["staff_members"]["Row"] };
    };
    Enums: {
      activity_kind: "call" | "sms" | "email" | "meeting" | "message" | "visit" | "note" | "system";
      booth_status: "available" | "held" | "reserved" | "contracted" | "paid" | "blocked";
      company_kind: "exhibitor" | "contractor" | "supplier" | "sponsor" | "partner";
      currency_code: "IRR" | "IRT" | "USD" | "EUR" | "AED";
      deal_stage: "lead" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
      department: "executive" | "sales" | "operations" | "finance" | "logistics" | "marketing";
      equipment_category: "furniture" | "av" | "appliance" | "cooling" | "electrical" | "lighting" | "connectivity" | "signage" | "other";
      problem_step: "furniture_list" | "build" | "power" | "delivery" | "handover" | "collection" | "clearance" | "payment" | "other";
      equipment_stage: "requested" | "reserved" | "prepared" | "delivered" | "collected" | "issue" | "cancelled";
      exhibition_status: "planning" | "selling" | "build" | "live" | "strike" | "closed" | "archived";
      feature_kind: "column" | "wall" | "door" | "entrance" | "loading" | "aisle" | "zone" | "stage" | "service" | "utility" | "label";
      guarantee_status: "pending" | "received" | "released" | "forfeited";
      invoice_kind: "proforma" | "final";
      invoice_status: "draft" | "issued" | "registered" | "cancelled";
      payment_method: "bank_transfer" | "pos" | "cash" | "cheque" | "other";
      service_kind: "space" | "booth_build" | "flooring" | "partition" | "equipment" | "sponsorship" | "other";
      staff_role: "owner" | "admin" | "manager" | "member" | "viewer";
      staff_status: "invited" | "active" | "suspended";
      task_priority: "low" | "normal" | "high" | "urgent";
      task_status: "todo" | "in_progress" | "blocked" | "done" | "cancelled";
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export const Constants = {
  public: {
    Enums: {
      activity_kind: ["call", "sms", "email", "meeting", "message", "visit", "note", "system"],
      booth_status: ["available", "held", "reserved", "contracted", "paid", "blocked"],
      company_kind: ["exhibitor", "contractor", "supplier", "sponsor", "partner"],
      currency_code: ["IRR", "IRT", "USD", "EUR", "AED"],
      deal_stage: ["lead", "contacted", "qualified", "proposal", "negotiation", "won", "lost"],
      department: ["executive", "sales", "operations", "finance", "logistics", "marketing"],
      equipment_category: ["furniture", "av", "appliance", "cooling", "electrical", "lighting", "connectivity", "signage", "other"],
      problem_step: ["furniture_list", "build", "power", "delivery", "handover", "collection", "clearance", "payment", "other"],
      equipment_stage: ["requested", "reserved", "prepared", "delivered", "collected", "issue", "cancelled"],
      exhibition_status: ["planning", "selling", "build", "live", "strike", "closed", "archived"],
      feature_kind: ["column", "wall", "door", "entrance", "loading", "aisle", "zone", "stage", "service", "utility", "label"],
      guarantee_status: ["pending", "received", "released", "forfeited"],
      invoice_kind: ["proforma", "final"],
      invoice_status: ["draft", "issued", "registered", "cancelled"],
      payment_method: ["bank_transfer", "pos", "cash", "cheque", "other"],
      service_kind: ["space", "booth_build", "flooring", "partition", "equipment", "sponsorship", "other"],
      staff_role: ["owner", "admin", "manager", "member", "viewer"],
      staff_status: ["invited", "active", "suspended"],
      task_priority: ["low", "normal", "high", "urgent"],
      task_status: ["todo", "in_progress", "blocked", "done", "cancelled"],
    },
  },
} as const;
