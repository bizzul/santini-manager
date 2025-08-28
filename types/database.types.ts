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
          userId: number
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
          userId: number
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
          userId?: number
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
            foreignKeyName: "Action_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
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
          businessName: string | null
          city: string | null
          clientLanguage: string | null
          clientType: Database["public"]["Enums"]["ClientType"]
          code: string
          countryCode: string | null
          email: string | null
          id: number
          individualFirstName: string | null
          individualLastName: string | null
          individualTitle: string | null
          landlinePhone: string | null
          latitude: number | null
          longitude: number | null
          mobilePhone: string | null
          organization_id: string | null
          site_id: string | null
          zipCode: number | null
        }
        Insert: {
          address?: string | null
          addressExtra?: string | null
          businessName?: string | null
          city?: string | null
          clientLanguage?: string | null
          clientType?: Database["public"]["Enums"]["ClientType"]
          code: string
          countryCode?: string | null
          email?: string | null
          id?: number
          individualFirstName?: string | null
          individualLastName?: string | null
          individualTitle?: string | null
          landlinePhone?: string | null
          latitude?: number | null
          longitude?: number | null
          mobilePhone?: string | null
          organization_id?: string | null
          site_id?: string | null
          zipCode?: number | null
        }
        Update: {
          address?: string | null
          addressExtra?: string | null
          businessName?: string | null
          city?: string | null
          clientLanguage?: string | null
          clientType?: Database["public"]["Enums"]["ClientType"]
          code?: string
          countryCode?: string | null
          email?: string | null
          id?: number
          individualFirstName?: string | null
          individualLastName?: string | null
          individualTitle?: string | null
          landlinePhone?: string | null
          latitude?: number | null
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
      company_settings: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      Department: {
        Row: {
          created_at: string
          description: string
          id: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: number
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      Errortracking: {
        Row: {
          created_at: string
          description: string
          employee_id: number
          error_category: string
          error_type: string
          id: number
          position: string
          supplier_id: number | null
          task_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          employee_id: number
          error_category: string
          error_type: string
          id?: number
          position: string
          supplier_id?: number | null
          task_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          employee_id?: number
          error_category?: string
          error_type?: string
          id?: number
          position?: string
          supplier_id?: number | null
          task_id?: number
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
      Exit_checklist: {
        Row: {
          created_at: string
          date: string
          employee_id: number
          id: number
          name: string
          position: string
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
          task_id?: number
          updated_at?: string
        }
        Relationships: [
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
          cloudinaryId: string
          errortrackingId: number | null
          id: number
          name: string
          taskId: number | null
          url: string
        }
        Insert: {
          cloudinaryId: string
          errortrackingId?: number | null
          id?: number
          name: string
          taskId?: number | null
          url: string
        }
        Update: {
          cloudinaryId?: string
          errortrackingId?: number | null
          id?: number
          name?: string
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
            foreignKeyName: "File_taskId_fkey"
            columns: ["taskId"]
            isOneToOne: false
            referencedRelation: "Task"
            referencedColumns: ["id"]
          },
        ]
      }
      Kanban: {
        Row: {
          color: string | null
          id: number
          identifier: string
          title: string
        }
        Insert: {
          color?: string | null
          id?: number
          identifier: string
          title: string
        }
        Update: {
          color?: string | null
          id?: number
          identifier?: string
          title?: string
        }
        Relationships: []
      }
      KanbanColumn: {
        Row: {
          icon: string | null
          id: number
          identifier: string
          kanbanId: number
          position: number
          tasks: number | null
          title: string
        }
        Insert: {
          icon?: string | null
          id?: number
          identifier: string
          kanbanId: number
          position: number
          tasks?: number | null
          title: string
        }
        Update: {
          icon?: string | null
          id?: number
          identifier?: string
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
          taskId: number
          updated_at: string
          userId: number
        }
        Insert: {
          created_at?: string
          id?: number
          passed?: Database["public"]["Enums"]["QC_Status"]
          taskId: number
          updated_at?: string
          userId: number
        }
        Update: {
          created_at?: string
          id?: number
          passed?: Database["public"]["Enums"]["QC_Status"]
          taskId?: number
          updated_at?: string
          userId?: number
        }
        Relationships: [
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
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      Product: {
        Row: {
          categoryId: number | null
          created_at: string
          description: string | null
          height: number | null
          id: number
          inventoryId: number
          length: number | null
          name: string
          quantity: number
          supplier: string | null
          supplierId: number | null
          total_price: number | null
          type: string | null
          unit: string | null
          unit_price: number
          updated_at: string
          width: number | null
        }
        Insert: {
          categoryId?: number | null
          created_at?: string
          description?: string | null
          height?: number | null
          id?: number
          inventoryId?: number
          length?: number | null
          name: string
          quantity: number
          supplier?: string | null
          supplierId?: number | null
          total_price?: number | null
          type?: string | null
          unit?: string | null
          unit_price: number
          updated_at?: string
          width?: number | null
        }
        Update: {
          categoryId?: number | null
          created_at?: string
          description?: string | null
          height?: number | null
          id?: number
          inventoryId?: number
          length?: number | null
          name?: string
          quantity?: number
          supplier?: string | null
          supplierId?: number | null
          total_price?: number | null
          type?: string | null
          unit?: string | null
          unit_price?: number
          updated_at?: string
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
          created_at: string
          description: string
          id: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: number
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
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
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      QualityControl: {
        Row: {
          created_at: string
          id: number
          passed: Database["public"]["Enums"]["QC_Status"]
          position_nr: string
          taskId: number
          updated_at: string
          userId: number
        }
        Insert: {
          created_at?: string
          id?: number
          passed?: Database["public"]["Enums"]["QC_Status"]
          position_nr: string
          taskId: number
          updated_at?: string
          userId: number
        }
        Update: {
          created_at?: string
          id?: number
          passed?: Database["public"]["Enums"]["QC_Status"]
          position_nr?: string
          taskId?: number
          updated_at?: string
          userId?: number
        }
        Relationships: [
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
      Roles: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      SellProduct: {
        Row: {
          active: boolean
          created_at: string
          id: number
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: number
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: number
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
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
      sites: {
        Row: {
          created_at: string | null
          custom_domain: string | null
          description: string | null
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
          category: string | null
          contact: string | null
          created_at: string
          description: string
          email: string | null
          id: number
          location: string | null
          name: string
          phone: string | null
          short_name: string | null
          supplier_image: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          cap?: number | null
          category?: string | null
          contact?: string | null
          created_at?: string
          description: string
          email?: string | null
          id?: number
          location?: string | null
          name: string
          phone?: string | null
          short_name?: string | null
          supplier_image?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          cap?: number | null
          category?: string | null
          contact?: string | null
          created_at?: string
          description?: string
          email?: string | null
          id?: number
          location?: string | null
          name?: string
          phone?: string | null
          short_name?: string | null
          supplier_image?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      Task: {
        Row: {
          altro: boolean | null
          archived: boolean
          clientId: number | null
          column_id: number | null
          column_position: number | null
          created_at: string
          deliveryDate: string | null
          ferramenta: boolean
          id: number
          kanbanColumnId: number | null
          kanbanId: number | null
          legno: boolean | null
          locked: boolean
          material: boolean
          metalli: boolean
          name: string | null
          other: string | null
          percentStatus: number | null
          positions: string[] | null
          sellPrice: number | null
          sellProductId: number | null
          status: string | null
          stoccaggiodate: string | null
          stoccato: boolean | null
          title: string | null
          unique_code: string | null
          updated_at: string
          userId: number | null
          vernice: boolean | null
        }
        Insert: {
          altro?: boolean | null
          archived?: boolean
          clientId?: number | null
          column_id?: number | null
          column_position?: number | null
          created_at?: string
          deliveryDate?: string | null
          ferramenta?: boolean
          id?: number
          kanbanColumnId?: number | null
          kanbanId?: number | null
          legno?: boolean | null
          locked?: boolean
          material?: boolean
          metalli?: boolean
          name?: string | null
          other?: string | null
          percentStatus?: number | null
          positions?: string[] | null
          sellPrice?: number | null
          sellProductId?: number | null
          status?: string | null
          stoccaggiodate?: string | null
          stoccato?: boolean | null
          title?: string | null
          unique_code?: string | null
          updated_at?: string
          userId?: number | null
          vernice?: boolean | null
        }
        Update: {
          altro?: boolean | null
          archived?: boolean
          clientId?: number | null
          column_id?: number | null
          column_position?: number | null
          created_at?: string
          deliveryDate?: string | null
          ferramenta?: boolean
          id?: number
          kanbanColumnId?: number | null
          kanbanId?: number | null
          legno?: boolean | null
          locked?: boolean
          material?: boolean
          metalli?: boolean
          name?: string | null
          other?: string | null
          percentStatus?: number | null
          positions?: string[] | null
          sellPrice?: number | null
          sellProductId?: number | null
          status?: string | null
          stoccaggiodate?: string | null
          stoccato?: boolean | null
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
            foreignKeyName: "Task_sellProductId_fkey"
            columns: ["sellProductId"]
            isOneToOne: false
            referencedRelation: "SellProduct"
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
          supplierId: number
          taskId: number
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          deliveryDate?: string | null
          id?: number
          supplierId: number
          taskId: number
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          deliveryDate?: string | null
          id?: number
          supplierId?: number
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
          created_at: string
          description: string | null
          description_type: string
          employee_id: number | null
          endTime: string | null
          hours: number | null
          id: number
          minutes: number | null
          startTime: string | null
          task_id: number | null
          totalTime: number
          updated_at: string
          use_cnc: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_type?: string
          employee_id?: number | null
          endTime?: string | null
          hours?: number | null
          id?: number
          minutes?: number | null
          startTime?: string | null
          task_id?: number | null
          totalTime: number
          updated_at?: string
          use_cnc: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          description_type?: string
          employee_id?: number | null
          endTime?: string | null
          hours?: number | null
          id?: number
          minutes?: number | null
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
          auth_id: string | null
          authId: string | null
          color: string | null
          email: string
          enabled: boolean
          family_name: string | null
          given_name: string | null
          id: number
          initials: string | null
          picture: string | null
          role: string | null
        }
        Insert: {
          auth_id?: string | null
          authId?: string | null
          color?: string | null
          email: string
          enabled?: boolean
          family_name?: string | null
          given_name?: string | null
          id?: number
          initials?: string | null
          picture?: string | null
          role?: string | null
        }
        Update: {
          auth_id?: string | null
          authId?: string | null
          color?: string | null
          email?: string
          enabled?: boolean
          family_name?: string | null
          given_name?: string | null
          id?: number
          initials?: string | null
          picture?: string | null
          role?: string | null
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organization_schema: {
        Args: { org_id: string; schema_name: string }
        Returns: undefined
      }
      fetch_users_from_schema: {
        Args: { schema_name: string }
        Returns: {
          id: string
          name: string
          role: string
        }[]
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
      is_user_in_organization: {
        Args: { org_uuid: string; user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      ClientAddressType: "CONSTRUCTION_SITE" | "OTHER"
      ClientType: "INDIVIDUAL" | "BUSINESS"
      QC_Status: "NOT_DONE" | "PARTIALLY_DONE" | "DONE"
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
      ClientAddressType: ["CONSTRUCTION_SITE", "OTHER"],
      ClientType: ["INDIVIDUAL", "BUSINESS"],
      QC_Status: ["NOT_DONE", "PARTIALLY_DONE", "DONE"],
    },
  },
} as const
