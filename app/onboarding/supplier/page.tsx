"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Select from "react-select";
import type { StylesConfig } from "react-select";
import type { User } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolvePostAuthRedirectPath } from "@/lib/auth/redirects";
import { formatVerificationStatus } from "@/lib/dashboard/roles";
import { useAuth, useCompany, useProfile } from "@/contexts/AuthProvider";
import {
  saveSupplierOnboarding,
  uploadCompanyDocument,
  validateCompanyDocumentFile,
  validateOnboardingBusinessProfile,
  validateYearEstablished,
} from "@/lib/auth/onboarding";
import type { Company, Profile } from "@/lib/database/types";
import { countries } from "@/lib/marketplace/countries";
import { certifications } from "@/lib/marketplace/certifications";
import { productCategories } from "@/lib/marketplace/productCategories";
import { toast } from "@/lib/toast";

type SelectOption = { value: string; label: string };

const steps = [
  "Business Information",
  "Product Categories",
  "Export Markets",
  "Certifications",
  "Verification Status",
] as const;

export default function SupplierOnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const { company, loading: companyLoading, refreshCompany } = useCompany();

  if (authLoading || companyLoading || !company || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 text-neutral-950">
        <p className="text-sm text-neutral-500">Loading onboarding profile...</p>
      </main>
    );
  }

  return (
    <SupplierOnboardingForm
      company={company}
      user={user}
      profile={profile}
      refreshCompany={refreshCompany}
    />
  );
}

type SupplierOnboardingFormProps = {
  company: Company;
  user: User;
  profile: Profile | null;
  refreshCompany: () => Promise<void>;
};

function SupplierOnboardingForm({
  company,
  user,
  profile,
  refreshCompany,
}: SupplierOnboardingFormProps) {
  const router = useRouter();
  const sectionRefs = useRef<Partial<Record<(typeof steps)[number], HTMLElement | null>>>({});

  const [activeSection, setActiveSection] = useState<(typeof steps)[number]>("Business Information");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [certificationFile, setCertificationFile] = useState<File | null>(null);

  const [yearEstablished, setYearEstablished] = useState(
    company.year_established ?? ""
  );
  const [employeeCount, setEmployeeCount] = useState(
    company.employee_count ?? ""
  );
  const [businessType, setBusinessType] = useState(company.business_type ?? "");
  const [companyStructure, setCompanyStructure] = useState(
    company.company_structure ?? ""
  );
  const [selectedCategories, setSelectedCategories] = useState<SelectOption[]>(
    (company.categories ?? []).map((value) => ({ value, label: value }))
  );
  const [exportMarkets, setExportMarkets] = useState<SelectOption[]>(
    (company.export_markets ?? []).map((value) => ({ value, label: value }))
  );
  const [selectedCertifications, setSelectedCertifications] = useState<
    SelectOption[]
  >(
    (company.certifications ?? []).map((value) => ({ value, label: value }))
  );

  const selectStyles = useMemo<StylesConfig<SelectOption, true>>(
    () => ({
      control: (base) => ({
        ...base,
        minHeight: "48px",
        borderRadius: "12px",
        borderColor: "#e5e7eb",
        boxShadow: "none",
      }),
    }),
    []
  );

  const scrollToSection = (step: (typeof steps)[number]) => {
    setActiveSection(step);
    sectionRefs.current[step]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) {
      setError("You must be signed in to complete onboarding.");
      return;
    }

    const validationError = validateOnboardingBusinessProfile({
      businessType,
      companyStructure,
      categoryCount: selectedCategories.length,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    const yearError = validateYearEstablished(yearEstablished);
    if (yearError) {
      setError(yearError);
      return;
    }

    if (certificationFile) {
      const fileError = validateCompanyDocumentFile(certificationFile);
      if (fileError) {
        setError(fileError);
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);

      if (certificationFile) {
        await uploadCompanyDocument(
          company.id,
          certificationFile,
          "Certification Document"
        );
      }

      await saveSupplierOnboarding(user.id, {
        business_type: businessType,
        company_structure: companyStructure,
        employee_count: employeeCount,
        year_established: yearEstablished,
        categories: selectedCategories.map((item) => item.value),
        export_markets: exportMarkets.map((item) => item.value),
        certifications: selectedCertifications.map((item) => item.value),
        onboarding_step: "completed",
        onboarding_completed: true,
      });

      toast.success("Onboarding saved", {
        description: "Your supplier profile has been updated.",
      });

      await refreshCompany();
      router.push(
        resolvePostAuthRedirectPath({
          role: profile?.role ?? null,
          onboardingCompleted: true,
        })
      );
      router.refresh();
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Failed to save onboarding data.";
      toast.error("Onboarding failed", { description: message });
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 text-neutral-950">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-bold">Supplier Onboarding</h1>

        <p className="mt-2 text-neutral-600">
          Complete your company profile to become discoverable by importers
          worldwide.
        </p>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="sticky top-8 h-fit rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            {steps.map((step, index) => (
              <button
                key={step}
                type="button"
                onClick={() => scrollToSection(step)}
                className={`mb-3 flex w-full items-center gap-3 rounded-xl p-4 text-left transition-all duration-200 ${
                  activeSection === step
                    ? "scale-[1.02] bg-black text-white shadow-lg"
                    : "bg-white text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    activeSection === step
                      ? "bg-white text-black"
                      : "bg-neutral-200 text-black"
                  }`}
                >
                  {index + 1}
                </div>
                <span className="font-medium">{step}</span>
              </button>
            ))}
          </aside>

          <form
            onSubmit={handleSubmit}
            className="space-y-8 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm"
          >
            <section
              ref={(element) => {
                sectionRefs.current["Business Information"] = element;
              }}
            >
              <h2 className="text-2xl font-semibold">Business Information</h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Input
                  placeholder="Year Established"
                  value={yearEstablished}
                  onChange={(e) => setYearEstablished(e.target.value)}
                />

                <Input
                  placeholder="Number of Employees"
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(e.target.value)}
                />

                <select
                  className="rounded-xl border border-neutral-200 p-3"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                >
                  <option value="">Select Business Type</option>
                  <option value="Manufacturer">Manufacturer</option>
                  <option value="Exporter">Exporter</option>
                  <option value="Trader">Trader</option>
                  <option value="Distributor">Distributor</option>
                  <option value="Wholesaler">Wholesaler</option>
                  <option value="Import Export Company">Import Export Company</option>
                  <option value="Private Label Manufacturer">
                    Private Label Manufacturer
                  </option>
                </select>

                <select
                  className="rounded-xl border border-neutral-200 p-3"
                  value={companyStructure}
                  onChange={(e) => setCompanyStructure(e.target.value)}
                >
                  <option value="">Select Company Structure</option>
                  <option value="LLC">LLC</option>
                  <option value="Corporation">Corporation</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                  <option value="Private Limited Company">Private Limited Company</option>
                  <option value="Public Limited Company">Public Limited Company</option>
                  <option value="Government Enterprise">Government Enterprise</option>
                </select>
              </div>
            </section>

            <section
              ref={(element) => {
                sectionRefs.current["Product Categories"] = element;
              }}
            >
              <h2 className="text-2xl font-semibold">Product Categories</h2>
              <p className="mt-2 text-sm text-neutral-500">
                Select all categories you export.
              </p>
              <div className="mt-4">
                <Select
                  isMulti
                  options={productCategories}
                  value={selectedCategories}
                  onChange={(value) => setSelectedCategories([...(value ?? [])])}
                  placeholder="Search and select product categories..."
                  styles={selectStyles}
                />
              </div>
            </section>

            <section
              ref={(element) => {
                sectionRefs.current["Export Markets"] = element;
              }}
            >
              <h2 className="text-2xl font-semibold">Export Markets</h2>
              <p className="mt-2 text-sm text-neutral-500">
                Choose countries you currently export to.
              </p>
              <div className="mt-4">
                <Select
                  isMulti
                  options={countries}
                  value={exportMarkets}
                  onChange={(value) => setExportMarkets([...(value ?? [])])}
                  placeholder="Search countries..."
                  styles={selectStyles}
                />
              </div>
            </section>

            <section
              ref={(element) => {
                sectionRefs.current["Certifications"] = element;
              }}
            >
              <h2 className="text-2xl font-semibold">Certifications</h2>
              <p className="mt-2 text-sm text-neutral-500">
                Optional: select certifications you hold and upload one supporting
                document. Full company verification documents can be submitted later
                from your dashboard.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Select
                  isMulti
                  options={certifications}
                  value={selectedCertifications}
                  onChange={(value) =>
                    setSelectedCertifications([...(value ?? [])])
                  }
                  placeholder="Search certifications..."
                  styles={selectStyles}
                />

                <Input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) =>
                    setCertificationFile(e.target.files?.[0] ?? null)
                  }
                />
              </div>
            </section>

            <section
              ref={(element) => {
                sectionRefs.current["Verification Status"] = element;
              }}
              className="rounded-2xl bg-neutral-100 p-6"
            >
              <h2 className="text-2xl font-semibold">Verification Status</h2>
              <p className="mt-3 text-neutral-600">
                Your profile will move to verification review after company
                documents are submitted.
              </p>
              <div className="mt-4 inline-flex rounded-full bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-800">
                {formatVerificationStatus(company.verification_status)}
              </div>
            </section>

            <Button type="submit" className="h-12 w-full text-base" disabled={saving}>
              {saving ? "Saving..." : "Finish Onboarding"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
