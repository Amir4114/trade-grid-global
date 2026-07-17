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

/* -------------------------------------------------------------------------- */
/*                                    RFQs                                    */
/* -------------------------------------------------------------------------- */

export type RfqStatus =
  | "draft"
  | "open"
  | "quoted"
  | "awarded"
  | "closed"
  | "cancelled"
  | "expired";

export type RfqVisibility =
  | "public"
  | "verified_suppliers_only"
  | "invite_only";

export type RfqInviteStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "revoked";

export type Rfq = {
  id: string;
  buyer_company_id: string;
  created_by: string | null;
  title: string;
  product_name: string;
  category: string;
  description: string;
  quantity_value: number | null;
  quantity_unit: string;
  packaging_requirement: string;
  target_country: string;
  delivery_port: string;
  required_certifications: string[];
  preferred_incoterms: string[];
  quote_deadline_at: string | null;
  notes: string;
  linked_product_id: string | null;
  visibility: RfqVisibility;
  status: RfqStatus;
  published_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type RfqAttachment = {
  id: string;
  rfq_id: string;
  uploaded_by: string | null;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number | null;
  created_at: string;
};

export type RfqEvent = {
  id: string;
  rfq_id: string;
  event_type: string;
  actor_type: "user" | "admin" | "system" | "ai";
  actor_user_id: string | null;
  from_status: string | null;
  to_status: string | null;
  message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type RfqInvite = {
  id: string;
  rfq_id: string;
  supplier_company_id: string;
  invited_by: string | null;
  status: RfqInviteStatus;
  invited_at: string;
  responded_at: string | null;
};

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
/*                          VERIFICATION OPERATIONS                           */
/* -------------------------------------------------------------------------- */

export type VerificationCaseRow = {
  id: string;
  case_type: "company_verification" | "product_review";
  entity_id: string;
  subject_user_id: string | null;
  company_id: string | null;
  status: "pending" | "in_review" | "approved" | "rejected" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  submitted_at: string;
  review_started_at: string | null;
  decided_at: string | null;
  assigned_admin_id: string | null;
  decision_reason: string | null;
  sla_due_at: string;
  sla_breached_at: string | null;
  source: "user_submission" | "system" | "ai_assisted" | "automation";
  created_at: string;
  updated_at: string;
};

export type VerificationCaseEventRow = {
  id: string;
  case_id: string;
  event_type: string;
  actor_type: "user" | "admin" | "system" | "ai";
  actor_user_id: string | null;
  from_status: string | null;
  to_status: string | null;
  message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type VerificationAssessmentRow = {
  id: string;
  case_id: string;
  assessor_type: "rule" | "ai" | "admin";
  assessor_name: string;
  assessment_type: string;
  result: "pass" | "fail" | "warning" | "unknown";
  confidence: number | null;
  summary: string | null;
  findings: Record<string, unknown>;
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

      verification_cases: {
        Row: VerificationCaseRow;

        Insert: never;

        Update: never;

        Relationships: [];
      };

      verification_case_events: {
        Row: VerificationCaseEventRow;

        Insert: never;

        Update: never;

        Relationships: [];
      };

      verification_assessments: {
        Row: VerificationAssessmentRow;

        Insert: never;

        Update: never;

        Relationships: [];
      };

      rfqs: {
        Row: Rfq;
        Insert: never;
        Update: never;
        Relationships: [];
      };

      rfq_attachments: {
        Row: RfqAttachment;
        Insert: {
          id?: string;
          rfq_id: string;
          uploaded_by?: string | null;
          file_name: string;
          storage_path: string;
          mime_type?: string;
          file_size_bytes?: number | null;
          created_at?: string;
        };
        Update: Partial<RfqAttachment>;
        Relationships: [];
      };

      rfq_events: {
        Row: RfqEvent;
        Insert: never;
        Update: never;
        Relationships: [];
      };

      rfq_invites: {
        Row: RfqInvite;
        Insert: {
          id?: string;
          rfq_id: string;
          supplier_company_id: string;
          invited_by?: string | null;
          status?: RfqInviteStatus;
          invited_at?: string;
          responded_at?: string | null;
        };
        Update: Partial<RfqInvite>;
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

      is_buyer: {
        Args: Record<string, never>;
        Returns: boolean;
      };

      user_owns_company: {
        Args: { cid: string };
        Returns: boolean;
      };

      supplier_can_access_rfq: {
        Args: { p_rfq_id: string };
        Returns: boolean;
      };

      create_draft_rfq: {
        Args: {
          p_title: string;
          p_product_name: string;
          p_category: string;
          p_description?: string;
          p_quantity_value?: number | null;
          p_quantity_unit?: string;
          p_packaging_requirement?: string;
          p_target_country?: string;
          p_delivery_port?: string;
          p_required_certifications?: string[];
          p_preferred_incoterms?: string[];
          p_quote_deadline_at?: string | null;
          p_notes?: string;
          p_visibility?: string;
          p_linked_product_id?: string | null;
          p_invite_supplier_ids?: string[];
        };
        Returns: Rfq;
      };

      update_draft_rfq: {
        Args: {
          p_rfq_id: string;
          p_title?: string | null;
          p_product_name?: string | null;
          p_category?: string | null;
          p_description?: string | null;
          p_quantity_value?: number | null;
          p_quantity_unit?: string | null;
          p_packaging_requirement?: string | null;
          p_target_country?: string | null;
          p_delivery_port?: string | null;
          p_required_certifications?: string[] | null;
          p_preferred_incoterms?: string[] | null;
          p_quote_deadline_at?: string | null;
          p_clear_quote_deadline?: boolean;
          p_notes?: string | null;
          p_visibility?: string | null;
          p_linked_product_id?: string | null;
          p_clear_linked_product?: boolean;
          p_invite_supplier_ids?: string[] | null;
        };
        Returns: Rfq;
      };

      publish_rfq: {
        Args: { p_rfq_id: string };
        Returns: Rfq;
      };

      close_rfq: {
        Args: { p_rfq_id: string };
        Returns: Rfq;
      };

      cancel_rfq: {
        Args: { p_rfq_id: string; p_reason?: string | null };
        Returns: Rfq;
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

      start_verification_case_review: {
        Args: { p_case_id: string };
        Returns: VerificationCaseRow;
      };

      set_verification_case_priority: {
        Args: { p_case_id: string; p_priority: string };
        Returns: VerificationCaseRow;
      };

      approve_company_verification: {
        Args: { p_company_id: string; p_risk_score?: number };
        Returns: Company;
      };

      reject_company_verification: {
        Args: { p_company_id: string; p_reason?: string };
        Returns: Company;
      };

      verification_case_sla_state: {
        Args: {
          p_sla_due_at: string;
          p_submitted_at: string;
          p_status: string;
        };
        Returns: string | null;
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