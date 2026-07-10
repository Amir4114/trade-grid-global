"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Select from "react-select";
import type { StylesConfig } from "react-select";
import type { User } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, useCompany, useProfile } from "@/contexts/AuthProvider";
import { saveBuyerOnboarding } from "@/lib/auth/onboarding";
import { resolvePostAuthRedirectPath } from "@/lib/auth/redirects";
import { formatVerificationStatus } from "@/lib/dashboard/roles";
import type { Company, Profile } from "@/lib/database/types";
import { countries } from "@/lib/marketplace/countries";
import { certifications } from "@/lib/marketplace/certifications";
import { productCategories } from "@/lib/marketplace/productCategories";

type SelectOption = { value: string; label: string };

const steps = [
  "Business Information",
  "Import Categories",
  "Target Markets",
  "Required Certifications",
  "Verification Status",
];

export default function BuyerOnboardingPage() {
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
    <BuyerOnboardingForm
      company={company}
      user={user}
      profile={profile}
      refreshCompany={refreshCompany}
    />
  );
}

type BuyerOnboardingFormProps = {
  company: Company;
  user: User;
  profile: Profile | null;
  refreshCompany: () => Promise<void>;
};

function BuyerOnboardingForm({
  company,
  user,
  profile,
  refreshCompany,
}: BuyerOnboardingFormProps) {
  const router = useRouter();

  const [activeSection, setActiveSection] = useState("Business Information");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [annualPurchaseVolume, setAnnualPurchaseVolume] = useState(
    company.annual_purchase_volume ?? ""
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
  const [targetMarkets, setTargetMarkets] = useState<SelectOption[]>(
    (company.target_markets ?? []).map((value) => ({ value, label: value }))
  );
  const [requiredCertifications, setRequiredCertifications] = useState<
    SelectOption[]
  >(
    (company.required_certifications ?? []).map((value) => ({
      value,
      label: value,
    }))
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) {
      setError("You must be signed in to complete onboarding.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await saveBuyerOnboarding(user.id, {
        business_type: businessType,
        company_structure: companyStructure,
        employee_count: employeeCount,
        annual_purchase_volume: annualPurchaseVolume,
        categories: selectedCategories.map((item) => item.value),
        target_markets: targetMarkets.map((item) => item.value),
        required_certifications: requiredCertifications.map((item) => item.value),
        onboarding_step: "completed",
        onboarding_completed: true,
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
      setError(
        err instanceof Error ? err.message : "Failed to save onboarding data."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 text-neutral-950">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-bold">Buyer Onboarding</h1>

        <p className="mt-2 text-neutral-600">
          Configure your sourcing profile and purchasing requirements.
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
                onClick={() => setActiveSection(step)}
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
              onMouseEnter={() => setActiveSection("Business Information")}
            >
              <h2 className="text-2xl font-semibold">Business Information</h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Input
                  placeholder="Annual Purchase Volume"
                  value={annualPurchaseVolume}
                  onChange={(e) => setAnnualPurchaseVolume(e.target.value)}
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
                  <option value="Importer">Importer</option>
                  <option value="Distributor">Distributor</option>
                  <option value="Retail Chain">Retail Chain</option>
                  <option value="Food Service Company">Food Service Company</option>
                  <option value="Hotel Group">Hotel Group</option>
                  <option value="Supermarket">Supermarket</option>
                  <option value="Government Procurement">Government Procurement</option>
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

            <section onMouseEnter={() => setActiveSection("Import Categories")}>
              <h2 className="text-2xl font-semibold">Import Categories</h2>
              <p className="mt-2 text-sm text-neutral-500">
                Select products you regularly import.
              </p>
              <div className="mt-4">
                <Select
                  isMulti
                  options={productCategories}
                  value={selectedCategories}
                  onChange={(value) => setSelectedCategories([...(value ?? [])])}
                  placeholder="Search product categories..."
                  styles={selectStyles}
                />
              </div>
            </section>

            <section onMouseEnter={() => setActiveSection("Target Markets")}>
              <h2 className="text-2xl font-semibold">Target Markets</h2>
              <p className="mt-2 text-sm text-neutral-500">
                Select preferred sourcing countries.
              </p>
              <div className="mt-4">
                <Select
                  isMulti
                  options={countries}
                  value={targetMarkets}
                  onChange={(value) => setTargetMarkets([...(value ?? [])])}
                  placeholder="Search countries..."
                  styles={selectStyles}
                />
              </div>
            </section>

            <section
              onMouseEnter={() => setActiveSection("Required Certifications")}
            >
              <h2 className="text-2xl font-semibold">Required Certifications</h2>
              <p className="mt-2 text-sm text-neutral-500">
                Choose certifications your suppliers must possess.
              </p>
              <div className="mt-4">
                <Select
                  isMulti
                  options={certifications}
                  value={requiredCertifications}
                  onChange={(value) =>
                    setRequiredCertifications([...(value ?? [])])
                  }
                  placeholder="Search certifications..."
                  styles={selectStyles}
                />
              </div>
            </section>

            <section
              onMouseEnter={() => setActiveSection("Verification Status")}
              className="rounded-2xl bg-neutral-100 p-6"
            >
              <h2 className="text-2xl font-semibold">Verification Status</h2>
              <p className="mt-3 text-neutral-600">
                Company verification begins after trade license and registration
                documents are uploaded.
              </p>
              <div className="mt-4 inline-flex rounded-full bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-800">
                {formatVerificationStatus(company.verification_status)}
              </div>
            </section>

            <Button
              type="submit"
              className="h-12 w-full text-base"
              disabled={saving}
            >
              {saving ? "Saving..." : "Finish Onboarding"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
