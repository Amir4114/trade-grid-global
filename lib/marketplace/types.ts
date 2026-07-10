import type { UserRole } from "@/lib/database/types";

export type { UserRole };
export type VerificationLevel = "basic" | "verified" | "premium";
export type VerificationState = "pending" | "under-review" | "verified" | "rejected" | "gold-verified";

export type CountryName =
  | "India"
  | "UAE"
  | "Saudi Arabia"
  | "Pakistan"
  | "Turkey"
  | "Vietnam"
  | "China"
  | "Brazil";

export type CategoryName =
  | "Rice"
  | "Spices"
  | "Frozen Foods"
  | "Beverages"
  | "Snacks"
  | "Dairy"
  | "Poultry"
  | "Seafood"
  | "Fruits"
  | "Vegetables";

export type Country = {
  code: string;
  name: CountryName;
  flag: string;
  region: string;
};

export type Category = {
  id: string;
  name: CategoryName;
  description: string;
};

export type PlatformUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyName: string;
  country: CountryName;
  status: "active" | "pending" | "suspended";
  joinedAt: string;
};

export type Supplier = {
  id: string;
  companyName: string;
  logo: string;
  bannerImage: string;
  country: CountryName;
  city: string;
  categories: CategoryName[];
  verificationLevel: VerificationLevel;
  verificationState: VerificationState;
  yearsInBusiness: number;
  yearEstablished: number;
  trustScore: number;
  overview: string;
  certifications: string[];
  exportMarkets: CountryName[];
  responseRate: number;
  responseTime: string;
};

export type Buyer = {
  id: string;
  companyName: string;
  country: CountryName;
  city: string;
  importInterests: CategoryName[];
  targetCountries: CountryName[];
  annualPurchaseVolume: string;
  verificationState: VerificationState;
  overview: string;
  recentRFQIds: string[];
};

export type Product = {
  id: string;
  name: string;
  image: string;
  gallery: string[];
  supplierId: string;
  category: CategoryName;
  country: CountryName;
  moq: string;
  description: string;
  packaging: string;
  leadTime: string;
  specifications: Record<string, string>;
  certifications: string[];
};

export type RFQStatus = "Open" | "Quoted" | "Closing Soon";

export type RFQ = {
  id: string;
  productName: string;
  quantity: string;
  targetCountry: CountryName;
  packagingRequirement: string;
  deliveryPort: string;
  requiredCertifications: string[];
  deadline: string;
  notes: string;
  buyerCompany: string;
  buyerId: string;
  createdAt: string;
  status: RFQStatus;
  category: CategoryName;
};

export type Quote = {
  id: string;
  rfqId: string;
  supplierId: string;
  price: string;
  leadTime: string;
  notes: string;
  createdAt: string;
};

export type Inquiry = {
  id: string;
  fromCompany: string;
  toCompany: string;
  subject: string;
  status: "New" | "In Progress" | "Quoted" | "Closed";
  createdAt: string;
};

export type TradeOrder = {
  id: string;
  buyerCompany: string;
  supplierCompany: string;
  productName: string;
  value: string;
  status: "Draft" | "Negotiating" | "Confirmed" | "In Transit";
  updatedAt: string;
};

export type AIRecommendation = {
  id: string;
  type: "supplier" | "product" | "rfq";
  title: string;
  description: string;
  meta: string;
  href: string;
};
