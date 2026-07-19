import type { CompanyDocumentType } from "@/lib/document-options"

export type UserRole = "buyer" | "supplier" | "admin"
export type CompanyAccountType = "buyer" | "supplier"
export type CompanyVerificationStatus =
  | "pending"
  | "under_review"
  | "verified"
  | "rejected"
export type CompanyDocumentStatus = "pending" | "approved" | "rejected"

/* -------------------------------------------------------------------------- */
/*                                   PROFILE                                  */
/* -------------------------------------------------------------------------- */

export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
}

/* -------------------------------------------------------------------------- */
/*                                   COMPANY                                  */
/* -------------------------------------------------------------------------- */

export type Company = {
  id: string
  user_id: string

  company_name: string

  country: string

  business_type: string

  company_structure: string

  verification_status: CompanyVerificationStatus

  risk_score: number

  employee_count: string | null

  annual_purchase_volume: string | null

  year_established: string | null

  categories: string[]

  export_markets: string[]

  target_markets: string[]

  required_certifications: string[]

  certifications: string[]

  onboarding_completed: boolean

  onboarding_step: string

  account_type: CompanyAccountType | null

  created_at: string

  updated_at: string
}

/* -------------------------------------------------------------------------- */
/*                                 DOCUMENTS                                  */
/* -------------------------------------------------------------------------- */

export type CompanyDocument = {
  id: string

  company_id: string

  doc_type: CompanyDocumentType

  document_name: string

  file_url: string

  status: CompanyDocumentStatus

  uploaded_at: string
}

/* -------------------------------------------------------------------------- */
/*                                  PRODUCTS                                  */
/* -------------------------------------------------------------------------- */

export type ProductStatus =
  | "draft"
  | "pending"
  | "published"
  | "rejected"
  | "archived"

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
  | "expired"

export type RfqVisibility = "public" | "verified_suppliers_only" | "invite_only"

export type RfqInviteStatus = "pending" | "accepted" | "declined" | "revoked"

export type Rfq = {
  id: string
  buyer_company_id: string
  created_by: string | null
  title: string
  product_name: string
  category: string
  description: string
  quantity_value: number | null
  quantity_unit: string
  packaging_requirement: string
  target_country: string
  delivery_port: string
  required_certifications: string[]
  preferred_incoterms: string[]
  quote_deadline_at: string | null
  notes: string
  linked_product_id: string | null
  visibility: RfqVisibility
  status: RfqStatus
  published_at: string | null
  closed_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
}

export type RfqAttachment = {
  id: string
  rfq_id: string
  uploaded_by: string | null
  file_name: string
  storage_path: string
  mime_type: string
  file_size_bytes: number | null
  created_at: string
}

export type RfqEvent = {
  id: string
  rfq_id: string
  event_type: string
  actor_type: "user" | "admin" | "system" | "ai"
  actor_user_id: string | null
  from_status: string | null
  to_status: string | null
  message: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type RfqInvite = {
  id: string
  rfq_id: string
  supplier_company_id: string
  invited_by: string | null
  status: RfqInviteStatus
  invited_at: string
  responded_at: string | null
}

/* -------------------------------------------------------------------------- */
/*                                QUOTATIONS                                  */
/* -------------------------------------------------------------------------- */

export type QuotationThreadStatus =
  | "draft"
  | "active"
  | "withdrawn"
  | "awarded"
  | "closed"

export type QuotationOfferStatus =
  | "draft"
  | "submitted"
  | "withdrawn"
  | "rejected"
  | "superseded"
  | "awarded"
  | "not_selected"

export type QuotationOfferedBy = "supplier" | "buyer"

export type QuotationThread = {
  id: string
  rfq_id: string
  supplier_company_id: string
  status: QuotationThreadStatus
  current_offer_id: string | null
  awarded_offer_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type QuotationOffer = {
  id: string
  thread_id: string
  revision_no: number
  offered_by: QuotationOfferedBy
  supersedes_offer_id: string | null
  currency: string
  unit_price: number | null
  price_unit: string
  total_price: number | null
  incoterm: string
  lead_time_min: number | null
  lead_time_max: number | null
  lead_time_unit: string
  moq_quantity: number | null
  moq_unit: string
  validity_until: string | null
  notes: string
  linked_product_id: string | null
  status: QuotationOfferStatus
  created_by: string | null
  submitted_at: string | null
  withdrawn_at: string | null
  created_at: string
  updated_at: string
}

export type QuotationAttachment = {
  id: string
  offer_id: string
  uploaded_by: string | null
  file_name: string
  storage_path: string
  mime_type: string
  file_size_bytes: number | null
  created_at: string
}

export type QuotationEvent = {
  id: string
  thread_id: string
  offer_id: string | null
  event_type: string
  actor_type: "user" | "admin" | "system" | "ai"
  actor_user_id: string | null
  from_status: string | null
  to_status: string | null
  message: string | null
  metadata: Record<string, unknown>
  created_at: string
}

/* -------------------------------------------------------------------------- */
/*                                   AWARDS                                   */
/* -------------------------------------------------------------------------- */

export type QuotationAwardStatus = "active" | "revoked"

export type QuotationAward = {
  id: string
  rfq_id: string
  thread_id: string
  offer_id: string
  supplier_company_id: string
  awarded_by: string | null
  status: QuotationAwardStatus
  notes: string
  awarded_at: string
  revoked_at: string | null
  revoke_reason: string | null
  created_at: string
  updated_at: string
}

export type AwardEvent = {
  id: string
  award_id: string
  event_type: string
  actor_type: "user" | "admin" | "system" | "ai"
  actor_user_id: string | null
  from_status: string | null
  to_status: string | null
  message: string | null
  metadata: Record<string, unknown>
  created_at: string
}

/* -------------------------------------------------------------------------- */
/*                              PURCHASE ORDERS                               */
/* -------------------------------------------------------------------------- */

export type PurchaseOrderStatus =
  | "draft"
  | "issued"
  | "accepted"
  | "rejected"
  | "cancelled"

export type PurchaseOrder = {
  id: string
  po_number: string
  revision_no: number
  buyer_company_id: string
  supplier_company_id: string
  award_id: string
  rfq_id: string
  thread_id: string
  source_offer_id: string
  status: PurchaseOrderStatus
  buyer_company_name: string
  supplier_company_name: string
  buyer_country: string
  supplier_country: string
  buyer_address: string
  supplier_address: string
  buyer_tax_id: string
  supplier_tax_id: string
  buyer_contact_name: string
  buyer_contact_email: string
  supplier_contact_name: string
  supplier_contact_email: string
  product_name: string
  category: string
  currency: string
  unit_price: number | null
  price_unit: string
  total_price: number | null
  quantity_value: number | null
  quantity_unit: string
  moq_quantity: number | null
  moq_unit: string
  incoterm: string
  payment_terms: string
  lead_time_min: number | null
  lead_time_max: number | null
  lead_time_unit: string
  target_country: string
  delivery_port: string
  packaging_requirement: string
  validity_until: string | null
  commercial_notes: string
  linked_product_id: string | null
  created_by: string | null
  issued_by: string | null
  accepted_by: string | null
  rejected_by: string | null
  cancelled_by: string | null
  issued_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  cancelled_at: string | null
  reject_reason: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
}

export type PurchaseOrderItem = {
  id: string
  purchase_order_id: string
  line_no: number
  product_name: string
  category: string
  description: string
  quantity_value: number | null
  quantity_unit: string
  unit_price: number | null
  price_unit: string
  line_total: number | null
  currency: string
  linked_product_id: string | null
  created_at: string
  updated_at: string
}

export type PurchaseOrderEvent = {
  id: string
  purchase_order_id: string
  event_type: string
  actor_type: "user" | "admin" | "system" | "ai"
  actor_user_id: string | null
  from_status: string | null
  to_status: string | null
  message: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type PurchaseOrderDocument = {
  id: string
  purchase_order_id: string
  uploaded_by: string | null
  document_type: string
  file_name: string
  storage_path: string
  mime_type: string
  file_size_bytes: number | null
  created_at: string
}

/* -------------------------------------------------------------------------- */
/*                              FULFILLMENT                                   */
/* -------------------------------------------------------------------------- */

export type FulfillmentOrderStatus =
  | "opened"
  | "in_production"
  | "quality_check"
  | "packaging"
  | "ready_to_ship"
  | "shipped"
  | "in_transit"
  | "delivered"
  | "completed"
  | "cancelled"
  | "failed"

export type FulfillmentOrder = {
  id: string
  fulfillment_number: string
  purchase_order_id: string
  buyer_company_id: string
  supplier_company_id: string
  status: FulfillmentOrderStatus
  is_paused: boolean
  is_disputed: boolean
  production_location: string
  tracking_reference: string
  cancel_reason: string | null
  fail_reason: string | null
  dispute_reason: string | null
  opened_at: string
  production_started_at: string | null
  production_completed_at: string | null
  qc_started_at: string | null
  qc_completed_at: string | null
  packaging_started_at: string | null
  packaging_completed_at: string | null
  ready_to_ship_at: string | null
  shipped_at: string | null
  in_transit_at: string | null
  delivered_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  failed_at: string | null
  disputed_at: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type FulfillmentOrderEvent = {
  id: string
  fulfillment_order_id: string
  event_type: string
  actor_type: "user" | "admin" | "system" | "ai"
  actor_user_id: string | null
  from_status: string | null
  to_status: string | null
  message: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type FulfillmentOrderDocument = {
  id: string
  fulfillment_order_id: string
  uploaded_by: string | null
  document_type: string
  stage: string
  file_name: string
  storage_path: string
  mime_type: string
  file_size_bytes: number | null
  created_at: string
}

export type Product = {
  id: string

  company_id: string

  created_by: string | null

  name: string

  category: string

  description: string

  country_of_origin: string

  moq: string

  moq_quantity: number | null

  moq_unit: string | null

  packaging: string

  lead_time: string

  lead_time_min: number | null

  lead_time_max: number | null

  lead_time_unit: string | null

  incoterms: string

  incoterms_codes: string[]

  hs_code: string

  price: string

  price_amount: number | null

  price_currency: string | null

  price_unit: string | null

  price_incoterm: string | null

  certifications: string[]

  specifications: Record<string, string>

  image_url: string | null

  gallery: string[]

  status: ProductStatus

  rejection_reason: string | null

  published_at: string | null

  created_at: string

  updated_at: string
}

/* -------------------------------------------------------------------------- */
/*                          PUBLIC MARKETPLACE VIEWS                          */
/* -------------------------------------------------------------------------- */

/**
 * Row shape of public.public_products (migration 008). Exposes ONLY published
 * products joined with the safe, public-facing supplier fields. No private
 * company/profile columns (user_id, risk_score, email, ...) are present.
 */
export type PublicProduct = {
  id: string
  name: string
  category: string
  description: string
  country_of_origin: string
  moq: string
  moq_quantity: number | null
  moq_unit: string | null
  packaging: string
  lead_time: string
  lead_time_min: number | null
  lead_time_max: number | null
  lead_time_unit: string | null
  incoterms: string
  incoterms_codes: string[]
  hs_code: string
  price: string
  price_amount: number | null
  price_currency: string | null
  price_unit: string | null
  price_incoterm: string | null
  certifications: string[]
  specifications: Record<string, string>
  image_url: string | null
  gallery: string[]
  published_at: string | null
  created_at: string
  company_id: string
  company_name: string
  company_country: string
  business_type: string
  verification_status: string
  year_established: string | null
  company_categories: string[]
}

/**
 * Row shape of public.public_suppliers (migration 008). Companies that have at
 * least one published product, projected to safe public fields only.
 */
export type PublicSupplier = {
  company_id: string
  company_name: string
  country: string
  business_type: string
  verification_status: string
  year_established: string | null
  categories: string[]
}

/* -------------------------------------------------------------------------- */
/*                               NOTIFICATIONS                                */
/* -------------------------------------------------------------------------- */

export type NotificationPriority = "low" | "normal" | "high" | "urgent"

export type Notification = {
  id: string
  recipient_user_id: string
  type: string
  title: string
  message: string
  entity_type: string | null
  entity_id: string | null
  action_url: string | null
  metadata: Record<string, unknown>
  priority: NotificationPriority
  is_read: boolean
  read_at: string | null
  created_at: string
}

/* -------------------------------------------------------------------------- */
/*                          VERIFICATION OPERATIONS                           */
/* -------------------------------------------------------------------------- */

export type VerificationCaseRow = {
  id: string
  case_type: "company_verification" | "product_review"
  entity_id: string
  subject_user_id: string | null
  company_id: string | null
  status: "pending" | "in_review" | "approved" | "rejected" | "cancelled"
  priority: "low" | "normal" | "high" | "urgent"
  submitted_at: string
  review_started_at: string | null
  decided_at: string | null
  assigned_admin_id: string | null
  decision_reason: string | null
  sla_due_at: string
  sla_breached_at: string | null
  source: "user_submission" | "system" | "ai_assisted" | "automation"
  created_at: string
  updated_at: string
}

export type VerificationCaseDocumentRow = {
  case_id: string
  document_id: string
  submitted_at: string
}

export type VerificationCaseEventRow = {
  id: string
  case_id: string
  event_type: string
  actor_type: "user" | "admin" | "system" | "ai"
  actor_user_id: string | null
  from_status: string | null
  to_status: string | null
  message: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type VerificationAssessmentRow = {
  id: string
  case_id: string
  assessor_type: "rule" | "ai" | "admin"
  assessor_name: string
  assessment_type: string
  result: "pass" | "fail" | "warning" | "unknown"
  confidence: number | null
  summary: string | null
  findings: Record<string, unknown>
  created_at: string
}

/* -------------------------------------------------------------------------- */
/*                                   DATABASE                                 */
/* -------------------------------------------------------------------------- */

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile

        Insert: {
          id: string
          email: string
          full_name?: string | null
          role: UserRole
          created_at?: string
        }

        Update: Partial<Profile>

        Relationships: []
      }

      companies: {
        Row: Company

        Insert: {
          id?: string

          user_id: string

          company_name: string

          country?: string

          business_type?: string

          company_structure?: string

          verification_status?: string

          risk_score?: number

          employee_count?: string | null

          annual_purchase_volume?: string | null

          year_established?: string | null

          categories?: string[]

          export_markets?: string[]

          target_markets?: string[]

          required_certifications?: string[]

          certifications?: string[]

          onboarding_completed?: boolean

          onboarding_step?: string

          account_type?: CompanyAccountType | null

          created_at?: string

          updated_at?: string
        }

        Update: Partial<Company>

        Relationships: []
      }

      documents: {
        Row: CompanyDocument

        Insert: {
          id?: string

          company_id: string

          doc_type: CompanyDocumentType

          document_name: string

          file_url: string

          status?: string

          uploaded_at?: string
        }

        Update: Partial<CompanyDocument>

        Relationships: []
      }

      notifications: {
        Row: Notification

        Insert: never

        Update: never

        Relationships: []
      }

      verification_cases: {
        Row: VerificationCaseRow

        Insert: never

        Update: never

        Relationships: []
      }

      verification_case_documents: {
        Row: VerificationCaseDocumentRow

        Insert: never

        Update: never

        Relationships: []
      }

      verification_case_events: {
        Row: VerificationCaseEventRow

        Insert: never

        Update: never

        Relationships: []
      }

      verification_assessments: {
        Row: VerificationAssessmentRow

        Insert: never

        Update: never

        Relationships: []
      }

      rfqs: {
        Row: Rfq
        Insert: never
        Update: never
        Relationships: []
      }

      rfq_attachments: {
        Row: RfqAttachment
        Insert: {
          id?: string
          rfq_id: string
          uploaded_by?: string | null
          file_name: string
          storage_path: string
          mime_type?: string
          file_size_bytes?: number | null
          created_at?: string
        }
        Update: Partial<RfqAttachment>
        Relationships: []
      }

      rfq_events: {
        Row: RfqEvent
        Insert: never
        Update: never
        Relationships: []
      }

      rfq_invites: {
        Row: RfqInvite
        Insert: {
          id?: string
          rfq_id: string
          supplier_company_id: string
          invited_by?: string | null
          status?: RfqInviteStatus
          invited_at?: string
          responded_at?: string | null
        }
        Update: Partial<RfqInvite>
        Relationships: []
      }

      quotation_threads: {
        Row: QuotationThread
        Insert: never
        Update: never
        Relationships: []
      }

      quotation_offers: {
        Row: QuotationOffer
        Insert: never
        Update: never
        Relationships: []
      }

      quotation_attachments: {
        Row: QuotationAttachment
        Insert: {
          id?: string
          offer_id: string
          uploaded_by?: string | null
          file_name: string
          storage_path: string
          mime_type?: string
          file_size_bytes?: number | null
          created_at?: string
        }
        Update: Partial<QuotationAttachment>
        Relationships: []
      }

      quotation_events: {
        Row: QuotationEvent
        Insert: never
        Update: never
        Relationships: []
      }

      quotation_awards: {
        Row: QuotationAward
        Insert: never
        Update: never
        Relationships: []
      }

      award_events: {
        Row: AwardEvent
        Insert: never
        Update: never
        Relationships: []
      }

      purchase_orders: {
        Row: PurchaseOrder
        Insert: never
        Update: never
        Relationships: []
      }

      purchase_order_items: {
        Row: PurchaseOrderItem
        Insert: never
        Update: never
        Relationships: []
      }

      purchase_order_events: {
        Row: PurchaseOrderEvent
        Insert: never
        Update: never
        Relationships: []
      }

      purchase_order_documents: {
        Row: PurchaseOrderDocument
        Insert: never
        Update: never
        Relationships: []
      }

      fulfillment_orders: {
        Row: FulfillmentOrder
        Insert: never
        Update: never
        Relationships: []
      }

      fulfillment_order_events: {
        Row: FulfillmentOrderEvent
        Insert: never
        Update: never
        Relationships: []
      }

      fulfillment_order_documents: {
        Row: FulfillmentOrderDocument
        Insert: never
        Update: never
        Relationships: []
      }

      products: {
        Row: Product

        Insert: {
          id?: string

          company_id: string

          created_by?: string | null

          name: string

          category: string

          description?: string

          country_of_origin?: string

          moq?: string

          moq_quantity?: number | null

          moq_unit?: string | null

          packaging?: string

          lead_time?: string

          lead_time_min?: number | null

          lead_time_max?: number | null

          lead_time_unit?: string | null

          incoterms?: string

          incoterms_codes?: string[]

          hs_code?: string

          price?: string

          price_amount?: number | null

          price_currency?: string | null

          price_unit?: string | null

          price_incoterm?: string | null

          certifications?: string[]

          specifications?: Record<string, string>

          image_url?: string | null

          gallery?: string[]

          status?: ProductStatus

          rejection_reason?: string | null

          published_at?: string | null

          created_at?: string

          updated_at?: string
        }

        Update: Partial<Product>

        Relationships: []
      }
    }

    Views: {
      public_products: {
        Row: PublicProduct
        Relationships: []
      }

      public_suppliers: {
        Row: PublicSupplier
        Relationships: []
      }
    }

    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }

      is_supplier: {
        Args: Record<string, never>
        Returns: boolean
      }

      is_buyer: {
        Args: Record<string, never>
        Returns: boolean
      }

      user_owns_company: {
        Args: { cid: string }
        Returns: boolean
      }

      supplier_can_access_rfq: {
        Args: { p_rfq_id: string }
        Returns: boolean
      }

      create_draft_rfq: {
        Args: {
          p_title: string
          p_product_name: string
          p_category: string
          p_description?: string
          p_quantity_value?: number | null
          p_quantity_unit?: string
          p_packaging_requirement?: string
          p_target_country?: string
          p_delivery_port?: string
          p_required_certifications?: string[]
          p_preferred_incoterms?: string[]
          p_quote_deadline_at?: string | null
          p_notes?: string
          p_visibility?: string
          p_linked_product_id?: string | null
          p_invite_supplier_ids?: string[]
        }
        Returns: Rfq
      }

      update_draft_rfq: {
        Args: {
          p_rfq_id: string
          p_title?: string | null
          p_product_name?: string | null
          p_category?: string | null
          p_description?: string | null
          p_quantity_value?: number | null
          p_quantity_unit?: string | null
          p_packaging_requirement?: string | null
          p_target_country?: string | null
          p_delivery_port?: string | null
          p_required_certifications?: string[] | null
          p_preferred_incoterms?: string[] | null
          p_quote_deadline_at?: string | null
          p_clear_quote_deadline?: boolean
          p_notes?: string | null
          p_visibility?: string | null
          p_linked_product_id?: string | null
          p_clear_linked_product?: boolean
          p_invite_supplier_ids?: string[] | null
        }
        Returns: Rfq
      }

      publish_rfq: {
        Args: { p_rfq_id: string }
        Returns: Rfq
      }

      close_rfq: {
        Args: { p_rfq_id: string }
        Returns: Rfq
      }

      cancel_rfq: {
        Args: { p_rfq_id: string; p_reason?: string | null }
        Returns: Rfq
      }

      create_draft_quotation: {
        Args: {
          p_rfq_id: string
          p_currency?: string
          p_unit_price?: number | null
          p_price_unit?: string
          p_total_price?: number | null
          p_incoterm?: string
          p_lead_time_min?: number | null
          p_lead_time_max?: number | null
          p_lead_time_unit?: string
          p_moq_quantity?: number | null
          p_moq_unit?: string
          p_validity_until?: string | null
          p_notes?: string
          p_linked_product_id?: string | null
        }
        Returns: QuotationOffer
      }

      update_draft_quotation: {
        Args: {
          p_offer_id: string
          p_currency?: string | null
          p_unit_price?: number | null
          p_price_unit?: string | null
          p_total_price?: number | null
          p_incoterm?: string | null
          p_lead_time_min?: number | null
          p_lead_time_max?: number | null
          p_lead_time_unit?: string | null
          p_moq_quantity?: number | null
          p_moq_unit?: string | null
          p_validity_until?: string | null
          p_clear_validity?: boolean
          p_notes?: string | null
          p_linked_product_id?: string | null
          p_clear_linked_product?: boolean
        }
        Returns: QuotationOffer
      }

      submit_quotation: {
        Args: {
          p_rfq_id?: string | null
          p_offer_id?: string | null
          p_currency?: string
          p_unit_price?: number | null
          p_price_unit?: string
          p_total_price?: number | null
          p_incoterm?: string
          p_lead_time_min?: number | null
          p_lead_time_max?: number | null
          p_lead_time_unit?: string
          p_moq_quantity?: number | null
          p_moq_unit?: string
          p_validity_until?: string | null
          p_notes?: string
          p_linked_product_id?: string | null
        }
        Returns: QuotationOffer
      }

      create_quotation_revision: {
        Args: {
          p_thread_id: string
          p_currency?: string
          p_unit_price?: number | null
          p_price_unit?: string
          p_total_price?: number | null
          p_incoterm?: string
          p_lead_time_min?: number | null
          p_lead_time_max?: number | null
          p_lead_time_unit?: string
          p_moq_quantity?: number | null
          p_moq_unit?: string
          p_validity_until?: string | null
          p_notes?: string
          p_linked_product_id?: string | null
        }
        Returns: QuotationOffer
      }

      withdraw_quotation: {
        Args: { p_thread_id: string }
        Returns: QuotationThread
      }

      get_quotation_thread: {
        Args: { p_thread_id: string }
        Returns: Record<string, unknown>
      }

      can_access_quotation_thread: {
        Args: { p_thread_id: string }
        Returns: boolean
      }

      award_supplier: {
        Args: {
          p_rfq_id: string
          p_thread_id: string
          p_notes?: string | null
        }
        Returns: QuotationAward
      }

      get_award: {
        Args: { p_rfq_id: string }
        Returns: Record<string, unknown> | null
      }

      revoke_award: {
        Args: { p_award_id: string; p_reason?: string | null }
        Returns: QuotationAward
      }

      create_purchase_order_draft: {
        Args: {
          p_award_id: string
          p_payment_terms?: string | null
          p_notes?: string | null
        }
        Returns: PurchaseOrder
      }

      update_purchase_order_draft: {
        Args: {
          p_purchase_order_id: string
          p_payment_terms?: string | null
          p_notes?: string | null
          p_quantity_value?: number | null
          p_quantity_unit?: string | null
          p_unit_price?: number | null
          p_total_price?: number | null
          p_incoterm?: string | null
          p_lead_time_min?: number | null
          p_lead_time_max?: number | null
          p_lead_time_unit?: string | null
          p_delivery_port?: string | null
          p_target_country?: string | null
        }
        Returns: PurchaseOrder
      }

      issue_purchase_order: {
        Args: { p_purchase_order_id: string }
        Returns: PurchaseOrder
      }

      accept_purchase_order: {
        Args: { p_purchase_order_id: string }
        Returns: PurchaseOrder
      }

      reject_purchase_order: {
        Args: { p_purchase_order_id: string; p_reason: string }
        Returns: PurchaseOrder
      }

      cancel_purchase_order: {
        Args: { p_purchase_order_id: string; p_reason?: string | null }
        Returns: PurchaseOrder
      }

      get_purchase_order: {
        Args: { p_purchase_order_id: string }
        Returns: Record<string, unknown> | null
      }

      list_purchase_orders: {
        Args: {
          p_status?: string | null
          p_limit?: number
          p_offset?: number
        }
        Returns: Record<string, unknown>
      }

      create_fulfillment: {
        Args: { p_purchase_order_id: string }
        Returns: FulfillmentOrder
      }

      start_production: {
        Args: {
          p_fulfillment_id: string
          p_production_location?: string | null
        }
        Returns: FulfillmentOrder
      }

      pause_production: {
        Args: { p_fulfillment_id: string; p_reason?: string | null }
        Returns: FulfillmentOrder
      }

      resume_production: {
        Args: { p_fulfillment_id: string }
        Returns: FulfillmentOrder
      }

      complete_production: {
        Args: { p_fulfillment_id: string }
        Returns: FulfillmentOrder
      }

      pass_qc: {
        Args: { p_fulfillment_id: string }
        Returns: FulfillmentOrder
      }

      fail_qc: {
        Args: {
          p_fulfillment_id: string
          p_reason: string
          p_terminal?: boolean
        }
        Returns: FulfillmentOrder
      }

      pack_order: {
        Args: { p_fulfillment_id: string }
        Returns: FulfillmentOrder
      }

      mark_ready: {
        Args: { p_fulfillment_id: string }
        Returns: FulfillmentOrder
      }

      mark_shipped: {
        Args: {
          p_fulfillment_id: string
          p_tracking_reference?: string | null
        }
        Returns: FulfillmentOrder
      }

      mark_in_transit: {
        Args: {
          p_fulfillment_id: string
          p_tracking_reference?: string | null
        }
        Returns: FulfillmentOrder
      }

      mark_delivered: {
        Args: { p_fulfillment_id: string }
        Returns: FulfillmentOrder
      }

      complete_fulfillment: {
        Args: { p_fulfillment_id: string }
        Returns: FulfillmentOrder
      }

      cancel_fulfillment: {
        Args: { p_fulfillment_id: string; p_reason?: string | null }
        Returns: FulfillmentOrder
      }

      fail_production: {
        Args: { p_fulfillment_id: string; p_reason: string }
        Returns: FulfillmentOrder
      }

      raise_fulfillment_dispute: {
        Args: { p_fulfillment_id: string; p_reason: string }
        Returns: FulfillmentOrder
      }

      get_fulfillment: {
        Args: { p_fulfillment_id: string }
        Returns: Record<string, unknown> | null
      }

      list_fulfillments: {
        Args: {
          p_status?: string | null
          p_limit?: number
          p_offset?: number
        }
        Returns: Record<string, unknown>
      }

      submit_product_for_review: {
        Args: { product_id: string }
        Returns: Product
      }

      approve_product: {
        Args: { product_id: string }
        Returns: Product
      }

      reject_product: {
        Args: { product_id: string; reason: string }
        Returns: Product
      }

      archive_product: {
        Args: { product_id: string }
        Returns: Product
      }

      restore_archived_product: {
        Args: { product_id: string }
        Returns: Product
      }

      reopen_published_product_for_editing: {
        Args: { product_id: string }
        Returns: Product
      }

      mark_notification_read: {
        Args: { notification_id: string }
        Returns: Notification
      }

      mark_all_notifications_read: {
        Args: Record<string, never>
        Returns: number
      }

      recover_incomplete_marketplace_account: {
        Args: {
          p_full_name: string
          p_company_name: string
          p_account_type: CompanyAccountType
        }
        Returns: Company
      }

      submit_company_for_verification: {
        Args: { company_id: string }
        Returns: Company
      }

      get_company_verification_feedback: {
        Args: { company_id: string }
        Returns: string | null
      }

      start_verification_case_review: {
        Args: { p_case_id: string }
        Returns: VerificationCaseRow
      }

      set_verification_case_priority: {
        Args: { p_case_id: string; p_priority: string }
        Returns: VerificationCaseRow
      }

      approve_company_verification: {
        Args: { p_company_id: string; p_risk_score?: number | null }
        Returns: Company
      }

      reject_company_verification: {
        Args: { p_company_id: string; p_reason?: string }
        Returns: Company
      }

      verification_case_sla_state: {
        Args: {
          p_sla_due_at: string
          p_submitted_at: string
          p_status: string
        }
        Returns: string | null
      }
    }

    Enums: Record<string, never>

    CompositeTypes: Record<string, never>
  }
}

/* -------------------------------------------------------------------------- */
/*                                ADMIN TYPES                                 */
/* -------------------------------------------------------------------------- */

export type AdminUserRow = {
  id: string

  email: string

  full_name: string | null

  role: UserRole

  company_name: string

  verification_status: string

  created_at: string
}
