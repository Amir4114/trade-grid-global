export type UserRole = "buyer" | "supplier" | "admin";

/* -------------------------------------------------------------------------- */
/*                                   PROFILE                                  */
/* -------------------------------------------------------------------------- */

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
};

/* -------------------------------------------------------------------------- */
/*                                   COMPANY                                  */
/* -------------------------------------------------------------------------- */

export type Company = {
  id: string;
  user_id: string;

  company_name: string;

  country: string;

  business_type: string;

  company_structure: string;

  verification_status: string;

  risk_score: number;

  employee_count: string | null;

  annual_purchase_volume: string | null;

  year_established: string | null;

  categories: string[];

  export_markets: string[];

  target_markets: string[];

  required_certifications: string[];

  certifications: string[];

  onboarding_completed: boolean;

  onboarding_step: string;

  account_type: UserRole | null;

  created_at: string;

  updated_at: string;
};

/* -------------------------------------------------------------------------- */
/*                                 DOCUMENTS                                  */
/* -------------------------------------------------------------------------- */

export type CompanyDocument = {
  id: string;

  company_id: string;

  doc_type: string;

  document_name: string;

  file_url: string;

  status: string;

  uploaded_at: string;
};

/* -------------------------------------------------------------------------- */
/*                                  PRODUCTS                                  */
/* -------------------------------------------------------------------------- */

export type ProductStatus =
  | "draft"
  | "pending"
  | "published"
  | "rejected"
  | "archived";

export type Product = {
  id: string;

  company_id: string;

  created_by: string | null;

  name: string;

  category: string;

  description: string;

  country_of_origin: string;

  moq: string;

  moq_quantity: number | null;

  moq_unit: string | null;

  packaging: string;

  lead_time: string;

  lead_time_min: number | null;

  lead_time_max: number | null;

  lead_time_unit: string | null;

  incoterms: string;

  incoterms_codes: string[];

  hs_code: string;

  price: string;

  price_amount: number | null;

  price_currency: string | null;

  price_unit: string | null;

  price_incoterm: string | null;

  certifications: string[];

  specifications: Record<string, string>;

  image_url: string | null;

  gallery: string[];

  status: ProductStatus;

  rejection_reason: string | null;

  published_at: string | null;

  created_at: string;

  updated_at: string;
};

/* -------------------------------------------------------------------------- */
/*                          PUBLIC MARKETPLACE VIEWS                          */
/* -------------------------------------------------------------------------- */

/**
 * Row shape of public.public_products (migration 008). Exposes ONLY published
 * products joined with the safe, public-facing supplier fields. No private
 * company/profile columns (user_id, risk_score, email, ...) are present.
 */
export type PublicProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  country_of_origin: string;
  moq: string;
  moq_quantity: number | null;
  moq_unit: string | null;
  packaging: string;
  lead_time: string;
  lead_time_min: number | null;
  lead_time_max: number | null;
  lead_time_unit: string | null;
  incoterms: string;
  incoterms_codes: string[];
  hs_code: string;
  price: string;
  price_amount: number | null;
  price_currency: string | null;
  price_unit: string | null;
  price_incoterm: string | null;
  certifications: string[];
  specifications: Record<string, string>;
  image_url: string | null;
  gallery: string[];
  published_at: string | null;
  created_at: string;
  company_id: string;
  company_name: string;
  company_country: string;
  business_type: string;
  verification_status: string;
  year_established: string | null;
  company_categories: string[];
};

/**
 * Row shape of public.public_suppliers (migration 008). Companies that have at
 * least one published product, projected to safe public fields only.
 */
export type PublicSupplier = {
  company_id: string;
  company_name: string;
  country: string;
  business_type: string;
  verification_status: string;
  year_established: string | null;
  categories: string[];
};

/* -------------------------------------------------------------------------- */
/*                               NOTIFICATIONS                                */
/* -------------------------------------------------------------------------- */

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export type Notification = {
  id: string;
  recipient_user_id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  action_url: string | null;
  metadata: Record<string, unknown>;
  priority: NotificationPriority;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

/* -------------------------------------------------------------------------- */
/*                                   DATABASE                                 */
/* -------------------------------------------------------------------------- */

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;

        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role: UserRole;
          created_at?: string;
        };

        Update: Partial<Profile>;

        Relationships: [];
      };

      companies: {
        Row: Company;

        Insert: {
          id?: string;

          user_id: string;

          company_name: string;

          country?: string;

          business_type?: string;

          company_structure?: string;

          verification_status?: string;

          risk_score?: number;

          employee_count?: string | null;

          annual_purchase_volume?: string | null;

          year_established?: string | null;

          categories?: string[];

          export_markets?: string[];

          target_markets?: string[];

          required_certifications?: string[];

          certifications?: string[];

          onboarding_completed?: boolean;

          onboarding_step?: string;

          account_type?: UserRole | null;

          created_at?: string;

          updated_at?: string;
        };

        Update: Partial<Company>;

        Relationships: [];
      };

      documents: {
        Row: CompanyDocument;

        Insert: {
          id?: string;

          company_id: string;

          doc_type: string;

          document_name: string;

          file_url: string;

          status?: string;

          uploaded_at?: string;
        };

        Update: Partial<CompanyDocument>;

        Relationships: [];
      };

      notifications: {
        Row: Notification;

        Insert: never;

        Update: never;

        Relationships: [];
      };

      products: {
        Row: Product;

        Insert: {
          id?: string;

          company_id: string;

          created_by?: string | null;

          name: string;

          category: string;

          description?: string;

          country_of_origin?: string;

          moq?: string;

          moq_quantity?: number | null;

          moq_unit?: string | null;

          packaging?: string;

          lead_time?: string;

          lead_time_min?: number | null;

          lead_time_max?: number | null;

          lead_time_unit?: string | null;

          incoterms?: string;

          incoterms_codes?: string[];

          hs_code?: string;

          price?: string;

          price_amount?: number | null;

          price_currency?: string | null;

          price_unit?: string | null;

          price_incoterm?: string | null;

          certifications?: string[];

          specifications?: Record<string, string>;

          image_url?: string | null;

          gallery?: string[];

          status?: ProductStatus;

          rejection_reason?: string | null;

          published_at?: string | null;

          created_at?: string;

          updated_at?: string;
        };

        Update: Partial<Product>;

        Relationships: [];
      };
    };

    Views: {
      public_products: {
        Row: PublicProduct;
        Relationships: [];
      };

      public_suppliers: {
        Row: PublicSupplier;
        Relationships: [];
      };
    };

    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };

      is_supplier: {
        Args: Record<string, never>;
        Returns: boolean;
      };

      user_owns_company: {
        Args: { cid: string };
        Returns: boolean;
      };

      submit_product_for_review: {
        Args: { product_id: string };
        Returns: Product;
      };

      approve_product: {
        Args: { product_id: string };
        Returns: Product;
      };

      reject_product: {
        Args: { product_id: string; reason: string };
        Returns: Product;
      };

      archive_product: {
        Args: { product_id: string };
        Returns: Product;
      };

      restore_archived_product: {
        Args: { product_id: string };
        Returns: Product;
      };

      reopen_published_product_for_editing: {
        Args: { product_id: string };
        Returns: Product;
      };

      mark_notification_read: {
        Args: { notification_id: string };
        Returns: Notification;
      };

      mark_all_notifications_read: {
        Args: Record<string, never>;
        Returns: number;
      };

      submit_company_for_verification: {
        Args: { company_id: string };
        Returns: Company;
      };
    };

    Enums: Record<string, never>;

    CompositeTypes: Record<string, never>;
  };
};

/* -------------------------------------------------------------------------- */
/*                                ADMIN TYPES                                 */
/* -------------------------------------------------------------------------- */

export type AdminUserRow = {
  id: string;

  email: string;

  full_name: string | null;

  role: UserRole;

  company_name: string;

  verification_status: string;

  created_at: string;
};