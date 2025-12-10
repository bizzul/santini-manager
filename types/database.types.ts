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
    PostgrestVersion: "12.1 (8cbcf98)"
  }
  public: {
    Tables: {
      Action: {
        Row: {
          createdAt: string
          data: Json
          id: number
          type: string
          userId: string
        }
        Insert: {
          createdAt?: string
          data: Json
          id?: number
          type: string
          userId: string
        }
        Update: {
          createdAt?: string
          data?: Json
          id?: number
          type?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Action_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      article_version: {
        Row: {
          article_id: number | null
          content: string
          id: number
          version_type: string
        }
        Insert: {
          article_id?: number | null
          content: string
          id?: number
          version_type: string
        }
        Update: {
          article_id?: number | null
          content?: string
          id?: number
          version_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_version_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "Articolo"
            referencedColumns: ["id"]
          },
        ]
      }
      Articolo: {
        Row: {
          authorId: string
          category: string | null
          createdAt: string
          id: number
          imageUrl: string | null
          jolly: boolean | null
          location: string | null
          locked_at: string | null
          locked_by: string | null
          publishDate: string | null
          published: boolean
          source: string | null
          sourceUrl: string | null
          summary: string | null
          tags: string[] | null
          title: string
          updatedAt: string
        }
        Insert: {
          authorId: string
          category?: string | null
          createdAt?: string
          id?: number
          imageUrl?: string | null
          jolly?: boolean | null
          location?: string | null
          locked_at?: string | null
          locked_by?: string | null
          publishDate?: string | null
          published?: boolean
          source?: string | null
          sourceUrl?: string | null
          summary?: string | null
          tags?: string[] | null
          title: string
          updatedAt?: string
        }
        Update: {
          authorId?: string
          category?: string | null
          createdAt?: string
          id?: number
          imageUrl?: string | null
          jolly?: boolean | null
          location?: string | null
          locked_at?: string | null
          locked_by?: string | null
          publishDate?: string | null
          published?: boolean
          source?: string | null
          sourceUrl?: string | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Articolo_authorId_fkey"
            columns: ["authorId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Articolo_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      articoloedizione: {
        Row: {
          archived: boolean
          articolo_id: number
          created_at: string
          edizione_id: number
          id: number
          order: number | null
          version_id: number
        }
        Insert: {
          archived?: boolean
          articolo_id: number
          created_at?: string
          edizione_id: number
          id?: number
          order?: number | null
          version_id: number
        }
        Update: {
          archived?: boolean
          articolo_id?: number
          created_at?: string
          edizione_id?: number
          id?: number
          order?: number | null
          version_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "articoloedizione_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "Articolo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articoloedizione_edizione_id_fkey"
            columns: ["edizione_id"]
            isOneToOne: false
            referencedRelation: "Edizione"
            referencedColumns: ["id"]
          },
        ]
      }
      Category: {
        Row: {
          description: string | null
          id: number
          name: string
        }
        Insert: {
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      Edizione: {
        Row: {
          archived: boolean
          created_at: string
          id: number
          nome: string | null
          orario: string | null
          reader: string | null
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: number
          nome?: string | null
          orario?: string | null
          reader?: string | null
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: number
          nome?: string | null
          orario?: string | null
          reader?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Edizione_reader_fkey"
            columns: ["reader"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          read: boolean | null
          sender_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          read?: boolean | null
          sender_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          read?: boolean | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      Program: {
        Row: {
          calendarId: number | null
          created_at: string
          description: string | null
          endTime: string | null
          Hashtag: string | null
          id: number
          IsAllDay: boolean | null
          IsReadonly: boolean | null
          IsRepeated: boolean | null
          recurrenceException: string | null
          recurrenceID: number | null
          RecurrenceRule: string | null
          Remote: boolean
          startTime: string | null
          subject: string | null
          type: string | null
          Url: string | null
        }
        Insert: {
          calendarId?: number | null
          created_at?: string
          description?: string | null
          endTime?: string | null
          Hashtag?: string | null
          id?: number
          IsAllDay?: boolean | null
          IsReadonly?: boolean | null
          IsRepeated?: boolean | null
          recurrenceException?: string | null
          recurrenceID?: number | null
          RecurrenceRule?: string | null
          Remote?: boolean
          startTime?: string | null
          subject?: string | null
          type?: string | null
          Url?: string | null
        }
        Update: {
          calendarId?: number | null
          created_at?: string
          description?: string | null
          endTime?: string | null
          Hashtag?: string | null
          id?: number
          IsAllDay?: boolean | null
          IsReadonly?: boolean | null
          IsRepeated?: boolean | null
          recurrenceException?: string | null
          recurrenceID?: number | null
          RecurrenceRule?: string | null
          Remote?: boolean
          startTime?: string | null
          subject?: string | null
          type?: string | null
          Url?: string | null
        }
        Relationships: []
      }
      storage_events: {
        Row: {
          bucket_name: string | null
          caption: string | null
          file_name: string | null
          id: number
          name: string | null
          publicUrl: string | null
          timestamp: string | null
          type: string | null
        }
        Insert: {
          bucket_name?: string | null
          caption?: string | null
          file_name?: string | null
          id?: number
          name?: string | null
          publicUrl?: string | null
          timestamp?: string | null
          type?: string | null
        }
        Update: {
          bucket_name?: string | null
          caption?: string | null
          file_name?: string | null
          id?: number
          name?: string | null
          publicUrl?: string | null
          timestamp?: string | null
          type?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          createdAt: string
          email: string | null
          id: string
          name: string | null
          role: Database["public"]["Enums"]["Role"]
          updatedAt: string | null
        }
        Insert: {
          createdAt: string
          email?: string | null
          id: string
          name?: string | null
          role?: Database["public"]["Enums"]["Role"]
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string
          email?: string | null
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["Role"]
          updatedAt?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      "empty-storage-news-backups": { Args: never; Returns: undefined }
      get_articles_with_editions: {
        Args: never
        Returns: {
          archived: boolean
          authorId: string
          category: string
          content: string
          createdAt: string
          edizione_id: number
          id: number
          imageUrl: string
          location: string
          locked_at: string
          locked_by: string
          nome: string
          orario: string
          publishDate: string
          published: boolean
          source: string
          sourceUrl: string
          summary: string
          tags: string[]
          title: string
          updatedAt: string
          version_type: string
        }[]
      }
      reset_edizioni: { Args: never; Returns: undefined }
    }
    Enums: {
      Role: "admin" | "user"
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
      Role: ["admin", "user"],
    },
  },
} as const
