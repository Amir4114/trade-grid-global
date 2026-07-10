import type {
  AIRecommendation,
  Buyer,
  Category,
  CategoryName,
  Country,
  Inquiry,
  PlatformUser,
  Product,
  Quote,
  RFQ,
  Supplier,
  TradeOrder,
  VerificationLevel,
  VerificationState,
} from "./types";

export const countries: Country[] = [
  { code: "IN", name: "India", flag: "IN", region: "South Asia" },
  { code: "AE", name: "UAE", flag: "AE", region: "GCC" },
  { code: "SA", name: "Saudi Arabia", flag: "SA", region: "GCC" },
  { code: "PK", name: "Pakistan", flag: "PK", region: "South Asia" },
  { code: "TR", name: "Turkey", flag: "TR", region: "Europe / MENA" },
  { code: "VN", name: "Vietnam", flag: "VN", region: "ASEAN" },
  { code: "CN", name: "China", flag: "CN", region: "East Asia" },
  { code: "BR", name: "Brazil", flag: "BR", region: "Latin America" },
];

export const categories: Category[] = [
  { id: "rice", name: "Rice", description: "Basmati, parboiled, jasmine, and bulk private-label rice." },
  { id: "spices", name: "Spices", description: "Whole and ground spices with export-grade documentation." },
  { id: "frozen-foods", name: "Frozen Foods", description: "IQF vegetables, frozen meals, and cold-chain products." },
  { id: "beverages", name: "Beverages", description: "Juices, concentrates, functional drinks, and bottled products." },
  { id: "snacks", name: "Snacks", description: "Packaged snacks, confectionery, and ready retail SKUs." },
  { id: "dairy", name: "Dairy", description: "Milk powders, cheese, butter, and shelf-stable dairy ingredients." },
  { id: "poultry", name: "Poultry", description: "Frozen chicken, processed poultry, and halal-certified supply." },
  { id: "seafood", name: "Seafood", description: "Frozen shrimp, fish fillets, and seafood ingredients." },
  { id: "fruits", name: "Fruits", description: "Fresh, dried, pureed, and IQF fruit products." },
  { id: "vegetables", name: "Vegetables", description: "Fresh, dehydrated, canned, and frozen vegetable supply." },
];

const supplierNames = [
  "AgriNova Exports", "Gulf Harvest Foods", "Saffron Valley Trading", "Prime Grain Global", "BluePort Seafoods",
  "Evergreen FMCG", "Nile Cold Chain Foods", "Golden Basmati House", "Anatolia Food Works", "Mekong Fresh Supply",
  "DragonGate Ingredients", "Amazonia Agro Foods", "Karachi Spice Co", "Desert Palm Dairy", "Lotus Ready Meals",
  "Crescent Poultry Exports", "Oceancrest Foods", "Emerald Farm Goods", "MetroPack Snacks", "VitaBrew Beverages",
  "HarvestLine Foods", "TrueSource Agro", "Global Table Supply", "TerraFoods International", "SunPeak Produce",
];

const buyerNames = [
  "Atlas Retail Imports", "GCC Food Distribution", "Metro Horeca Supply", "Blueline Trading", "Cedar Mart Group",
  "Sahara Wholesale Foods", "Pacific Import House", "Urban Pantry Distribution", "Continental Food Buyers", "Prime Shelf Retail",
  "Noble Ingredients Buyer", "Harborline FMCG", "Eastern Basket Imports", "FoodBridge Trading", "Crown Supermarket Supply",
  "FreshRoute Importers", "Global Canteen Supply", "Meridian Food Partners", "Union Wholesale Market", "Zenith Grocery Group",
];

const productBases: Record<CategoryName, string[]> = {
  Rice: ["1121 Steam Basmati Rice", "Long Grain Parboiled Rice", "Jasmine Rice", "Organic Brown Rice"],
  Spices: ["Turmeric Powder", "Black Pepper", "Cardamom Pods", "Red Chilli Flakes"],
  "Frozen Foods": ["Frozen Mixed Vegetables", "IQF French Fries", "Frozen Paratha", "Ready Vegetable Samosa"],
  Beverages: ["Mango Juice Concentrate", "Coconut Water", "Energy Drink Cans", "Lemon Iced Tea"],
  Snacks: ["Masala Potato Chips", "Date Filled Cookies", "Roasted Chickpea Snacks", "Chocolate Wafer Bars"],
  Dairy: ["Skimmed Milk Powder", "Mozzarella Cheese Block", "Unsalted Butter", "UHT Milk Cartons"],
  Poultry: ["Frozen Whole Chicken", "Chicken Breast Fillets", "Halal Chicken Nuggets", "Frozen Chicken Wings"],
  Seafood: ["Vannamei Shrimp", "Frozen Tilapia Fillets", "Canned Tuna", "Seafood Mix"],
  Fruits: ["Alphonso Mango Pulp", "Dried Dates", "Frozen Strawberries", "Fresh Grapes"],
  Vegetables: ["Dehydrated Onion Flakes", "Frozen Green Peas", "Canned Sweet Corn", "Fresh Red Onion"],
};

const categoryImages: Record<CategoryName, string> = {
  Rice: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80",
  Spices: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=80",
  "Frozen Foods": "https://images.unsplash.com/photo-1610440042657-612c34d95e9f?auto=format&fit=crop&w=900&q=80",
  Beverages: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=80",
  Snacks: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=900&q=80",
  Dairy: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=900&q=80",
  Poultry: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=900&q=80",
  Seafood: "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=900&q=80",
  Fruits: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=900&q=80",
  Vegetables: "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&w=900&q=80",
};

const bannerImages = [
  "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1601593768790-8ef8f82f2c10?auto=format&fit=crop&w=1400&q=80",
];

const certificationPool = ["HACCP", "ISO 22000", "BRCGS", "Halal", "Kosher", "US FDA", "FSSAI", "GlobalG.A.P."];
const verificationLevels: VerificationLevel[] = ["basic", "verified", "premium"];
const verificationStates: VerificationState[] = ["pending", "under-review", "verified", "gold-verified", "rejected"];

export const suppliers: Supplier[] = Array.from({ length: 50 }, (_, index) => {
  const country = countries[index % countries.length].name;
  const primaryCategory = categories[index % categories.length].name;
  const secondaryCategory = categories[(index + 3) % categories.length].name;
  const thirdCategory = categories[(index + 6) % categories.length].name;
  const level = verificationLevels[index % verificationLevels.length];

  return {
    id: `supplier-${index + 1}`,
    companyName: `${supplierNames[index % supplierNames.length]} ${index > 24 ? "Group" : "Ltd"}`,
    logo: `${supplierNames[index % supplierNames.length].split(" ").map((part) => part[0]).join("").slice(0, 3)}${index + 1}`,
    bannerImage: bannerImages[index % bannerImages.length],
    country,
    city: ["Mumbai", "Dubai", "Riyadh", "Karachi", "Istanbul", "Ho Chi Minh City", "Shanghai", "Sao Paulo"][index % 8],
    categories: Array.from(new Set([primaryCategory, secondaryCategory, thirdCategory])),
    verificationLevel: level,
    verificationState: level === "premium" ? "gold-verified" : level === "verified" ? "verified" : verificationStates[index % verificationStates.length],
    yearsInBusiness: 4 + (index % 27),
    yearEstablished: 2022 - (index % 27),
    trustScore: Math.min(98, 68 + (index % 31) + (level === "premium" ? 6 : level === "verified" ? 3 : 0)),
    overview: "Export-ready food supplier serving distributors, importers, and retail buyers with documented quality controls, trade references, and reliable shipment coordination.",
    certifications: certificationPool.slice(index % 3, (index % 3) + 4),
    exportMarkets: [countries[(index + 1) % 8].name, countries[(index + 3) % 8].name, countries[(index + 5) % 8].name],
    responseRate: 72 + (index % 26),
    responseTime: ["Under 6 hours", "Same business day", "24 hours"][index % 3],
  };
});

export const buyers: Buyer[] = Array.from({ length: 30 }, (_, index) => ({
  id: `buyer-${index + 1}`,
  companyName: buyerNames[index % buyerNames.length],
  country: countries[(index + 2) % countries.length].name,
  city: ["Dubai", "Riyadh", "Mumbai", "Istanbul", "Shanghai", "Sao Paulo"][index % 6],
  importInterests: [categories[index % categories.length].name, categories[(index + 4) % categories.length].name],
  targetCountries: [countries[index % 8].name, countries[(index + 3) % 8].name],
  annualPurchaseVolume: [`USD ${(index + 2) * 250}K`, `USD ${(index + 1) * 1.2}M`][index % 2],
  verificationState: verificationStates[(index + 1) % verificationStates.length],
  overview: "Importer and distributor sourcing reliable food products for retail, wholesale, and foodservice channels.",
  recentRFQIds: [`rfq-${(index % 20) + 1}`, `rfq-${((index + 5) % 20) + 1}`],
}));

export const products: Product[] = Array.from({ length: 100 }, (_, index) => {
  const category = categories[index % categories.length].name;
  const supplier = suppliers[index % suppliers.length];
  const name = productBases[category][Math.floor(index / categories.length) % 4];

  return {
    id: `product-${index + 1}`,
    name,
    image: categoryImages[category],
    gallery: [categoryImages[category], bannerImages[index % bannerImages.length]],
    supplierId: supplier.id,
    category,
    country: supplier.country,
    moq: [`${10 + (index % 12) * 5} MT`, `${500 + (index % 8) * 250} cartons`, `${1 + (index % 5)} FCL`][index % 3],
    description: `${name} supplied for international B2B buyers with commercial packing, export documentation, and buyer-specific labeling support.`,
    packaging: ["25 kg PP bags", "10 kg master cartons", "Retail-ready cartons", "20 ft reefer container"][index % 4],
    leadTime: ["7-14 days", "14-21 days", "21-30 days"][index % 3],
    specifications: {
      Grade: ["A Grade", "Premium", "Foodservice", "Retail Export"][index % 4],
      ShelfLife: ["12 months", "18 months", "24 months"][index % 3],
      Incoterms: ["FOB", "CIF", "EXW"][index % 3],
    },
    certifications: supplier.certifications.slice(0, 3),
  };
});

export const rfqs: RFQ[] = Array.from({ length: 20 }, (_, index) => {
  const category = categories[index % categories.length].name;
  const productName = productBases[category][index % 4];
  const buyer = buyers[index % buyers.length];

  return {
    id: `rfq-${index + 1}`,
    productName: index === 2 ? "Need Frozen French Fries" : productName,
    quantity: [`${25 + index * 5} MT`, `${1000 + index * 200} cartons`, `${2 + (index % 6)} FCL`][index % 3],
    targetCountry: countries[(index + 1) % countries.length].name,
    packagingRequirement: ["Private label retail packs", "Bulk export packing", "Foodservice cartons"][index % 3],
    deliveryPort: ["Jebel Ali", "Jeddah Islamic Port", "Nhava Sheva", "Mersin", "Santos"][index % 5],
    requiredCertifications: certificationPool.slice(index % 4, (index % 4) + 2),
    deadline: `2026-07-${String(8 + (index % 18)).padStart(2, "0")}`,
    notes: "Buyer prefers suppliers with export history, valid certifications, and prompt commercial quotation.",
    buyerCompany: buyer.companyName,
    buyerId: buyer.id,
    createdAt: `2026-06-${String(18 - (index % 9)).padStart(2, "0")}`,
    status: ["Open", "Quoted", "Closing Soon"][index % 3] as RFQ["status"],
    category,
  };
});

export const users: PlatformUser[] = [
  ...buyers.slice(0, 12).map((buyer, index) => ({ id: `user-b-${index + 1}`, name: `Buyer Manager ${index + 1}`, email: `buyer${index + 1}@tradegrid.test`, role: "buyer" as const, companyName: buyer.companyName, country: buyer.country, status: index === 8 ? "suspended" as const : "active" as const, joinedAt: `2026-05-${String(index + 8).padStart(2, "0")}` })),
  ...suppliers.slice(0, 12).map((supplier, index) => ({ id: `user-s-${index + 1}`, name: `Supplier Lead ${index + 1}`, email: `supplier${index + 1}@tradegrid.test`, role: "supplier" as const, companyName: supplier.companyName, country: supplier.country, status: index === 5 ? "pending" as const : "active" as const, joinedAt: `2026-05-${String(index + 5).padStart(2, "0")}` })),
  { id: "user-admin-1", name: "Admin Operator", email: "admin@tradegrid.test", role: "admin", companyName: "Trade Grid Global", country: "UAE", status: "active", joinedAt: "2026-05-01" },
];

export const quotes: Quote[] = rfqs.flatMap((rfq, index) =>
  suppliers.slice(index % 8, (index % 8) + 2).map((supplier, quoteIndex) => ({
    id: `quote-${index + 1}-${quoteIndex + 1}`,
    rfqId: rfq.id,
    supplierId: supplier.id,
    price: quoteIndex === 0 ? "Indicative pricing shared" : "Final pricing after specs",
    leadTime: quoteIndex === 0 ? "14-18 days" : "21-28 days",
    notes: "Quote includes export documentation and standard commercial terms.",
    createdAt: `2026-06-${String(19 - (index % 7)).padStart(2, "0")}`,
  })),
);

export const inquiries: Inquiry[] = Array.from({ length: 16 }, (_, index) => ({
  id: `inquiry-${index + 1}`,
  fromCompany: buyers[index % buyers.length].companyName,
  toCompany: suppliers[index % suppliers.length].companyName,
  subject: `Inquiry for ${products[index % products.length].name}`,
  status: ["New", "In Progress", "Quoted", "Closed"][index % 4] as Inquiry["status"],
  createdAt: `2026-06-${String(20 - (index % 10)).padStart(2, "0")}`,
}));

export const orders: TradeOrder[] = Array.from({ length: 12 }, (_, index) => ({
  id: `order-${index + 1}`,
  buyerCompany: buyers[index % buyers.length].companyName,
  supplierCompany: suppliers[index % suppliers.length].companyName,
  productName: products[index % products.length].name,
  value: `USD ${(index + 3) * 18500}`,
  status: ["Draft", "Negotiating", "Confirmed", "In Transit"][index % 4] as TradeOrder["status"],
  updatedAt: `2026-06-${String(21 - (index % 12)).padStart(2, "0")}`,
}));

export function getSupplierById(id: string) {
  return suppliers.find((supplier) => supplier.id === id);
}

export function getBuyerById(id: string) {
  return buyers.find((buyer) => buyer.id === id);
}

export function getProductById(id: string) {
  return products.find((product) => product.id === id);
}

export function getRFQById(id: string) {
  return rfqs.find((rfq) => rfq.id === id);
}

export function getSupplierProducts(supplierId: string) {
  return products.filter((product) => product.supplierId === supplierId);
}

export function getSupplierForProduct(product: Product) {
  return suppliers.find((supplier) => supplier.id === product.supplierId);
}

export function getBuyerRFQs(buyerId: string) {
  return rfqs.filter((rfq) => rfq.buyerId === buyerId);
}

export function mockSourcingResponse(query: string): AIRecommendation[] {
  const normalized = query.toLowerCase();
  const preferredCategory = categories.find((category) => normalized.includes(category.name.toLowerCase().split(" ")[0]))?.name ?? "Poultry";
  const preferredCountry = countries.find((country) => normalized.includes(country.name.toLowerCase()))?.name ?? "UAE";
  const supplierMatches = suppliers
    .filter((supplier) => supplier.categories.includes(preferredCategory) || supplier.exportMarkets.includes(preferredCountry))
    .slice(0, 3);
  const productMatches = products.filter((product) => product.category === preferredCategory).slice(0, 2);

  return [
    ...supplierMatches.map((supplier) => ({
      id: `ai-${supplier.id}`,
      type: "supplier" as const,
      title: supplier.companyName,
      description: `${supplier.verificationState === "gold-verified" ? "Gold verified" : "Verified-ready"} supplier with ${supplier.yearsInBusiness} years in business and ${supplier.responseTime.toLowerCase()} response behavior.`,
      meta: `${supplier.country} | Trust score ${supplier.trustScore}`,
      href: `/suppliers/${supplier.id}`,
    })),
    ...productMatches.map((product) => ({
      id: `ai-${product.id}`,
      type: "product" as const,
      title: product.name,
      description: `${product.description} MOQ starts at ${product.moq}.`,
      meta: `${product.country} | ${product.packaging}`,
      href: `/products/${product.id}`,
    })),
    {
      id: "ai-rfq-suggestion",
      type: "rfq",
      title: `Create RFQ for ${preferredCategory}`,
      description: `Ask shortlisted suppliers for target pricing, certifications, packaging, and delivery to ${preferredCountry}.`,
      meta: "Suggested RFQ workflow",
      href: "/rfq",
    },
  ];
}
