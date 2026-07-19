"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react"
import Select from "react-select"
import type { StylesConfig } from "react-select"
import type { User } from "@supabase/supabase-js"

import { CompanyDocumentManager } from "@/components/onboarding/CompanyDocumentManager"
import {
  OnboardingSectionNav,
  type OnboardingSection,
  type OnboardingSectionId,
} from "@/components/onboarding/OnboardingSectionNav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  fetchCompanyVerificationFeedback,
  saveBuyerOnboarding,
  saveSupplierOnboarding,
  submitCompanyForVerification,
  validateOnboardingBusinessProfile,
  validateYearEstablished,
} from "@/lib/auth/onboarding"
import { formatVerificationStatus } from "@/lib/dashboard/roles"
import type {
  Company,
  CompanyDocument,
  Profile,
  UserRole,
} from "@/lib/database/types"
import { certifications } from "@/lib/marketplace/certifications"
import { countries } from "@/lib/marketplace/countries"
import { productCategories } from "@/lib/marketplace/productCategories"
import { toast } from "@/lib/toast"

type MarketplaceRole = Extract<UserRole, "buyer" | "supplier">
type SelectOption = { value: string; label: string }

type OnboardingWorkspaceProps = {
  role: MarketplaceRole
  user: User
  profile: Profile | null
  company: Company | null
  refreshCompany: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const sections: readonly OnboardingSection[] = [
  { id: "business", label: "Business Information" },
  { id: "categories", label: "Product Categories" },
  { id: "markets", label: "Markets" },
  { id: "certifications", label: "Certifications" },
  { id: "documents", label: "Documents" },
  { id: "review", label: "Review" },
  { id: "submission", label: "Verification Submission" },
]

const sectionIds = new Set(sections.map((section) => section.id))

const buyerBusinessTypes = [
  "Importer",
  "Distributor",
  "Retail Chain",
  "Food Service Company",
  "Hotel Group",
  "Supermarket",
  "Government Procurement",
] as const

const supplierBusinessTypes = [
  "Manufacturer",
  "Exporter",
  "Trader",
  "Distributor",
  "Wholesaler",
  "Import Export Company",
  "Private Label Manufacturer",
] as const

const companyStructures = [
  "LLC",
  "Corporation",
  "Partnership",
  "Sole Proprietorship",
  "Private Limited Company",
  "Public Limited Company",
  "Government Enterprise",
] as const

const requiredEvidence = ["Trade License", "Company Registration"] as const

const selectStyles: StylesConfig<SelectOption, true> = {
  control: (base) => ({
    ...base,
    minHeight: "44px",
    borderRadius: "12px",
    borderColor: "#d4d4d4",
    boxShadow: "none",
  }),
}

export function OnboardingWorkspace({
  role,
  user,
  profile,
  company,
  refreshCompany,
  refreshProfile,
}: OnboardingWorkspaceProps) {
  const router = useRouter()
  const [activeSection, setActiveSection] =
    useState<OnboardingSectionId>("business")
  const [visitedSections, setVisitedSections] = useState<
    Set<OnboardingSectionId>
  >(() => new Set(["business"]))
  const [workspaceCompany, setWorkspaceCompany] = useState(company)
  const [documents, setDocuments] = useState<CompanyDocument[]>([])
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [attemptedReview, setAttemptedReview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const [fullName, setFullName] = useState(profile?.full_name ?? "")
  const [companyName, setCompanyName] = useState(company?.company_name ?? "")
  const [country, setCountry] = useState(company?.country ?? "")
  const [employeeCount, setEmployeeCount] = useState(
    company?.employee_count ?? ""
  )
  const [businessType, setBusinessType] = useState(company?.business_type ?? "")
  const [companyStructure, setCompanyStructure] = useState(
    company?.company_structure ?? ""
  )
  const [annualPurchaseVolume, setAnnualPurchaseVolume] = useState(
    company?.annual_purchase_volume ?? ""
  )
  const [yearEstablished, setYearEstablished] = useState(
    company?.year_established ?? ""
  )
  const [selectedCategories, setSelectedCategories] = useState<SelectOption[]>(
    (company?.categories ?? []).map((value) => ({ value, label: value }))
  )
  const [markets, setMarkets] = useState<SelectOption[]>(
    (role === "buyer"
      ? (company?.target_markets ?? [])
      : (company?.export_markets ?? [])
    ).map((value) => ({ value, label: value }))
  )
  const [selectedCertifications, setSelectedCertifications] = useState<
    SelectOption[]
  >(
    (role === "buyer"
      ? (company?.required_certifications ?? [])
      : (company?.certifications ?? [])
    ).map((value) => ({ value, label: value }))
  )

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const requestedSection = new URLSearchParams(window.location.search).get(
        "section"
      )
      if (
        requestedSection &&
        sectionIds.has(requestedSection as OnboardingSectionId)
      ) {
        setActiveSection(requestedSection as OnboardingSectionId)
        setVisitedSections(
          (current) =>
            new Set([...current, requestedSection as OnboardingSectionId])
        )
      }
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (
      !workspaceCompany ||
      workspaceCompany.verification_status !== "rejected"
    ) {
      return
    }

    let cancelled = false
    void fetchCompanyVerificationFeedback(workspaceCompany.id)
      .then((value) => {
        if (!cancelled) setFeedback(value)
      })
      .catch(() => {
        if (!cancelled) setFeedback(null)
      })

    return () => {
      cancelled = true
    }
  }, [workspaceCompany])

  const businessValidationError = useMemo(() => {
    if (!fullName.trim()) return "Enter the primary contact name."
    if (!companyName.trim()) return "Enter the legal company name."
    if (!country.trim()) return "Select the country of registration."

    const profileError = validateOnboardingBusinessProfile({
      businessType,
      companyStructure,
      categoryCount: Math.max(selectedCategories.length, 1),
    })
    if (profileError) return profileError

    if (role === "supplier") {
      return validateYearEstablished(yearEstablished)
    }

    return null
  }, [
    businessType,
    companyName,
    companyStructure,
    country,
    fullName,
    role,
    selectedCategories.length,
    yearEstablished,
  ])

  const missingEvidence = requiredEvidence.filter(
    (type) =>
      !documents.some(
        (document) =>
          document.doc_type === type &&
          (document.status === "pending" || document.status === "approved")
      )
  )

  const completedSections = useMemo(() => {
    const completed = new Set<OnboardingSectionId>()
    if (!businessValidationError) completed.add("business")
    if (selectedCategories.length > 0) completed.add("categories")
    if (visitedSections.has("markets")) completed.add("markets")
    if (visitedSections.has("certifications")) completed.add("certifications")
    if (missingEvidence.length === 0) completed.add("documents")
    if (workspaceCompany?.onboarding_completed) completed.add("review")
    if (
      workspaceCompany?.verification_status === "under_review" ||
      workspaceCompany?.verification_status === "verified"
    ) {
      completed.add("submission")
    }
    return completed
  }, [
    businessValidationError,
    missingEvidence.length,
    selectedCategories.length,
    visitedSections,
    workspaceCompany?.onboarding_completed,
    workspaceCompany?.verification_status,
  ])

  const errorSections = useMemo(() => {
    const errors = new Set<OnboardingSectionId>()
    if (!attemptedReview) return errors
    if (businessValidationError) errors.add("business")
    if (selectedCategories.length === 0) errors.add("categories")
    if (missingEvidence.length > 0) errors.add("documents")
    return errors
  }, [
    attemptedReview,
    businessValidationError,
    missingEvidence.length,
    selectedCategories.length,
  ])

  const activeIndex = sections.findIndex(
    (section) => section.id === activeSection
  )

  const selectSection = (section: OnboardingSectionId) => {
    setActiveSection(section)
    setVisitedSections((current) => new Set([...current, section]))
    setError(null)
    window.history.replaceState(null, "", `?section=${section}`)
  }

  const saveProfile = async (complete: boolean) => {
    const validationError =
      businessValidationError ??
      (selectedCategories.length === 0
        ? "Select at least one product category."
        : null)
    if (validationError) {
      setAttemptedReview(true)
      setError(validationError)
      return null
    }

    try {
      setSaving(true)
      setError(null)

      let savedCompany: Company
      if (role === "buyer") {
        const result = await saveBuyerOnboarding(user.id, {
          email: user.email ?? profile?.email ?? "",
          full_name: fullName,
          company_name: companyName,
          country,
          business_type: businessType,
          company_structure: companyStructure,
          employee_count: employeeCount,
          annual_purchase_volume: annualPurchaseVolume,
          categories: selectedCategories.map((item) => item.value),
          target_markets: markets.map((item) => item.value),
          required_certifications: selectedCertifications.map(
            (item) => item.value
          ),
          onboarding_step: complete ? "completed" : "documents",
          onboarding_completed: complete,
        })
        savedCompany = result.company
      } else {
        savedCompany = await saveSupplierOnboarding(user.id, {
          email: user.email ?? profile?.email ?? "",
          full_name: fullName,
          company_name: companyName,
          country,
          business_type: businessType,
          company_structure: companyStructure,
          employee_count: employeeCount,
          year_established: yearEstablished,
          categories: selectedCategories.map((item) => item.value),
          export_markets: markets.map((item) => item.value),
          certifications: selectedCertifications.map((item) => item.value),
          onboarding_step: complete ? "completed" : "documents",
          onboarding_completed: complete,
        })
      }

      setWorkspaceCompany(savedCompany)
      await Promise.all([refreshProfile(), refreshCompany()])
      toast.success(complete ? "Onboarding profile saved" : "Progress saved")
      return savedCompany
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save onboarding."
      setError(message)
      toast.error("Onboarding save failed", { description: message })
      return null
    } finally {
      setSaving(false)
    }
  }

  const goNext = async () => {
    if (activeSection === "business" && businessValidationError) {
      setAttemptedReview(true)
      setError(businessValidationError)
      return
    }

    if (activeSection === "categories" && selectedCategories.length === 0) {
      setAttemptedReview(true)
      setError("Select at least one product category.")
      return
    }

    if (activeSection === "certifications") {
      const saved = await saveProfile(false)
      if (!saved) return
    }

    if (activeSection === "documents" && missingEvidence.length > 0) {
      setAttemptedReview(true)
      setError(
        `Upload the required evidence: ${missingEvidence.join(" and ")}.`
      )
      return
    }

    if (activeSection === "review") {
      setAttemptedReview(true)
      if (missingEvidence.length > 0) {
        setError(
          `Upload the required evidence: ${missingEvidence.join(" and ")}.`
        )
        return
      }
      const saved = await saveProfile(true)
      if (!saved) return
    }

    const next = sections[activeIndex + 1]
    if (next) selectSection(next.id)
  }

  const goPrevious = () => {
    const previous = sections[activeIndex - 1]
    if (previous) selectSection(previous.id)
  }

  const submitVerification = async () => {
    if (!workspaceCompany) {
      setError("Save the company profile before submitting verification.")
      return
    }

    if (!workspaceCompany.onboarding_completed || missingEvidence.length > 0) {
      setAttemptedReview(true)
      setError("Complete the onboarding review before submission.")
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      await submitCompanyForVerification(workspaceCompany.id)
      setWorkspaceCompany({
        ...workspaceCompany,
        verification_status: "under_review",
      })
      await refreshCompany()
      toast.success("Verification submitted", {
        description: "Your evidence is now locked for compliance review.",
      })
      router.replace(`/dashboard/${role}`)
      router.refresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to submit verification."
      setError(message)
      toast.error("Verification submission failed", { description: message })
    } finally {
      setSubmitting(false)
    }
  }

  const roleLabel = role === "buyer" ? "Buyer" : "Supplier"

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8 text-neutral-950 sm:px-6 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-amber-700 uppercase">
              {roleLabel} workspace setup
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Company onboarding
            </h1>
            <p className="mt-2 max-w-2xl text-neutral-600">
              Complete your trade profile, manage company evidence, and submit
              one trusted verification record.
            </p>
          </div>
          <span className="w-fit rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium">
            {formatVerificationStatus(
              workspaceCompany?.verification_status ?? "pending"
            )}
          </span>
        </div>

        {!workspaceCompany ? (
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Your organization record is incomplete. Saving Business Information
            will create the Buyer company profile before document upload.
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-8 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
          <OnboardingSectionNav
            sections={sections}
            activeSection={activeSection}
            completedSections={completedSections}
            errorSections={errorSections}
            onSelect={selectSection}
          />

          <section className="min-h-[540px] rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
            {activeSection === "business" ? (
              <BusinessSection
                role={role}
                fullName={fullName}
                setFullName={setFullName}
                companyName={companyName}
                setCompanyName={setCompanyName}
                country={country}
                setCountry={setCountry}
                businessType={businessType}
                setBusinessType={setBusinessType}
                companyStructure={companyStructure}
                setCompanyStructure={setCompanyStructure}
                employeeCount={employeeCount}
                setEmployeeCount={setEmployeeCount}
                annualPurchaseVolume={annualPurchaseVolume}
                setAnnualPurchaseVolume={setAnnualPurchaseVolume}
                yearEstablished={yearEstablished}
                setYearEstablished={setYearEstablished}
              />
            ) : null}

            {activeSection === "categories" ? (
              <SelectionSection
                title="Product categories"
                description={
                  role === "buyer"
                    ? "Select the food and FMCG categories your organization sources."
                    : "Select the food and FMCG categories your organization supplies."
                }
                options={productCategories}
                value={selectedCategories}
                placeholder="Search product categories..."
                onChange={setSelectedCategories}
              />
            ) : null}

            {activeSection === "markets" ? (
              <SelectionSection
                title={role === "buyer" ? "Sourcing markets" : "Export markets"}
                description={
                  role === "buyer"
                    ? "Choose countries you prefer to source from."
                    : "Choose countries you currently export to."
                }
                options={countries}
                value={markets}
                placeholder="Search countries..."
                onChange={setMarkets}
              />
            ) : null}

            {activeSection === "certifications" ? (
              <SelectionSection
                title="Certifications"
                description={
                  role === "buyer"
                    ? "Select certifications suppliers must hold. Evidence uploads belong in the Documents step."
                    : "Select certifications your company holds. Upload all supporting evidence in the Documents step."
                }
                options={certifications}
                value={selectedCertifications}
                placeholder="Search certifications..."
                onChange={setSelectedCertifications}
              />
            ) : null}

            {activeSection === "documents" ? (
              <CompanyDocumentManager
                companyId={workspaceCompany?.id ?? null}
                verificationStatus={
                  workspaceCompany?.verification_status ?? "pending"
                }
                onDocumentsChange={setDocuments}
              />
            ) : null}

            {activeSection === "review" ? (
              <ReviewSection
                role={role}
                companyName={companyName}
                country={country}
                businessType={businessType}
                companyStructure={companyStructure}
                categories={selectedCategories}
                markets={markets}
                certifications={selectedCertifications}
                documents={documents}
                missingEvidence={missingEvidence}
              />
            ) : null}

            {activeSection === "submission" ? (
              <SubmissionSection
                company={workspaceCompany}
                missingEvidence={missingEvidence}
                feedback={
                  workspaceCompany?.verification_status === "rejected"
                    ? feedback
                    : null
                }
                submitting={submitting}
                onSubmit={submitVerification}
                onReturnToDocuments={() => selectSection("documents")}
              />
            ) : null}

            {activeSection !== "submission" ? (
              <div className="mt-10 flex flex-col-reverse gap-3 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  disabled={activeIndex === 0 || saving}
                  onClick={goPrevious}
                >
                  <ArrowLeft className="size-4" />
                  Previous
                </Button>
                <Button
                  type="button"
                  disabled={saving}
                  onClick={() => void goNext()}
                >
                  {saving
                    ? "Saving..."
                    : activeSection === "review"
                      ? "Save profile and continue"
                      : "Save and continue"}
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  )
}

type BusinessSectionProps = {
  role: MarketplaceRole
  fullName: string
  setFullName: (value: string) => void
  companyName: string
  setCompanyName: (value: string) => void
  country: string
  setCountry: (value: string) => void
  businessType: string
  setBusinessType: (value: string) => void
  companyStructure: string
  setCompanyStructure: (value: string) => void
  employeeCount: string
  setEmployeeCount: (value: string) => void
  annualPurchaseVolume: string
  setAnnualPurchaseVolume: (value: string) => void
  yearEstablished: string
  setYearEstablished: (value: string) => void
}

function BusinessSection(props: BusinessSectionProps) {
  const businessTypes =
    props.role === "buyer" ? buyerBusinessTypes : supplierBusinessTypes

  return (
    <div>
      <h2 className="text-2xl font-semibold">Business information</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-600">
        Legal identity fields must match the documents submitted for
        verification.
      </p>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Field label="Primary contact name" required>
          <Input
            value={props.fullName}
            onChange={(event) => props.setFullName(event.target.value)}
          />
        </Field>
        <Field label="Legal company name" required>
          <Input
            value={props.companyName}
            onChange={(event) => props.setCompanyName(event.target.value)}
          />
        </Field>
        <Field label="Country of registration" required>
          <select
            className="h-11 rounded-xl border border-neutral-300 bg-white px-3"
            value={props.country}
            onChange={(event) => props.setCountry(event.target.value)}
          >
            <option value="">Select country</option>
            {countries.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Business type" required>
          <select
            className="h-11 rounded-xl border border-neutral-300 bg-white px-3"
            value={props.businessType}
            onChange={(event) => props.setBusinessType(event.target.value)}
          >
            <option value="">Select business type</option>
            {businessTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Company structure" required>
          <select
            className="h-11 rounded-xl border border-neutral-300 bg-white px-3"
            value={props.companyStructure}
            onChange={(event) => props.setCompanyStructure(event.target.value)}
          >
            <option value="">Select company structure</option>
            {companyStructures.map((structure) => (
              <option key={structure} value={structure}>
                {structure}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Number of employees">
          <Input
            value={props.employeeCount}
            onChange={(event) => props.setEmployeeCount(event.target.value)}
          />
        </Field>
        {props.role === "buyer" ? (
          <Field label="Annual purchase volume">
            <Input
              value={props.annualPurchaseVolume}
              onChange={(event) =>
                props.setAnnualPurchaseVolume(event.target.value)
              }
            />
          </Field>
        ) : (
          <Field label="Year established">
            <Input
              inputMode="numeric"
              maxLength={4}
              value={props.yearEstablished}
              onChange={(event) => props.setYearEstablished(event.target.value)}
            />
          </Field>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </span>
      {children}
    </label>
  )
}

function SelectionSection({
  title,
  description,
  options,
  value,
  placeholder,
  onChange,
}: {
  title: string
  description: string
  options: SelectOption[]
  value: SelectOption[]
  placeholder: string
  onChange: (value: SelectOption[]) => void
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
      <div className="mt-6">
        <Select
          isMulti
          options={options}
          value={value}
          onChange={(nextValue) => onChange([...(nextValue ?? [])])}
          placeholder={placeholder}
          styles={selectStyles}
        />
      </div>
    </div>
  )
}

function ReviewSection({
  role,
  companyName,
  country,
  businessType,
  companyStructure,
  categories,
  markets,
  certifications: selectedCertifications,
  documents,
  missingEvidence,
}: {
  role: MarketplaceRole
  companyName: string
  country: string
  businessType: string
  companyStructure: string
  categories: SelectOption[]
  markets: SelectOption[]
  certifications: SelectOption[]
  documents: CompanyDocument[]
  missingEvidence: readonly string[]
}) {
  const rows = [
    ["Legal company", companyName || "Not provided"],
    ["Country", country || "Not provided"],
    [
      "Business identity",
      [businessType, companyStructure].filter(Boolean).join(" · "),
    ],
    [
      "Product categories",
      categories.map((item) => item.label).join(", ") || "None selected",
    ],
    [
      role === "buyer" ? "Sourcing markets" : "Export markets",
      markets.map((item) => item.label).join(", ") || "None selected",
    ],
    [
      "Certifications",
      selectedCertifications.map((item) => item.label).join(", ") ||
        "None selected",
    ],
    [
      "Evidence",
      `${documents.length} document${documents.length === 1 ? "" : "s"}`,
    ],
  ]

  return (
    <div>
      <h2 className="text-2xl font-semibold">Review onboarding</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-600">
        Confirm your profile and evidence before enabling verification
        submission.
      </p>
      <dl className="mt-6 divide-y divide-neutral-200 rounded-2xl border border-neutral-200">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid gap-1 px-4 py-4 sm:grid-cols-[180px_1fr] sm:gap-4"
          >
            <dt className="text-sm font-medium text-neutral-500">{label}</dt>
            <dd className="text-sm text-neutral-950">
              {value || "Not provided"}
            </dd>
          </div>
        ))}
      </dl>
      {missingEvidence.length > 0 ? (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Required before submission: {missingEvidence.join(" and ")}.
        </p>
      ) : (
        <p className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="size-4" />
          Required legal evidence is ready.
        </p>
      )}
    </div>
  )
}

function SubmissionSection({
  company,
  missingEvidence,
  feedback,
  submitting,
  onSubmit,
  onReturnToDocuments,
}: {
  company: Company | null
  missingEvidence: readonly string[]
  feedback: string | null
  submitting: boolean
  onSubmit: () => Promise<void>
  onReturnToDocuments: () => void
}) {
  const status = company?.verification_status ?? "pending"
  const locked = status === "under_review" || status === "verified"

  return (
    <div className="mx-auto max-w-2xl py-4 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-neutral-950 text-amber-400">
        <ShieldCheck className="size-7" />
      </span>
      <h2 className="mt-5 text-2xl font-semibold">Verification submission</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-neutral-600">
        Submission freezes the current evidence into an immutable verification
        case for administrator review.
      </p>

      <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
        <p className="text-xs font-semibold tracking-[0.16em] text-neutral-500 uppercase">
          Current status
        </p>
        <p className="mt-2 text-lg font-semibold">
          {formatVerificationStatus(status)}
        </p>
      </div>

      {feedback ? (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-left text-sm text-red-800">
          Review feedback: {feedback}
        </p>
      ) : null}

      {missingEvidence.length > 0 ? (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Missing required evidence: {missingEvidence.join(" and ")}.
        </p>
      ) : null}

      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        {!locked ? (
          <Button type="button" variant="outline" onClick={onReturnToDocuments}>
            Manage documents
          </Button>
        ) : null}
        <Button
          type="button"
          disabled={
            submitting ||
            locked ||
            !company?.onboarding_completed ||
            missingEvidence.length > 0
          }
          onClick={() => void onSubmit()}
        >
          {submitting
            ? "Submitting..."
            : status === "rejected"
              ? "Resubmit for verification"
              : locked
                ? status === "verified"
                  ? "Company verified"
                  : "Under review"
                : "Submit for verification"}
        </Button>
      </div>
    </div>
  )
}
