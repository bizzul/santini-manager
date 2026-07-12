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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      _RolesToTimetracking: {
        Row: {
          A: number
          B: number
        }
        Insert: {
          A: number
          B: number
        }
        Update: {
          A?: number
          B?: number
        }
        Relationships: [
          {
            foreignKeyName: "_RolesToTimetracking_A_fkey"
            columns: ["A"]
            isOneToOne: false
            referencedRelation: "Roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "_RolesToTimetracking_B_fkey"
            columns: ["B"]
            isOneToOne: false
            referencedRelation: "Timetracking"
            referencedColumns: ["id"]
          },
        ]
      }
      _RolesToUser: {
        Row: {
          A: number
          B: number
        }
        Insert: {
          A: number
          B: number
        }
        Update: {
          A?: number
          B?: number
        }
        Relationships: [
          {
            foreignKeyName: "_RolesToUser_A_fkey"
            columns: ["A"]
            isOneToOne: false
            referencedRelation: "Roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "_RolesToUser_B_fkey"
            columns: ["B"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Action: {
        Row: {
          clientId: number | null
          createdAt: string
          data: Json
          id: number
          organization_id: string | null
          productId: number | null
          site_id: string | null
          supplierId: number | null
          taskId: number | null
          type: string
          user_id: string | null
        }
        Insert: {
          clientId?: number | null
          createdAt?: string
          data: Json
          id?: number
          organization_id?: string | null
          productId?: number | null
          site_id?: string | null
          supplierId?: number | null
          taskId?: number | null
          type: string
          user_id?: string | null
        }
        Update: {
          clientId?: number | null
          createdAt?: string
          data?: Json
          id?: number
          organization_id?: string | null
          productId?: number | null
          site_id?: string | null
          supplierId?: number | null
          taskId?: number | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Action_clientId_fkey"
            columns: ["clientId"]
            isOneToOne: false
            referencedRelation: "Client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Action_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Action_productId_fkey"
            columns: ["productId"]
            isOneToOne: false
            referencedRelation: "Product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Action_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Action_taskId_fkey"
            columns: ["taskId"]
            isOneToOne: false
            referencedRelation: "Task"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Action_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["authId"]
          },
        ]
      }
      ambiti: {
        Row: {
          colore: string
          deleted_at: string | null
          id: string
          nome: string
          ordine: number
          site_id: string
        }
        Insert: {
          colore?: string
          deleted_at?: string | null
          id?: string
          nome: string
          ordine?: number
          site_id: string
        }
        Update: {
          colore?: string
          deleted_at?: string | null
          id?: string
          nome?: string
          ordine?: number
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambiti_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      aree_vita: {
        Row: {
          colore: string
          created_at: string
          deleted_at: string | null
          id: string
          nome: string
          ordine: number
          punteggio: number | null
          slug: string
          utente_id: string
        }
        Insert: {
          colore: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome: string
          ordine?: number
          punteggio?: number | null
          slug: string
          utente_id: string
        }
        Update: {
          colore?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome?: string
          ordine?: number
          punteggio?: number | null
          slug?: string
          utente_id?: string
        }
        Relationships: []
      }
      attendance_entries: {
        Row: {
          auto_detected: boolean | null
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          notes: string | null
          site_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_detected?: boolean | null
          created_at?: string | null
          created_by?: string | null
          date: string
          id?: string
          notes?: string | null
          site_id: string
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_detected?: boolean | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          site_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_entries_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      attivita: {
        Row: {
          ambito_id: string
          codice: string
          created_at: string
          data_stato: string
          deleted_at: string | null
          id: string
          note: string | null
          progetto_id: string | null
          site_id: string
          sotto_stato: string | null
          spazio: Database["public"]["Enums"]["attivita_spazio"]
          stato: Database["public"]["Enums"]["attivita_stato"]
          titolo: string
          updated_at: string
        }
        Insert: {
          ambito_id: string
          codice: string
          created_at?: string
          data_stato?: string
          deleted_at?: string | null
          id?: string
          note?: string | null
          progetto_id?: string | null
          site_id: string
          sotto_stato?: string | null
          spazio?: Database["public"]["Enums"]["attivita_spazio"]
          stato?: Database["public"]["Enums"]["attivita_stato"]
          titolo: string
          updated_at?: string
        }
        Update: {
          ambito_id?: string
          codice?: string
          created_at?: string
          data_stato?: string
          deleted_at?: string | null
          id?: string
          note?: string | null
          progetto_id?: string | null
          site_id?: string
          sotto_stato?: string | null
          spazio?: Database["public"]["Enums"]["attivita_spazio"]
          stato?: Database["public"]["Enums"]["attivita_stato"]
          titolo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attivita_ambito_id_fkey"
            columns: ["ambito_id"]
            isOneToOne: false
            referencedRelation: "ambiti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attivita_progetto_id_fkey"
            columns: ["progetto_id"]
            isOneToOne: false
            referencedRelation: "progetti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attivita_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      attivita_aziende: {
        Row: {
          attivita_id: string
          azienda_id: string
        }
        Insert: {
          attivita_id: string
          azienda_id: string
        }
        Update: {
          attivita_id?: string
          azienda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attivita_aziende_attivita_id_fkey"
            columns: ["attivita_id"]
            isOneToOne: false
            referencedRelation: "attivita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attivita_aziende_attivita_id_fkey"
            columns: ["attivita_id"]
            isOneToOne: false
            referencedRelation: "v_attivita_board"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attivita_aziende_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attivita_aziende_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "v_carico_aziende"
            referencedColumns: ["id"]
          },
        ]
      }
      attivita_persone: {
        Row: {
          attivita_id: string
          persona_id: string
          ruolo: string | null
        }
        Insert: {
          attivita_id: string
          persona_id: string
          ruolo?: string | null
        }
        Update: {
          attivita_id?: string
          persona_id?: string
          ruolo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attivita_persone_attivita_id_fkey"
            columns: ["attivita_id"]
            isOneToOne: false
            referencedRelation: "attivita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attivita_persone_attivita_id_fkey"
            columns: ["attivita_id"]
            isOneToOne: false
            referencedRelation: "v_attivita_board"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attivita_persone_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attivita_persone_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_carico_persone"
            referencedColumns: ["id"]
          },
        ]
      }
      attivita_progetti: {
        Row: {
          attivita_id: string
          progetto_id: string
        }
        Insert: {
          attivita_id: string
          progetto_id: string
        }
        Update: {
          attivita_id?: string
          progetto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attivita_progetti_attivita_id_fkey"
            columns: ["attivita_id"]
            isOneToOne: false
            referencedRelation: "attivita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attivita_progetti_attivita_id_fkey"
            columns: ["attivita_id"]
            isOneToOne: false
            referencedRelation: "v_attivita_board"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attivita_progetti_progetto_id_fkey"
            columns: ["progetto_id"]
            isOneToOne: false
            referencedRelation: "progetti"
            referencedColumns: ["id"]
          },
        ]
      }
      attivita_transizioni: {
        Row: {
          attivita_id: string
          created_at: string
          giorni_nello_stato_precedente: number | null
          id: string
          stato_a: Database["public"]["Enums"]["attivita_stato"]
          stato_da: Database["public"]["Enums"]["attivita_stato"] | null
        }
        Insert: {
          attivita_id: string
          created_at?: string
          giorni_nello_stato_precedente?: number | null
          id?: string
          stato_a: Database["public"]["Enums"]["attivita_stato"]
          stato_da?: Database["public"]["Enums"]["attivita_stato"] | null
        }
        Update: {
          attivita_id?: string
          created_at?: string
          giorni_nello_stato_precedente?: number | null
          id?: string
          stato_a?: Database["public"]["Enums"]["attivita_stato"]
          stato_da?: Database["public"]["Enums"]["attivita_stato"] | null
        }
        Relationships: [
          {
            foreignKeyName: "attivita_transizioni_attivita_id_fkey"
            columns: ["attivita_id"]
            isOneToOne: false
            referencedRelation: "attivita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attivita_transizioni_attivita_id_fkey"
            columns: ["attivita_id"]
            isOneToOne: false
            referencedRelation: "v_attivita_board"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      aziende: {
        Row: {
          deleted_at: string | null
          id: string
          nome: string
          site_id: string
          tipo: string | null
        }
        Insert: {
          deleted_at?: string | null
          id?: string
          nome: string
          site_id: string
          tipo?: string | null
        }
        Update: {
          deleted_at?: string | null
          id?: string
          nome?: string
          site_id?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aziende_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      Checklist_item: {
        Row: {
          created_at: string
          id: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      Client: {
        Row: {
          address: string | null
          addressExtra: string | null
          addressSecondary: string | null
          businessName: string | null
          city: string | null
          clientLanguage: string | null
          clientType: Database["public"]["Enums"]["ClientType"]
          code: string
          contactPeople: Json
          countryCode: string | null
          email: string | null
          id: number
          individualFirstName: string | null
          individualLastName: string | null
          individualTitle: string | null
          landlinePhone: string | null
          latitude: number | null
          logoUrl: string | null
          longitude: number | null
          mobilePhone: string | null
          organization_id: string | null
          site_id: string | null
          zipCode: number | null
        }
        Insert: {
          address?: string | null
          addressExtra?: string | null
          addressSecondary?: string | null
          businessName?: string | null
          city?: string | null
          clientLanguage?: string | null
          clientType?: Database["public"]["Enums"]["ClientType"]
          code: string
          contactPeople?: Json
          countryCode?: string | null
          email?: string | null
          id?: number
          individualFirstName?: string | null
          individualLastName?: string | null
          individualTitle?: string | null
          landlinePhone?: string | null
          latitude?: number | null
          logoUrl?: string | null
          longitude?: number | null
          mobilePhone?: string | null
          organization_id?: string | null
          site_id?: string | null
          zipCode?: number | null
        }
        Update: {
          address?: string | null
          addressExtra?: string | null
          addressSecondary?: string | null
          businessName?: string | null
          city?: string | null
          clientLanguage?: string | null
          clientType?: Database["public"]["Enums"]["ClientType"]
          code?: string
          contactPeople?: Json
          countryCode?: string | null
          email?: string | null
          id?: number
          individualFirstName?: string | null
          individualLastName?: string | null
          individualTitle?: string | null
          landlinePhone?: string | null
          latitude?: number | null
          logoUrl?: string | null
          longitude?: number | null
          mobilePhone?: string | null
          organization_id?: string | null
          site_id?: string | null
          zipCode?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "Client_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Client_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      ClientAddress: {
        Row: {
          address: string | null
          addressExtra: string | null
          city: string | null
          clientId: number | null
          countryCode: string | null
          email: string | null
          id: number
          lastName: string | null
          latitude: number | null
          longitude: number | null
          mobile: string | null
          name: string | null
          phone: string | null
          type: Database["public"]["Enums"]["ClientAddressType"]
          typeDetail: string | null
          zipCode: number | null
        }
        Insert: {
          address?: string | null
          addressExtra?: string | null
          city?: string | null
          clientId?: number | null
          countryCode?: string | null
          email?: string | null
          id?: number
          lastName?: string | null
          latitude?: number | null
          longitude?: number | null
          mobile?: string | null
          name?: string | null
          phone?: string | null
          type?: Database["public"]["Enums"]["ClientAddressType"]
          typeDetail?: string | null
          zipCode?: number | null
        }
        Update: {
          address?: string | null
          addressExtra?: string | null
          city?: string | null
          clientId?: number | null
          countryCode?: string | null
          email?: string | null
          id?: number
          lastName?: string | null
          latitude?: number | null
          longitude?: number | null
          mobile?: string | null
          name?: string | null
          phone?: string | null
          type?: Database["public"]["Enums"]["ClientAddressType"]
          typeDetail?: string | null
          zipCode?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ClientAddress_clientId_fkey"
            columns: ["clientId"]
            isOneToOne: false
            referencedRelation: "Client"
            referencedColumns: ["id"]
          },
        ]
      }
      code_sequences: {
        Row: {
          category_id: number | null
          created_at: string | null
          current_value: number | null
          id: number
          sequence_type: string
          site_id: string
          updated_at: string | null
          year: number
        }
        Insert: {
          category_id?: number | null
          created_at?: string | null
          current_value?: number | null
          id?: number
          sequence_type: string
          site_id: string
          updated_at?: string | null
          year: number
        }
        Update: {
          category_id?: number | null
          created_at?: string | null
          current_value?: number | null
          id?: number
          sequence_type?: string
          site_id?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "code_sequences_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "KanbanCategory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "code_sequences_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_3d_scenes: {
        Row: {
          answers: Json
          created_at: string
          created_by: string | null
          format: string
          id: string
          name: string
          scene_config: Json
          site_id: string
          status: string
          updated_at: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          created_by?: string | null
          format?: string
          id?: string
          name?: string
          scene_config?: Json
          site_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          created_at?: string
          created_by?: string | null
          format?: string
          id?: string
          name?: string
          scene_config?: Json
          site_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_3d_scenes_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_access_events: {
        Row: {
          access_token_id: string | null
          city: string | null
          country: string | null
          created_at: string
          customer_company_snapshot: string | null
          customer_name_snapshot: string | null
          event_metadata: Json
          event_type: string
          id: string
          ip_address: unknown
          landing_path: string | null
          redirect_path: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          workspace_id: string
        }
        Insert: {
          access_token_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          customer_company_snapshot?: string | null
          customer_name_snapshot?: string | null
          event_metadata?: Json
          event_type: string
          id?: string
          ip_address?: unknown
          landing_path?: string | null
          redirect_path?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          workspace_id: string
        }
        Update: {
          access_token_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          customer_company_snapshot?: string | null
          customer_name_snapshot?: string | null
          event_metadata?: Json
          event_type?: string
          id?: string
          ip_address?: unknown
          landing_path?: string | null
          redirect_path?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_access_events_access_token_id_fkey"
            columns: ["access_token_id"]
            isOneToOne: false
            referencedRelation: "demo_access_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_access_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "demo_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_access_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          label: string | null
          last_used_at: string | null
          max_uses: number | null
          redirect_path: string
          revoked_at: string | null
          token_hash: string
          use_policy: string
          uses_count: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          label?: string | null
          last_used_at?: string | null
          max_uses?: number | null
          redirect_path?: string
          revoked_at?: string | null
          token_hash: string
          use_policy?: string
          uses_count?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          label?: string | null
          last_used_at?: string | null
          max_uses?: number | null
          redirect_path?: string
          revoked_at?: string | null
          token_hash?: string
          use_policy?: string
          uses_count?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_access_tokens_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "demo_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_workspaces: {
        Row: {
          branding_config: Json
          created_at: string
          created_by: string | null
          customer_company: string | null
          customer_contact_email: string | null
          customer_contact_name: string | null
          customer_name: string
          demo_user_id: string
          display_name: string
          expires_at: string | null
          first_landing_view_at: string | null
          first_login_at: string | null
          id: string
          landing_config: Json
          landing_view_count: number
          last_accessed_at: string | null
          last_ip_address: unknown
          last_login_at: string | null
          last_magic_link_at: string | null
          last_user_agent: string | null
          login_count: number
          magic_link_count: number
          notes: string | null
          organization_id: string
          scenario_type: string
          sector_key: string
          seed_config: Json
          site_id: string
          status: string
          template_key: string
          updated_at: string
        }
        Insert: {
          branding_config?: Json
          created_at?: string
          created_by?: string | null
          customer_company?: string | null
          customer_contact_email?: string | null
          customer_contact_name?: string | null
          customer_name: string
          demo_user_id: string
          display_name: string
          expires_at?: string | null
          first_landing_view_at?: string | null
          first_login_at?: string | null
          id?: string
          landing_config?: Json
          landing_view_count?: number
          last_accessed_at?: string | null
          last_ip_address?: unknown
          last_login_at?: string | null
          last_magic_link_at?: string | null
          last_user_agent?: string | null
          login_count?: number
          magic_link_count?: number
          notes?: string | null
          organization_id: string
          scenario_type?: string
          sector_key: string
          seed_config?: Json
          site_id: string
          status?: string
          template_key: string
          updated_at?: string
        }
        Update: {
          branding_config?: Json
          created_at?: string
          created_by?: string | null
          customer_company?: string | null
          customer_contact_email?: string | null
          customer_contact_name?: string | null
          customer_name?: string
          demo_user_id?: string
          display_name?: string
          expires_at?: string | null
          first_landing_view_at?: string | null
          first_login_at?: string | null
          id?: string
          landing_config?: Json
          landing_view_count?: number
          last_accessed_at?: string | null
          last_ip_address?: unknown
          last_login_at?: string | null
          last_magic_link_at?: string | null
          last_user_agent?: string | null
          login_count?: number
          magic_link_count?: number
          notes?: string | null
          organization_id?: string
          scenario_type?: string
          sector_key?: string
          seed_config?: Json
          site_id?: string
          status?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_workspaces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_workspaces_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      Department: {
        Row: {
          created_at: string
          description: string
          id: number
          name: string
          site_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: number
          name: string
          site_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: number
          name?: string
          site_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "Department_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      documenti: {
        Row: {
          allegati: Json
          anno: number | null
          cliente_id: number | null
          condizioni_pagamento: string[] | null
          corpo_testo: string | null
          created_at: string
          destinatario: Json
          id: string
          iva: number | null
          note: string | null
          numero: string | null
          oggetto: string | null
          pdf_storage_path: string | null
          pdf_url: string | null
          site_id: string
          source_text: string | null
          status: string
          task_id: number | null
          termine_fornitura: string | null
          tipo_documento: string
          tot_netto: number | null
          totale_chf: number | null
          updated_at: string
        }
        Insert: {
          allegati?: Json
          anno?: number | null
          cliente_id?: number | null
          condizioni_pagamento?: string[] | null
          corpo_testo?: string | null
          created_at?: string
          destinatario?: Json
          id?: string
          iva?: number | null
          note?: string | null
          numero?: string | null
          oggetto?: string | null
          pdf_storage_path?: string | null
          pdf_url?: string | null
          site_id: string
          source_text?: string | null
          status?: string
          task_id?: number | null
          termine_fornitura?: string | null
          tipo_documento: string
          tot_netto?: number | null
          totale_chf?: number | null
          updated_at?: string
        }
        Update: {
          allegati?: Json
          anno?: number | null
          cliente_id?: number | null
          condizioni_pagamento?: string[] | null
          corpo_testo?: string | null
          created_at?: string
          destinatario?: Json
          id?: string
          iva?: number | null
          note?: string | null
          numero?: string | null
          oggetto?: string | null
          pdf_storage_path?: string | null
          pdf_url?: string | null
          site_id?: string
          source_text?: string | null
          status?: string
          task_id?: number | null
          termine_fornitura?: string | null
          tipo_documento?: string
          tot_netto?: number | null
          totale_chf?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documenti_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "Client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documenti_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documenti_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "Task"
            referencedColumns: ["id"]
          },
        ]
      }
      Errortracking: {
        Row: {
          created_at: string
          description: string
          employee_id: number
          error_category: string
          error_type: string
          id: number
          material_cost: number | null
          position: string | null
          site_id: string | null
          supplier_id: number | null
          task_id: number
          time_spent_hours: number | null
          transfer_km: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          employee_id: number
          error_category: string
          error_type: string
          id?: number
          material_cost?: number | null
          position?: string | null
          site_id?: string | null
          supplier_id?: number | null
          task_id: number
          time_spent_hours?: number | null
          transfer_km?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          employee_id?: number
          error_category?: string
          error_type?: string
          id?: number
          material_cost?: number | null
          position?: string | null
          site_id?: string | null
          supplier_id?: number | null
          task_id?: number
          time_spent_hours?: number | null
          transfer_km?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "Errortracking_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Errortracking_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Errortracking_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "Supplier"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Errortracking_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "Task"
            referencedColumns: ["id"]
          },
        ]
      }
      ev_clienti: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          nome: string
          note: string | null
          site_id: string
          telefono: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          nome: string
          note?: string | null
          site_id: string
          telefono?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          nome?: string
          note?: string | null
          site_id?: string
          telefono?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ev_clienti_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      ev_eventi: {
        Row: {
          budget_previsto: number | null
          categoria_prodotto: string
          cliente_id: string | null
          created_at: string
          data_evento: string | null
          deleted_at: string | null
          id: string
          immagine_url: string | null
          lat: number | null
          lng: number | null
          location_id: string | null
          note: string | null
          offerta_id: string | null
          ora_fine: string | null
          ora_inizio: string | null
          ricavo_previsto: number | null
          senza_data: boolean
          site_id: string
          stato_accounting: string | null
          stato_plan: string
          tipo_evento: string
          titolo: string
          updated_at: string
          volo_brandizzato: boolean
        }
        Insert: {
          budget_previsto?: number | null
          categoria_prodotto: string
          cliente_id?: string | null
          created_at?: string
          data_evento?: string | null
          deleted_at?: string | null
          id?: string
          immagine_url?: string | null
          lat?: number | null
          lng?: number | null
          location_id?: string | null
          note?: string | null
          offerta_id?: string | null
          ora_fine?: string | null
          ora_inizio?: string | null
          ricavo_previsto?: number | null
          senza_data?: boolean
          site_id: string
          stato_accounting?: string | null
          stato_plan?: string
          tipo_evento: string
          titolo: string
          updated_at?: string
          volo_brandizzato?: boolean
        }
        Update: {
          budget_previsto?: number | null
          categoria_prodotto?: string
          cliente_id?: string | null
          created_at?: string
          data_evento?: string | null
          deleted_at?: string | null
          id?: string
          immagine_url?: string | null
          lat?: number | null
          lng?: number | null
          location_id?: string | null
          note?: string | null
          offerta_id?: string | null
          ora_fine?: string | null
          ora_inizio?: string | null
          ricavo_previsto?: number | null
          senza_data?: boolean
          site_id?: string
          stato_accounting?: string | null
          stato_plan?: string
          tipo_evento?: string
          titolo?: string
          updated_at?: string
          volo_brandizzato?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ev_eventi_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "ev_clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ev_eventi_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "ev_location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ev_eventi_offerta_id_fkey"
            columns: ["offerta_id"]
            isOneToOne: false
            referencedRelation: "ev_offerte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ev_eventi_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      ev_eventi_fornitori: {
        Row: {
          costo: number | null
          created_at: string
          deleted_at: string | null
          evento_id: string
          fornitore_id: string
          id: string
          rider_ricevuto: boolean | null
          ruolo: string | null
          site_id: string
          stato_ingaggio: string
          updated_at: string
        }
        Insert: {
          costo?: number | null
          created_at?: string
          deleted_at?: string | null
          evento_id: string
          fornitore_id: string
          id?: string
          rider_ricevuto?: boolean | null
          ruolo?: string | null
          site_id: string
          stato_ingaggio?: string
          updated_at?: string
        }
        Update: {
          costo?: number | null
          created_at?: string
          deleted_at?: string | null
          evento_id?: string
          fornitore_id?: string
          id?: string
          rider_ricevuto?: boolean | null
          ruolo?: string | null
          site_id?: string
          stato_ingaggio?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ev_eventi_fornitori_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "ev_eventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ev_eventi_fornitori_fornitore_id_fkey"
            columns: ["fornitore_id"]
            isOneToOne: false
            referencedRelation: "ev_fornitori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ev_eventi_fornitori_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      ev_eventi_task: {
        Row: {
          assegnatario: string | null
          created_at: string
          deleted_at: string | null
          evento_id: string
          id: string
          scadenza: string | null
          site_id: string
          stato: string
          titolo: string
          updated_at: string
        }
        Insert: {
          assegnatario?: string | null
          created_at?: string
          deleted_at?: string | null
          evento_id: string
          id?: string
          scadenza?: string | null
          site_id: string
          stato?: string
          titolo: string
          updated_at?: string
        }
        Update: {
          assegnatario?: string | null
          created_at?: string
          deleted_at?: string | null
          evento_id?: string
          id?: string
          scadenza?: string | null
          site_id?: string
          stato?: string
          titolo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ev_eventi_task_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "ev_eventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ev_eventi_task_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      ev_fatture: {
        Row: {
          created_at: string
          data_scadenza: string | null
          deleted_at: string | null
          descrizione: string | null
          direzione: string
          evento_id: string | null
          id: string
          importo: number
          site_id: string
          stato: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_scadenza?: string | null
          deleted_at?: string | null
          descrizione?: string | null
          direzione: string
          evento_id?: string | null
          id?: string
          importo: number
          site_id: string
          stato?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_scadenza?: string | null
          deleted_at?: string | null
          descrizione?: string | null
          direzione?: string
          evento_id?: string | null
          id?: string
          importo?: number
          site_id?: string
          stato?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ev_fatture_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "ev_eventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ev_fatture_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      ev_fornitori: {
        Row: {
          categoria: string
          costo_indicativo: number | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          nome: string
          note: string | null
          site_id: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          categoria: string
          costo_indicativo?: number | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          nome: string
          note?: string | null
          site_id: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string
          costo_indicativo?: number | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          nome?: string
          note?: string | null
          site_id?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ev_fornitori_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      ev_location: {
        Row: {
          capienza: number | null
          citta: string | null
          contatto_referente: string | null
          created_at: string
          deleted_at: string | null
          id: string
          indirizzo: string | null
          lat: number | null
          lng: number | null
          nome: string
          note_logistiche: string | null
          site_id: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          capienza?: number | null
          citta?: string | null
          contatto_referente?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          indirizzo?: string | null
          lat?: number | null
          lng?: number | null
          nome: string
          note_logistiche?: string | null
          site_id: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          capienza?: number | null
          citta?: string | null
          contatto_referente?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          indirizzo?: string | null
          lat?: number | null
          lng?: number | null
          nome?: string
          note_logistiche?: string | null
          site_id?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ev_location_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      ev_offerte: {
        Row: {
          categoria_prodotto: string
          cliente_id: string | null
          created_at: string
          data_evento_prevista: string | null
          deleted_at: string | null
          evento_id: string | null
          id: string
          importo_offerto: number | null
          lat: number | null
          lng: number | null
          note: string | null
          site_id: string
          stato: string
          titolo: string
          updated_at: string
        }
        Insert: {
          categoria_prodotto: string
          cliente_id?: string | null
          created_at?: string
          data_evento_prevista?: string | null
          deleted_at?: string | null
          evento_id?: string | null
          id?: string
          importo_offerto?: number | null
          lat?: number | null
          lng?: number | null
          note?: string | null
          site_id: string
          stato?: string
          titolo: string
          updated_at?: string
        }
        Update: {
          categoria_prodotto?: string
          cliente_id?: string | null
          created_at?: string
          data_evento_prevista?: string | null
          deleted_at?: string | null
          evento_id?: string | null
          id?: string
          importo_offerto?: number | null
          lat?: number | null
          lng?: number | null
          note?: string | null
          site_id?: string
          stato?: string
          titolo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ev_offerte_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "ev_clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ev_offerte_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "ev_eventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ev_offerte_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      Exit_checklist: {
        Row: {
          created_at: string
          date: string
          employee_id: number
          id: number
          name: string
          position: string
          site_id: string | null
          task_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          employee_id: number
          id?: number
          name: string
          position: string
          site_id?: string | null
          task_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          employee_id?: number
          id?: number
          name?: string
          position?: string
          site_id?: string | null
          task_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "Exit_checklist_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employee"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_task"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "Task"
            referencedColumns: ["id"]
          },
        ]
      }
      File: {
        Row: {
          cloudinaryId: string | null
          errortrackingId: number | null
          id: number
          name: string
          sellProductId: number | null
          storage_path: string | null
          taskId: number | null
          url: string
        }
        Insert: {
          cloudinaryId?: string | null
          errortrackingId?: number | null
          id?: number
          name: string
          sellProductId?: number | null
          storage_path?: string | null
          taskId?: number | null
          url: string
        }
        Update: {
          cloudinaryId?: string | null
          errortrackingId?: number | null
          id?: number
          name?: string
          sellProductId?: number | null
          storage_path?: string | null
          taskId?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "File_errortrackingId_fkey"
            columns: ["errortrackingId"]
            isOneToOne: false
            referencedRelation: "Errortracking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "File_sellProductId_fkey"
            columns: ["sellProductId"]
            isOneToOne: false
            referencedRelation: "SellProduct"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "File_taskId_fkey"
            columns: ["taskId"]
            isOneToOne: false
            referencedRelation: "Task"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_activities: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          site_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          site_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          site_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_activities_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          site_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          site_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          site_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_categories_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_item_variants: {
        Row: {
          attributes: Json
          created_at: string
          id: string
          image_url: string | null
          internal_code: string | null
          item_id: string
          producer: string | null
          producer_code: string | null
          purchase_unit_price: number | null
          sell_unit_price: number | null
          site_id: string
          supplier_code: string | null
          unit_id: string | null
          updated_at: string
          url_tds: string | null
          warehouse_number: string | null
        }
        Insert: {
          attributes?: Json
          created_at?: string
          id?: string
          image_url?: string | null
          internal_code?: string | null
          item_id: string
          producer?: string | null
          producer_code?: string | null
          purchase_unit_price?: number | null
          sell_unit_price?: number | null
          site_id: string
          supplier_code?: string | null
          unit_id?: string | null
          updated_at?: string
          url_tds?: string | null
          warehouse_number?: string | null
        }
        Update: {
          attributes?: Json
          created_at?: string
          id?: string
          image_url?: string | null
          internal_code?: string | null
          item_id?: string
          producer?: string | null
          producer_code?: string | null
          purchase_unit_price?: number | null
          sell_unit_price?: number | null
          site_id?: string
          supplier_code?: string | null
          unit_id?: string | null
          updated_at?: string
          url_tds?: string | null
          warehouse_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_item_variants_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_item_variants_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_item_variants_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_consumable: boolean
          is_stocked: boolean
          item_type: string | null
          name: string
          site_id: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_consumable?: boolean
          is_stocked?: boolean
          item_type?: string | null
          name: string
          site_id: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_consumable?: boolean
          is_stocked?: boolean
          item_type?: string | null
          name?: string
          site_id?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "inventory_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock_movements: {
        Row: {
          created_at: string
          id: string
          movement_type: string
          occurred_at: string
          quantity: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          site_id: string
          unit_id: string | null
          variant_id: string
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          movement_type: string
          occurred_at?: string
          quantity: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          site_id: string
          unit_id?: string | null
          variant_id: string
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          movement_type?: string
          occurred_at?: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          site_id?: string
          unit_id?: string | null
          variant_id?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_movements_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_movements_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "inventory_item_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_subcategory_images: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          site_id: string
          sort_order: number
          subcategory_key: string
          subcategory_name: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          site_id: string
          sort_order?: number
          subcategory_key: string
          subcategory_name: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          site_id?: string
          sort_order?: number
          subcategory_key?: string
          subcategory_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_subcategory_images_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_subcategory_images_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_suppliers: {
        Row: {
          address: string | null
          cap: number | null
          code: string | null
          contact: string | null
          created_at: string
          email: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          phone: string | null
          short_name: string | null
          site_id: string
          supplier_category_id: number | null
          supplier_image: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          cap?: number | null
          code?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          short_name?: string | null
          site_id: string
          supplier_category_id?: number | null
          supplier_image?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          cap?: number | null
          code?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          short_name?: string | null
          site_id?: string
          supplier_category_id?: number | null
          supplier_image?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_suppliers_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_units: {
        Row: {
          base_unit_id: string | null
          code: string
          created_at: string
          id: string
          multiplier: number | null
          name: string
          unit_type: string
          updated_at: string
        }
        Insert: {
          base_unit_id?: string | null
          code: string
          created_at?: string
          id?: string
          multiplier?: number | null
          name: string
          unit_type: string
          updated_at?: string
        }
        Update: {
          base_unit_id?: string | null
          code?: string
          created_at?: string
          id?: string
          multiplier?: number | null
          name?: string
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_units_base_unit_id_fkey"
            columns: ["base_unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_warehouses: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          site_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          site_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_warehouses_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      Kanban: {
        Row: {
          card_field_config: Json | null
          category_id: number | null
          code_change_column_id: number | null
          color: string | null
          icon: string | null
          id: number
          identifier: string
          is_offer_kanban: boolean | null
          is_production_kanban: boolean | null
          is_work_kanban: boolean | null
          show_category_colors: boolean | null
          site_id: string | null
          target_invoice_kanban_id: number | null
          target_work_kanban_id: number | null
          title: string
        }
        Insert: {
          card_field_config?: Json | null
          category_id?: number | null
          code_change_column_id?: number | null
          color?: string | null
          icon?: string | null
          id?: number
          identifier: string
          is_offer_kanban?: boolean | null
          is_production_kanban?: boolean | null
          is_work_kanban?: boolean | null
          show_category_colors?: boolean | null
          site_id?: string | null
          target_invoice_kanban_id?: number | null
          target_work_kanban_id?: number | null
          title: string
        }
        Update: {
          card_field_config?: Json | null
          category_id?: number | null
          code_change_column_id?: number | null
          color?: string | null
          icon?: string | null
          id?: number
          identifier?: string
          is_offer_kanban?: boolean | null
          is_production_kanban?: boolean | null
          is_work_kanban?: boolean | null
          show_category_colors?: boolean | null
          site_id?: string | null
          target_invoice_kanban_id?: number | null
          target_work_kanban_id?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "Kanban_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "KanbanCategory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Kanban_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Kanban_target_invoice_kanban_id_fkey"
            columns: ["target_invoice_kanban_id"]
            isOneToOne: false
            referencedRelation: "Kanban"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Kanban_target_work_kanban_id_fkey"
            columns: ["target_work_kanban_id"]
            isOneToOne: false
            referencedRelation: "Kanban"
            referencedColumns: ["id"]
          },
        ]
      }
      KanbanCategory: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: number
          identifier: string
          internal_base_code: number | null
          is_internal: boolean | null
          name: string
          site_id: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: number
          identifier: string
          internal_base_code?: number | null
          is_internal?: boolean | null
          name: string
          site_id?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: number
          identifier?: string
          internal_base_code?: number | null
          is_internal?: boolean | null
          name?: string
          site_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "KanbanCategory_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      KanbanColumn: {
        Row: {
          column_type: string | null
          icon: string | null
          id: number
          identifier: string
          is_creation_column: boolean | null
          kanbanId: number
          position: number
          tasks: number | null
          title: string
        }
        Insert: {
          column_type?: string | null
          icon?: string | null
          id?: number
          identifier: string
          is_creation_column?: boolean | null
          kanbanId: number
          position: number
          tasks?: number | null
          title: string
        }
        Update: {
          column_type?: string | null
          icon?: string | null
          id?: number
          identifier?: string
          is_creation_column?: boolean | null
          kanbanId?: number
          position?: number
          tasks?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "KanbanColumn_kanbanId_fkey"
            columns: ["kanbanId"]
            isOneToOne: false
            referencedRelation: "Kanban"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          leave_type: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          site_id: string
          start_date: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          leave_type: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          site_id: string
          start_date: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          leave_type?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          site_id?: string
          start_date?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_project_stage_events: {
        Row: {
          changed_by: string | null
          created_at: string
          from_stage: string | null
          id: string
          project_id: string
          to_stage: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          project_id: string
          to_stage: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          project_id?: string
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_project_stage_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "manager_project_hours"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "manager_project_stage_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "manager_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_projects: {
        Row: {
          board_order: number
          created_at: string
          id: string
          metadata: Json
          notes: string | null
          site_id: string
          stage: string
          stage_changed_at: string
          updated_at: string
        }
        Insert: {
          board_order?: number
          created_at?: string
          id?: string
          metadata?: Json
          notes?: string | null
          site_id: string
          stage?: string
          stage_changed_at?: string
          updated_at?: string
        }
        Update: {
          board_order?: number
          created_at?: string
          id?: string
          metadata?: Json
          notes?: string | null
          site_id?: string
          stage?: string
          stage_changed_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_projects_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      Manufacturer: {
        Row: {
          address: string | null
          cap: number | null
          contact: string | null
          created_at: string
          description: string | null
          email: string | null
          id: number
          location: string | null
          manufacturer_category_id: number | null
          manufacturer_image: string | null
          name: string
          phone: string | null
          short_name: string | null
          site_id: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          cap?: number | null
          contact?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: number
          location?: string | null
          manufacturer_category_id?: number | null
          manufacturer_image?: string | null
          name: string
          phone?: string | null
          short_name?: string | null
          site_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          cap?: number | null
          contact?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: number
          location?: string | null
          manufacturer_category_id?: number | null
          manufacturer_image?: string | null
          name?: string
          phone?: string | null
          short_name?: string | null
          site_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Manufacturer_manufacturer_category_id_fkey"
            columns: ["manufacturer_category_id"]
            isOneToOne: false
            referencedRelation: "Manufacturer_category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Manufacturer_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      Manufacturer_category: {
        Row: {
          code: string | null
          created_at: string
          description: string
          id: number
          name: string
          site_id: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description: string
          id?: number
          name: string
          site_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string
          id?: number
          name?: string
          site_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "Manufacturer_category_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      PackingControl: {
        Row: {
          created_at: string
          id: number
          passed: Database["public"]["Enums"]["QC_Status"]
          site_id: string | null
          taskId: number
          updated_at: string
          userId: number
        }
        Insert: {
          created_at?: string
          id?: number
          passed?: Database["public"]["Enums"]["QC_Status"]
          site_id?: string | null
          taskId: number
          updated_at?: string
          userId: number
        }
        Update: {
          created_at?: string
          id?: number
          passed?: Database["public"]["Enums"]["QC_Status"]
          site_id?: string | null
          taskId?: number
          updated_at?: string
          userId?: number
        }
        Relationships: [
          {
            foreignKeyName: "PackingControl_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "PackingControl_taskId_fkey"
            columns: ["taskId"]
            isOneToOne: false
            referencedRelation: "Task"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "PackingControl_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      PackingItem: {
        Row: {
          id: number
          name: string
          number: number | null
          package_quantity: number | null
          packingControlId: number
        }
        Insert: {
          id?: number
          name: string
          number?: number | null
          package_quantity?: number | null
          packingControlId: number
        }
        Update: {
          id?: number
          name?: string
          number?: number | null
          package_quantity?: number | null
          packingControlId?: number
        }
        Relationships: [
          {
            foreignKeyName: "PackingItem_packingControlId_fkey"
            columns: ["packingControlId"]
            isOneToOne: false
            referencedRelation: "PackingControl"
            referencedColumns: ["id"]
          },
        ]
      }
      PackingMasterItem: {
        Row: {
          id: number
          name: string
          site_id: string | null
        }
        Insert: {
          id?: number
          name: string
          site_id?: string | null
        }
        Update: {
          id?: number
          name?: string
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "PackingMasterItem_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_manager_audit: {
        Row: {
          azione: string
          created_at: string
          eseguito_da: string
          id: string
          utente_id: string
        }
        Insert: {
          azione: string
          created_at?: string
          eseguito_da: string
          id?: string
          utente_id: string
        }
        Update: {
          azione?: string
          created_at?: string
          eseguito_da?: string
          id?: string
          utente_id?: string
        }
        Relationships: []
      }
      persone: {
        Row: {
          azienda_id: string | null
          deleted_at: string | null
          email: string | null
          id: string
          nome: string
          ruolo: string | null
          site_id: string
        }
        Insert: {
          azienda_id?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          nome: string
          ruolo?: string | null
          site_id: string
        }
        Update: {
          azienda_id?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          nome?: string
          ruolo?: string | null
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "persone_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persone_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "v_carico_aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persone_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_access: {
        Row: {
          areas_visible: Json
          beta_app_enabled: boolean
          created_at: string
          id: string
          permissions: Json
          site_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          areas_visible?: Json
          beta_app_enabled?: boolean
          created_at?: string
          id?: string
          permissions?: Json
          site_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          areas_visible?: Json
          beta_app_enabled?: boolean
          created_at?: string
          id?: string
          permissions?: Json
          site_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_access_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_area_scores: {
        Row: {
          area_slug: string
          created_at: string
          id: string
          recorded_at: string
          score: number
          site_id: string
          user_id: string
        }
        Insert: {
          area_slug: string
          created_at?: string
          id?: string
          recorded_at?: string
          score: number
          site_id: string
          user_id: string
        }
        Update: {
          area_slug?: string
          created_at?: string
          id?: string
          recorded_at?: string
          score?: number
          site_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_area_scores_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_automations: {
        Row: {
          area_slug: string | null
          created_at: string
          data_attivazione: string | null
          data_prevista: string | null
          id: string
          name: string
          site_id: string | null
          source_ref: string | null
          stato: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          area_slug?: string | null
          created_at?: string
          data_attivazione?: string | null
          data_prevista?: string | null
          id?: string
          name: string
          site_id?: string | null
          source_ref?: string | null
          stato?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          area_slug?: string | null
          created_at?: string
          data_attivazione?: string | null
          data_prevista?: string | null
          id?: string
          name?: string
          site_id?: string | null
          source_ref?: string | null
          stato?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_automations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_data_sources: {
        Row: {
          area_slug: string | null
          created_at: string
          id: string
          name: string
          site_id: string | null
          sync_enabled: boolean
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          area_slug?: string | null
          created_at?: string
          id?: string
          name: string
          site_id?: string | null
          sync_enabled?: boolean
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          area_slug?: string | null
          created_at?: string
          id?: string
          name?: string
          site_id?: string | null
          sync_enabled?: boolean
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_data_sources_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_item_snapshots: {
        Row: {
          id: string
          item_id: string
          priority: number
          site_id: string | null
          snapshot_at: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          priority: number
          site_id?: string | null
          snapshot_at?: string
          status: string
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          priority?: number
          site_id?: string | null
          snapshot_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_item_snapshots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pm_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_item_snapshots_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_items: {
        Row: {
          area_slug: string
          created_at: string
          deleted_at: string | null
          due_date: string | null
          id: string
          notes: string | null
          priority: number
          site_id: string | null
          source_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_slug: string
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: number
          site_id?: string | null
          source_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_slug?: string
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: number
          site_id?: string | null
          source_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_items_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_items_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "pm_data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_life_areas: {
        Row: {
          accent_color: string
          created_at: string
          id: string
          is_enabled: boolean
          label: string
          site_id: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          accent_color: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          label: string
          site_id: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          accent_color?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          label?: string
          site_id?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_life_areas_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      Product: {
        Row: {
          category: string | null
          category_code: string | null
          categoryId: number | null
          color: string | null
          color_code: string | null
          created_at: string
          description: string | null
          diameter: number | null
          height: number | null
          id: number
          image_url: string | null
          internal_code: string | null
          inventoryId: number
          length: number | null
          name: string
          producer: string | null
          producer_code: string | null
          quantity: number
          sell_price: number | null
          site_id: string | null
          subcategory: string | null
          subcategory_code: string | null
          subcategory2: string | null
          subcategory2_code: string | null
          supplier: string | null
          supplier_code: string | null
          supplierId: number | null
          thickness: number | null
          total_price: number | null
          type: string | null
          unit: string | null
          unit_price: number
          updated_at: string
          url_tds: string | null
          warehouse_number: string | null
          width: number | null
        }
        Insert: {
          category?: string | null
          category_code?: string | null
          categoryId?: number | null
          color?: string | null
          color_code?: string | null
          created_at?: string
          description?: string | null
          diameter?: number | null
          height?: number | null
          id?: number
          image_url?: string | null
          internal_code?: string | null
          inventoryId?: number
          length?: number | null
          name: string
          producer?: string | null
          producer_code?: string | null
          quantity: number
          sell_price?: number | null
          site_id?: string | null
          subcategory?: string | null
          subcategory_code?: string | null
          subcategory2?: string | null
          subcategory2_code?: string | null
          supplier?: string | null
          supplier_code?: string | null
          supplierId?: number | null
          thickness?: number | null
          total_price?: number | null
          type?: string | null
          unit?: string | null
          unit_price: number
          updated_at?: string
          url_tds?: string | null
          warehouse_number?: string | null
          width?: number | null
        }
        Update: {
          category?: string | null
          category_code?: string | null
          categoryId?: number | null
          color?: string | null
          color_code?: string | null
          created_at?: string
          description?: string | null
          diameter?: number | null
          height?: number | null
          id?: number
          image_url?: string | null
          internal_code?: string | null
          inventoryId?: number
          length?: number | null
          name?: string
          producer?: string | null
          producer_code?: string | null
          quantity?: number
          sell_price?: number | null
          site_id?: string | null
          subcategory?: string | null
          subcategory_code?: string | null
          subcategory2?: string | null
          subcategory2_code?: string | null
          supplier?: string | null
          supplier_code?: string | null
          supplierId?: number | null
          thickness?: number | null
          total_price?: number | null
          type?: string | null
          unit?: string | null
          unit_price?: number
          updated_at?: string
          url_tds?: string | null
          warehouse_number?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "Product_categoryId_fkey"
            columns: ["categoryId"]
            isOneToOne: false
            referencedRelation: "Product_category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Product_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Product_supplierId_fkey"
            columns: ["supplierId"]
            isOneToOne: false
            referencedRelation: "Supplier"
            referencedColumns: ["id"]
          },
        ]
      }
      Product_category: {
        Row: {
          code: string | null
          created_at: string
          description: string
          id: number
          name: string
          site_id: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description: string
          id?: number
          name: string
          site_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string
          id?: number
          name?: string
          site_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "Product_category_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      progetti: {
        Row: {
          ambito_id: string | null
          attivo: boolean
          deleted_at: string | null
          id: string
          nome: string
          site_id: string
        }
        Insert: {
          ambito_id?: string | null
          attivo?: boolean
          deleted_at?: string | null
          id?: string
          nome: string
          site_id: string
        }
        Update: {
          ambito_id?: string | null
          attivo?: boolean
          deleted_at?: string | null
          id?: string
          nome?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progetti_ambito_id_fkey"
            columns: ["ambito_id"]
            isOneToOne: false
            referencedRelation: "ambiti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progetti_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      Qc_item: {
        Row: {
          checked: boolean
          created_at: string
          id: number
          name: string
          qualityControlId: number | null
          updated_at: string
        }
        Insert: {
          checked?: boolean
          created_at?: string
          id?: number
          name: string
          qualityControlId?: number | null
          updated_at?: string
        }
        Update: {
          checked?: boolean
          created_at?: string
          id?: number
          name?: string
          qualityControlId?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "Qc_item_qualityControlId_fkey"
            columns: ["qualityControlId"]
            isOneToOne: false
            referencedRelation: "QualityControl"
            referencedColumns: ["id"]
          },
        ]
      }
      QcMasterItem: {
        Row: {
          id: number
          name: string
          site_id: string | null
        }
        Insert: {
          id?: number
          name: string
          site_id?: string | null
        }
        Update: {
          id?: number
          name?: string
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "QcMasterItem_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      QualityControl: {
        Row: {
          created_at: string
          id: number
          passed: Database["public"]["Enums"]["QC_Status"]
          position_nr: string
          site_id: string | null
          taskId: number
          updated_at: string
          userId: number
        }
        Insert: {
          created_at?: string
          id?: number
          passed?: Database["public"]["Enums"]["QC_Status"]
          position_nr: string
          site_id?: string | null
          taskId: number
          updated_at?: string
          userId: number
        }
        Update: {
          created_at?: string
          id?: number
          passed?: Database["public"]["Enums"]["QC_Status"]
          position_nr?: string
          site_id?: string | null
          taskId?: number
          updated_at?: string
          userId?: number
        }
        Relationships: [
          {
            foreignKeyName: "QualityControl_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "QualityControl_taskId_fkey"
            columns: ["taskId"]
            isOneToOne: false
            referencedRelation: "Task"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "QualityControl_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Reseller: {
        Row: {
          address: string | null
          contact_person: string | null
          country: string | null
          country_code: string | null
          created_at: string
          email: string | null
          fax: string | null
          id: number
          mobile: string | null
          name: string
          notes: string | null
          phone: string | null
          site_id: string | null
          updated_at: string
          website: string | null
          zip_city: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          email?: string | null
          fax?: string | null
          id?: number
          mobile?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          site_id?: string | null
          updated_at?: string
          website?: string | null
          zip_city?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          email?: string | null
          fax?: string | null
          id?: number
          mobile?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          site_id?: string | null
          updated_at?: string
          website?: string | null
          zip_city?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Reseller_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      righe_documento: {
        Row: {
          art: string | null
          articolo_id: string | null
          articolo_source: string | null
          created_at: string
          descrizione: string
          descrizione_estesa: string | null
          documento_id: string
          id: string
          immagine_url: string | null
          is_trasporto: boolean
          misure: string | null
          posizione: number
          prezzo_unitario: number | null
          quantita: number | null
          sconto: number | null
          site_id: string
          totale_riga: number | null
          unita: string | null
        }
        Insert: {
          art?: string | null
          articolo_id?: string | null
          articolo_source?: string | null
          created_at?: string
          descrizione: string
          descrizione_estesa?: string | null
          documento_id: string
          id?: string
          immagine_url?: string | null
          is_trasporto?: boolean
          misure?: string | null
          posizione: number
          prezzo_unitario?: number | null
          quantita?: number | null
          sconto?: number | null
          site_id: string
          totale_riga?: number | null
          unita?: string | null
        }
        Update: {
          art?: string | null
          articolo_id?: string | null
          articolo_source?: string | null
          created_at?: string
          descrizione?: string
          descrizione_estesa?: string | null
          documento_id?: string
          id?: string
          immagine_url?: string | null
          is_trasporto?: boolean
          misure?: string | null
          posizione?: number
          prezzo_unitario?: number | null
          quantita?: number | null
          sconto?: number | null
          site_id?: string
          totale_riga?: number | null
          unita?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "righe_documento_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "righe_documento_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      Roles: {
        Row: {
          id: number
          name: string
          site_id: string | null
        }
        Insert: {
          id?: number
          name: string
          site_id?: string | null
        }
        Update: {
          id?: number
          name?: string
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Roles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      SellProduct: {
        Row: {
          active: boolean
          category_id: number | null
          created_at: string
          description: string | null
          diameter_mm: number | null
          doc_url: string | null
          id: number
          image_url: string | null
          internal_code: string | null
          length_mm: number | null
          list_price: number | null
          name: string
          price_list: boolean | null
          product_type: string | null
          site_id: string | null
          subcategory: string | null
          supplier_id: number | null
          tipo: string | null
          type: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: number | null
          created_at?: string
          description?: string | null
          diameter_mm?: number | null
          doc_url?: string | null
          id?: number
          image_url?: string | null
          internal_code?: string | null
          length_mm?: number | null
          list_price?: number | null
          name: string
          price_list?: boolean | null
          product_type?: string | null
          site_id?: string | null
          subcategory?: string | null
          supplier_id?: number | null
          tipo?: string | null
          type?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: number | null
          created_at?: string
          description?: string | null
          diameter_mm?: number | null
          doc_url?: string | null
          id?: number
          image_url?: string | null
          internal_code?: string | null
          length_mm?: number | null
          list_price?: number | null
          name?: string
          price_list?: boolean | null
          product_type?: string | null
          site_id?: string | null
          subcategory?: string | null
          supplier_id?: number | null
          tipo?: string | null
          type?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "SellProduct_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "sellproduct_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SellProduct_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SellProduct_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "Supplier"
            referencedColumns: ["id"]
          },
        ]
      }
      sellproduct_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          icon_color: string | null
          id: number
          image_url: string | null
          name: string
          site_id: string
          sort_order: number
          supplier_names: string[] | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          icon_color?: string | null
          id?: number
          image_url?: string | null
          name: string
          site_id: string
          sort_order?: number
          supplier_names?: string[] | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          icon_color?: string | null
          id?: number
          image_url?: string | null
          name?: string
          site_id?: string
          sort_order?: number
          supplier_names?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sellproduct_categories_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sellproduct_subcategory_images: {
        Row: {
          category_id: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          site_id: string
          sort_order: number
          subcategory_key: string
          subcategory_name: string
          updated_at: string
        }
        Insert: {
          category_id: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          site_id: string
          sort_order?: number
          subcategory_key: string
          subcategory_name: string
          updated_at?: string
        }
        Update: {
          category_id?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          site_id?: string
          sort_order?: number
          subcategory_key?: string
          subcategory_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sellproduct_subcategory_images_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "sellproduct_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sellproduct_subcategory_images_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_ai_settings: {
        Row: {
          ai_api_key: string | null
          ai_model: string | null
          ai_provider: string | null
          created_at: string | null
          documenti_ai_api_key: string | null
          documenti_ai_model: string | null
          documenti_ai_provider: string | null
          id: string
          site_id: string
          speech_provider: string | null
          updated_at: string | null
          whisper_api_key: string | null
        }
        Insert: {
          ai_api_key?: string | null
          ai_model?: string | null
          ai_provider?: string | null
          created_at?: string | null
          documenti_ai_api_key?: string | null
          documenti_ai_model?: string | null
          documenti_ai_provider?: string | null
          id?: string
          site_id: string
          speech_provider?: string | null
          updated_at?: string | null
          whisper_api_key?: string | null
        }
        Update: {
          ai_api_key?: string | null
          ai_model?: string | null
          ai_provider?: string | null
          created_at?: string | null
          documenti_ai_api_key?: string | null
          documenti_ai_model?: string | null
          documenti_ai_provider?: string | null
          id?: string
          site_id?: string
          speech_provider?: string | null
          updated_at?: string | null
          whisper_api_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_ai_settings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_modules: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean
          module_name: string
          site_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean
          module_name: string
          site_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean
          module_name?: string
          site_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_modules_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          created_at: string | null
          id: number
          setting_key: string
          setting_value: Json
          site_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          setting_key: string
          setting_value: Json
          site_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          setting_key?: string
          setting_value?: Json
          site_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          created_at: string | null
          custom_domain: string | null
          description: string | null
          document_template_config: Json
          id: string
          image: string | null
          imageblurhash: string | null
          logo: string | null
          name: string
          organization_id: string | null
          subdomain: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_domain?: string | null
          description?: string | null
          document_template_config?: Json
          id?: string
          image?: string | null
          imageblurhash?: string | null
          logo?: string | null
          name: string
          organization_id?: string | null
          subdomain: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_domain?: string | null
          description?: string | null
          document_template_config?: Json
          id?: string
          image?: string | null
          imageblurhash?: string | null
          logo?: string | null
          name?: string
          organization_id?: string | null
          subdomain?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      Supplier: {
        Row: {
          address: string | null
          cap: number | null
          contact: string | null
          created_at: string
          description: string
          email: string | null
          id: number
          location: string | null
          name: string
          phone: string | null
          short_name: string | null
          site_id: string | null
          supplier_category_id: number | null
          supplier_image: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          cap?: number | null
          contact?: string | null
          created_at?: string
          description: string
          email?: string | null
          id?: number
          location?: string | null
          name: string
          phone?: string | null
          short_name?: string | null
          site_id?: string | null
          supplier_category_id?: number | null
          supplier_image?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          cap?: number | null
          contact?: string | null
          created_at?: string
          description?: string
          email?: string | null
          id?: number
          location?: string | null
          name?: string
          phone?: string | null
          short_name?: string | null
          site_id?: string | null
          supplier_category_id?: number | null
          supplier_image?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Supplier_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Supplier_supplier_category_id_fkey"
            columns: ["supplier_category_id"]
            isOneToOne: false
            referencedRelation: "Supplier_category"
            referencedColumns: ["id"]
          },
        ]
      }
      Supplier_category: {
        Row: {
          code: string | null
          created_at: string
          description: string
          id: number
          name: string
          site_id: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description: string
          id?: number
          name: string
          site_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string
          id?: number
          name?: string
          site_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "Supplier_category_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      Task: {
        Row: {
          altro: boolean | null
          archived: boolean
          assigned_collaborator_ids: Json | null
          auto_archive_at: string | null
          clientId: number | null
          cloud_folder_url: string | null
          column_id: number | null
          column_position: number | null
          consuntivo_collaborator_rates: Json | null
          consuntivo_default_hourly_rate: number | null
          consuntivo_material_cost: number | null
          created_at: string
          deliveryDate: string | null
          display_mode: string | null
          draft_category_ids: number[] | null
          ferramenta: boolean
          id: number
          is_draft: boolean | null
          kanbanColumnId: number | null
          kanbanId: number | null
          legno: boolean | null
          locked: boolean
          luogo: string | null
          material: boolean
          metalli: boolean
          name: string | null
          numero_pezzi: number | null
          offer_followups: Json | null
          offer_loss_competitor_name: string | null
          offer_loss_reason: string | null
          offer_products: Json | null
          offer_send_date: string | null
          ora_fine: string | null
          ora_inizio: string | null
          other: string | null
          parent_task_id: number | null
          percentStatus: number | null
          posa_collaborator_ids: Json | null
          posa_data_fine: string | null
          posa_data_inizio: string | null
          posa_ora_fine: string | null
          posa_ora_inizio: string | null
          positions: string[] | null
          produzione_collaborator_ids: Json | null
          produzione_data_fine: string | null
          produzione_data_inizio: string | null
          produzione_ora_fine: string | null
          produzione_ora_inizio: string | null
          project_files_url: string | null
          sellPrice: number | null
          sellProductId: number | null
          sent_date: string | null
          service_collaborator_ids: Json | null
          service_data_fine: string | null
          service_data_inizio: string | null
          service_ora_fine: string | null
          service_ora_inizio: string | null
          site_id: string | null
          source_offer_code: string | null
          squadra: number | null
          status: string | null
          stoccaggiodate: string | null
          stoccato: boolean | null
          task_type: string | null
          termine_produzione: string | null
          title: string | null
          unique_code: string | null
          updated_at: string
          userId: number | null
          vernice: boolean | null
        }
        Insert: {
          altro?: boolean | null
          archived?: boolean
          assigned_collaborator_ids?: Json | null
          auto_archive_at?: string | null
          clientId?: number | null
          cloud_folder_url?: string | null
          column_id?: number | null
          column_position?: number | null
          consuntivo_collaborator_rates?: Json | null
          consuntivo_default_hourly_rate?: number | null
          consuntivo_material_cost?: number | null
          created_at?: string
          deliveryDate?: string | null
          display_mode?: string | null
          draft_category_ids?: number[] | null
          ferramenta?: boolean
          id?: number
          is_draft?: boolean | null
          kanbanColumnId?: number | null
          kanbanId?: number | null
          legno?: boolean | null
          locked?: boolean
          luogo?: string | null
          material?: boolean
          metalli?: boolean
          name?: string | null
          numero_pezzi?: number | null
          offer_followups?: Json | null
          offer_loss_competitor_name?: string | null
          offer_loss_reason?: string | null
          offer_products?: Json | null
          offer_send_date?: string | null
          ora_fine?: string | null
          ora_inizio?: string | null
          other?: string | null
          parent_task_id?: number | null
          percentStatus?: number | null
          posa_collaborator_ids?: Json | null
          posa_data_fine?: string | null
          posa_data_inizio?: string | null
          posa_ora_fine?: string | null
          posa_ora_inizio?: string | null
          positions?: string[] | null
          produzione_collaborator_ids?: Json | null
          produzione_data_fine?: string | null
          produzione_data_inizio?: string | null
          produzione_ora_fine?: string | null
          produzione_ora_inizio?: string | null
          project_files_url?: string | null
          sellPrice?: number | null
          sellProductId?: number | null
          sent_date?: string | null
          service_collaborator_ids?: Json | null
          service_data_fine?: string | null
          service_data_inizio?: string | null
          service_ora_fine?: string | null
          service_ora_inizio?: string | null
          site_id?: string | null
          source_offer_code?: string | null
          squadra?: number | null
          status?: string | null
          stoccaggiodate?: string | null
          stoccato?: boolean | null
          task_type?: string | null
          termine_produzione?: string | null
          title?: string | null
          unique_code?: string | null
          updated_at?: string
          userId?: number | null
          vernice?: boolean | null
        }
        Update: {
          altro?: boolean | null
          archived?: boolean
          assigned_collaborator_ids?: Json | null
          auto_archive_at?: string | null
          clientId?: number | null
          cloud_folder_url?: string | null
          column_id?: number | null
          column_position?: number | null
          consuntivo_collaborator_rates?: Json | null
          consuntivo_default_hourly_rate?: number | null
          consuntivo_material_cost?: number | null
          created_at?: string
          deliveryDate?: string | null
          display_mode?: string | null
          draft_category_ids?: number[] | null
          ferramenta?: boolean
          id?: number
          is_draft?: boolean | null
          kanbanColumnId?: number | null
          kanbanId?: number | null
          legno?: boolean | null
          locked?: boolean
          luogo?: string | null
          material?: boolean
          metalli?: boolean
          name?: string | null
          numero_pezzi?: number | null
          offer_followups?: Json | null
          offer_loss_competitor_name?: string | null
          offer_loss_reason?: string | null
          offer_products?: Json | null
          offer_send_date?: string | null
          ora_fine?: string | null
          ora_inizio?: string | null
          other?: string | null
          parent_task_id?: number | null
          percentStatus?: number | null
          posa_collaborator_ids?: Json | null
          posa_data_fine?: string | null
          posa_data_inizio?: string | null
          posa_ora_fine?: string | null
          posa_ora_inizio?: string | null
          positions?: string[] | null
          produzione_collaborator_ids?: Json | null
          produzione_data_fine?: string | null
          produzione_data_inizio?: string | null
          produzione_ora_fine?: string | null
          produzione_ora_inizio?: string | null
          project_files_url?: string | null
          sellPrice?: number | null
          sellProductId?: number | null
          sent_date?: string | null
          service_collaborator_ids?: Json | null
          service_data_fine?: string | null
          service_data_inizio?: string | null
          service_ora_fine?: string | null
          service_ora_inizio?: string | null
          site_id?: string | null
          source_offer_code?: string | null
          squadra?: number | null
          status?: string | null
          stoccaggiodate?: string | null
          stoccato?: boolean | null
          task_type?: string | null
          termine_produzione?: string | null
          title?: string | null
          unique_code?: string | null
          updated_at?: string
          userId?: number | null
          vernice?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "Task_clientId_fkey"
            columns: ["clientId"]
            isOneToOne: false
            referencedRelation: "Client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Task_kanbanColumnId_fkey"
            columns: ["kanbanColumnId"]
            isOneToOne: false
            referencedRelation: "KanbanColumn"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Task_kanbanId_fkey"
            columns: ["kanbanId"]
            isOneToOne: false
            referencedRelation: "Kanban"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Task_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "Task"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Task_sellProductId_fkey"
            columns: ["sellProductId"]
            isOneToOne: false
            referencedRelation: "SellProduct"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Task_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Task_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      TaskHistory: {
        Row: {
          createdAt: string
          id: number
          snapshot: Json
          taskId: number
        }
        Insert: {
          createdAt?: string
          id?: number
          snapshot: Json
          taskId: number
        }
        Update: {
          createdAt?: string
          id?: number
          snapshot?: Json
          taskId?: number
        }
        Relationships: [
          {
            foreignKeyName: "TaskHistory_taskId_fkey"
            columns: ["taskId"]
            isOneToOne: false
            referencedRelation: "Task"
            referencedColumns: ["id"]
          },
        ]
      }
      TaskSupplier: {
        Row: {
          createdAt: string
          deliveryDate: string | null
          id: number
          notes: string | null
          orderDate: string | null
          supplierId: number
          supplyDays: number | null
          taskId: number
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          deliveryDate?: string | null
          id?: number
          notes?: string | null
          orderDate?: string | null
          supplierId: number
          supplyDays?: number | null
          taskId: number
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          deliveryDate?: string | null
          id?: number
          notes?: string | null
          orderDate?: string | null
          supplierId?: number
          supplyDays?: number | null
          taskId?: number
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "TaskSupplier_supplierId_fkey"
            columns: ["supplierId"]
            isOneToOne: false
            referencedRelation: "Supplier"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TaskSupplier_taskId_fkey"
            columns: ["taskId"]
            isOneToOne: false
            referencedRelation: "Task"
            referencedColumns: ["id"]
          },
        ]
      }
      Timetracking: {
        Row: {
          activity_type: string | null
          created_at: string
          description: string | null
          description_type: string
          employee_id: number | null
          endTime: string | null
          hours: number | null
          id: number
          internal_activity: string | null
          lunch_location: string | null
          lunch_offsite: boolean | null
          minutes: number | null
          site_id: string | null
          startTime: string | null
          task_id: number | null
          totalTime: number
          updated_at: string
          use_cnc: boolean
        }
        Insert: {
          activity_type?: string | null
          created_at?: string
          description?: string | null
          description_type?: string
          employee_id?: number | null
          endTime?: string | null
          hours?: number | null
          id?: number
          internal_activity?: string | null
          lunch_location?: string | null
          lunch_offsite?: boolean | null
          minutes?: number | null
          site_id?: string | null
          startTime?: string | null
          task_id?: number | null
          totalTime: number
          updated_at?: string
          use_cnc: boolean
        }
        Update: {
          activity_type?: string | null
          created_at?: string
          description?: string | null
          description_type?: string
          employee_id?: number | null
          endTime?: string | null
          hours?: number | null
          id?: number
          internal_activity?: string | null
          lunch_location?: string | null
          lunch_offsite?: boolean | null
          minutes?: number | null
          site_id?: string | null
          startTime?: string | null
          task_id?: number | null
          totalTime?: number
          updated_at?: string
          use_cnc?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "Timetracking_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Timetracking_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Timetracking_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "Task"
            referencedColumns: ["id"]
          },
        ]
      }
      User: {
        Row: {
          activation_status: string
          assistance_level: string
          auth_id: string | null
          authId: string | null
          color: string | null
          company_role: string | null
          deactivated_at: string | null
          email: string
          enabled: boolean
          family_name: string | null
          genere: Database["public"]["Enums"]["utente_genere"]
          given_name: string | null
          id: number
          initials: string | null
          landing_preferita: string | null
          personal_manager_abilitato: boolean
          personal_manager_abilitato_at: string | null
          personal_manager_abilitato_da: string | null
          picture: string | null
          role: string | null
        }
        Insert: {
          activation_status?: string
          assistance_level?: string
          auth_id?: string | null
          authId?: string | null
          color?: string | null
          company_role?: string | null
          deactivated_at?: string | null
          email: string
          enabled?: boolean
          family_name?: string | null
          genere?: Database["public"]["Enums"]["utente_genere"]
          given_name?: string | null
          id?: number
          initials?: string | null
          landing_preferita?: string | null
          personal_manager_abilitato?: boolean
          personal_manager_abilitato_at?: string | null
          personal_manager_abilitato_da?: string | null
          picture?: string | null
          role?: string | null
        }
        Update: {
          activation_status?: string
          assistance_level?: string
          auth_id?: string | null
          authId?: string | null
          color?: string | null
          company_role?: string | null
          deactivated_at?: string | null
          email?: string
          enabled?: boolean
          family_name?: string | null
          genere?: Database["public"]["Enums"]["utente_genere"]
          given_name?: string | null
          id?: number
          initials?: string | null
          landing_preferita?: string | null
          personal_manager_abilitato?: boolean
          personal_manager_abilitato_at?: string | null
          personal_manager_abilitato_da?: string | null
          picture?: string | null
          role?: string | null
        }
        Relationships: []
      }
      user_kanban_category_permissions: {
        Row: {
          created_at: string | null
          id: number
          kanban_category_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          kanban_category_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          kanban_category_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_kanban_category_permissions_kanban_category_id_fkey"
            columns: ["kanban_category_id"]
            isOneToOne: false
            referencedRelation: "KanbanCategory"
            referencedColumns: ["id"]
          },
        ]
      }
      user_kanban_permissions: {
        Row: {
          created_at: string | null
          id: number
          kanban_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          kanban_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          kanban_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_kanban_permissions_kanban_id_fkey"
            columns: ["kanban_id"]
            isOneToOne: false
            referencedRelation: "Kanban"
            referencedColumns: ["id"]
          },
        ]
      }
      user_module_permissions: {
        Row: {
          created_at: string | null
          id: number
          module_name: string
          site_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          module_name: string
          site_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          module_name?: string
          site_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_module_permissions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      user_organizations: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_site_select_preferences: {
        Row: {
          created_at: string
          group_key: string
          site_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_key: string
          site_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_key?: string
          site_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_site_select_preferences_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sites: {
        Row: {
          created_at: string | null
          id: string
          site_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          site_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          site_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sites_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      wip_limits: {
        Row: {
          limite: number
          site_id: string
          soglia_stagnazione_giorni: number
          stato: Database["public"]["Enums"]["attivita_stato"]
        }
        Insert: {
          limite: number
          site_id: string
          soglia_stagnazione_giorni?: number
          stato: Database["public"]["Enums"]["attivita_stato"]
        }
        Update: {
          limite?: number
          site_id?: string
          soglia_stagnazione_giorni?: number
          stato?: Database["public"]["Enums"]["attivita_stato"]
        }
        Relationships: [
          {
            foreignKeyName: "wip_limits_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      inventory_stock: {
        Row: {
          quantity: number | null
          site_id: string | null
          variant_id: string | null
          warehouse_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_movements_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "inventory_item_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_project_hours: {
        Row: {
          employee_id: number | null
          entries_count: number | null
          month: string | null
          project_id: string | null
          site_id: string | null
          total_minutes: number | null
          total_time: number | null
        }
        Relationships: [
          {
            foreignKeyName: "manager_projects_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Timetracking_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      v_attivita_board: {
        Row: {
          ambito_colore: string | null
          ambito_id: string | null
          ambito_nome: string | null
          aziende: Json | null
          codice: string | null
          data_stato: string | null
          giorni_fermo: number | null
          id: string | null
          note: string | null
          persone: Json | null
          progetti: Json | null
          progetto_id: string | null
          site_id: string | null
          sotto_stato: string | null
          spazio: Database["public"]["Enums"]["attivita_spazio"] | null
          stato: Database["public"]["Enums"]["attivita_stato"] | null
          titolo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attivita_ambito_id_fkey"
            columns: ["ambito_id"]
            isOneToOne: false
            referencedRelation: "ambiti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attivita_progetto_id_fkey"
            columns: ["progetto_id"]
            isOneToOne: false
            referencedRelation: "progetti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attivita_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      v_carico_aziende: {
        Row: {
          attive: number | null
          doing: number | null
          id: string | null
          nome: string | null
          site_id: string | null
          todo: number | null
        }
        Relationships: [
          {
            foreignKeyName: "aziende_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      v_carico_persone: {
        Row: {
          attive: number | null
          doing: number | null
          id: string | null
          nome: string | null
          site_id: string | null
          todo: number | null
        }
        Relationships: [
          {
            foreignKeyName: "persone_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      v_kanban_counts: {
        Row: {
          card_dentro: number | null
          giorni_fermo_max: number | null
          semaforo: string | null
          site_id: string | null
          stato: Database["public"]["Enums"]["attivita_stato"] | null
          wip_limite: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attivita_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cerca_articolo: {
        Args: { p_query: string; p_site_id: string }
        Returns: {
          codice: string
          descrizione: string
          id: number
          image_url: string
          list_price: number
          score: number
          unit: string
        }[]
      }
      create_organization_schema: {
        Args: { org_id: string; schema_name: string }
        Returns: undefined
      }
      dashboard_3d_user_can_access_site: {
        Args: { target_site_id: string }
        Returns: boolean
      }
      fetch_users_from_schema: {
        Args: { schema_name: string }
        Returns: {
          id: string
          name: string
          role: string
        }[]
      }
      get_next_sequence_value: {
        Args: { p_sequence_type: string; p_site_id: string; p_year?: number }
        Returns: number
      }
      get_organization_users: {
        Args: { org_uuid: string }
        Returns: {
          email: string
          family_name: string
          given_name: string
          joined_at: string
          role: string
          user_id: string
        }[]
      }
      get_site_id_from_storage_path: { Args: { path: string }; Returns: string }
      get_user_organizations: {
        Args: { user_uuid: string }
        Returns: {
          created_at: string
          organization_id: string
          organization_name: string
        }[]
      }
      insert_user_profile_admin: {
        Args: {
          first_name: string
          last_name: string
          schema_name: string
          user_id: string
        }
        Returns: undefined
      }
      is_superadmin: { Args: never; Returns: boolean }
      is_user_in_organization: {
        Args: { org_uuid: string; user_uuid: string }
        Returns: boolean
      }
      pm_can_manage_access: {
        Args: { target_site_id: string }
        Returns: boolean
      }
      pm_is_superadmin: { Args: never; Returns: boolean }
      pm_seed_life_areas: {
        Args: { target_site_id: string }
        Returns: undefined
      }
      seed_aree_vita: { Args: { target_user_id: string }; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      user_can_access_site: {
        Args: { target_site_id: string }
        Returns: boolean
      }
    }
    Enums: {
      attivita_spazio: "azienda" | "privato"
      attivita_stato: "todo" | "doing" | "finish"
      ClientAddressType: "CONSTRUCTION_SITE" | "OTHER"
      ClientType: "INDIVIDUAL" | "BUSINESS"
      QC_Status: "NOT_DONE" | "PARTIALLY_DONE" | "DONE"
      utente_genere: "maschio" | "femmina" | "altro" | "non_specificato"
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
      attivita_spazio: ["azienda", "privato"],
      attivita_stato: ["todo", "doing", "finish"],
      ClientAddressType: ["CONSTRUCTION_SITE", "OTHER"],
      ClientType: ["INDIVIDUAL", "BUSINESS"],
      QC_Status: ["NOT_DONE", "PARTIALLY_DONE", "DONE"],
      utente_genere: ["maschio", "femmina", "altro", "non_specificato"],
    },
  },
} as const
