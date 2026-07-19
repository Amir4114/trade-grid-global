export const documentTypes = [
  // Baseline company verification evidence
  "Trade License",
  "Company Registration",

  // Optional company and Food/FMCG compliance evidence
  "Tax Certificate",
  "Halal Certificate",
  "ISO Certificate",
  "HACCP Certificate",
  "Health Certificate",
  "Phytosanitary Certificate",
  "Certificate of Origin",
  "Product Catalog",
  "Lab Test Report",
  "Export License",
] as const

export type CompanyDocumentType = (typeof documentTypes)[number]

export function isCompanyDocumentType(
  value: string
): value is CompanyDocumentType {
  return documentTypes.some((documentType) => documentType === value)
}
