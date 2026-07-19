import type { Company } from "@/lib/database/types"

export type AccountSettingsInput = {
  fullName: string
}

export type SupplierCompanySettingsInput = {
  companyName: string
  country: string
  businessType: string
  companyStructure: string
  yearEstablished: string
  employeeCount: string
  categories: string[]
  exportMarkets: string[]
  certifications: string[]
}

export type BuyerCompanySettingsInput = {
  companyName: string
  country: string
  businessType: string
  companyStructure: string
  employeeCount: string
  annualPurchaseVolume: string
  categories: string[]
  targetMarkets: string[]
  requiredCertifications: string[]
}

export type SettingsSaveResult = {
  company: Company
  reverificationRequired: boolean
}

export class SettingsPersistenceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SettingsPersistenceError"
  }
}
