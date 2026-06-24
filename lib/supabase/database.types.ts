export type AppRole = "superadmin" | "staff";

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
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: AppRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          role?: AppRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          role?: AppRole;
          updated_at?: string;
        };
        Relationships: [];
      };
      menu_items: {
        Row: {
          id: string;
          name: string;
          note: string;
          qty: number;
          is_active: boolean;
          active_image_id: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          note?: string;
          qty?: number;
          is_active?: boolean;
          active_image_id?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          note?: string;
          qty?: number;
          is_active?: boolean;
          active_image_id?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_active_image_id_fkey";
            columns: ["active_image_id"];
            referencedRelation: "menu_images";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_items_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_items_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_images: {
        Row: {
          id: string;
          menu_item_id: string;
          bucket: string;
          storage_path: string;
          public_url: string | null;
          uploaded_by: string | null;
          expires_at: string;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          menu_item_id: string;
          bucket?: string;
          storage_path: string;
          public_url?: string | null;
          uploaded_by?: string | null;
          expires_at?: string;
          deleted_at?: string | null;
          created_at?: string;
        };
        Update: {
          public_url?: string | null;
          deleted_at?: string | null;
          expires_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_images_menu_item_id_fkey";
            columns: ["menu_item_id"];
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_images_uploaded_by_fkey";
            columns: ["uploaded_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      take_menu_item: {
        Args: { p_menu_item_id: string };
        Returns: Database["public"]["Tables"]["menu_items"]["Row"];
      };
    };
    Views: Record<string, never>;
    Enums: {
      app_role: AppRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
