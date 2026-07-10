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
    };

    Views: Record<string, never>;

    Functions: Record<string, never>;

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