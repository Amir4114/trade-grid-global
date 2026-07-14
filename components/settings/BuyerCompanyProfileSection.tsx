"use client";

import { useMemo, useState } from "react";
import Select from "react-select";
import type { StylesConfig } from "react-select";
import type { User } from "@supabase/supabase-js";

import SettingsSection from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/field-help";
import type { Company } from "@/lib/database/types";
import { countries } from "@/lib/marketplace/countries";
import { certifications } from "@/lib/marketplace/certifications";
import { productCategories } from "@/lib/marketplace/productCategories";
import {
  detectSensitiveCompanyChanges,
  requiresReverification,
  sensitiveFieldLabels,
} from "@/lib/settings/policy";
import { updateBuyerCompanySettings } from "@/lib/settings/service";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

type SelectOption = { value: string; label: string };

const selectStyles: StylesConfig<SelectOption, true> = {
  control: (base) => ({
    ...base,
    minHeight: "44px",
    borderRadius: "0.75rem",
    borderColor: "#e5e7eb",
    boxShadow: "none",
  }),
};

const BUSINESS_TYPES = [
  "Importer",
  "Distributor",
  "Retail Chain",
  "Food Service Company",
  "Hotel Group",
  "Supermarket",
  "Government Procurement",
];

const COMPANY_STRUCTURES = [
  "LLC",
  "Corporation",
  "Partnership",
  "Sole Proprietorship",
  "Private Limited Company",
  "Public Limited Company",
  "Government Enterprise",
];

type BuyerCompanyProfileSectionProps = {
  user: User;
  company: Company;
  onSaved: (company: Company) => Promise<void>;
};

export default function BuyerCompanyProfileSection({
  user,
  company,
  onSaved,
}: BuyerCompanyProfileSectionProps) {
  const supabase = useMemo(() => createClient(), []);

  const [companyName, setCompanyName] = useState(company.company_name);
  const [country, setCountry] = useState(company.country);
  const [businessType, setBusinessType] = useState(company.business_type);
  const [companyStructure, setCompanyStructure] = useState(
    company.company_structure
  );
  const [employeeCount, setEmployeeCount] = useState(
    company.employee_count ?? ""
  );
  const [annualPurchaseVolume, setAnnualPurchaseVolume] = useState(
    company.annual_purchase_volume ?? ""
  );
  const [categories, setCategories] = useState<SelectOption[]>(
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

  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const buildInput = () => ({
    companyName,
    country,
    businessType,
    companyStructure,
    employeeCount,
    annualPurchaseVolume,
    categories: categories.map((item) => item.value),
    targetMarkets: targetMarkets.map((item) => item.value),
    requiredCertifications: requiredCertifications.map((item) => item.value),
  });

  const persistChanges = async () => {
    try {
      setSaving(true);
      const result = await updateBuyerCompanySettings(
        supabase,
        user.id,
        company,
        buildInput()
      );

      await onSaved(result.company);

      if (result.reverificationRequired) {
        toast.warning("Re-verification required", {
          description:
            "Sensitive company identity fields changed. Verification status was reset to pending.",
        });
      } else {
        toast.success("Company profile saved", {
          description: "Your changes were confirmed in the database.",
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Unable to save company profile", {
        description:
          err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!companyName.trim()) {
      toast.error("Company name is required");
      return;
    }

    if (!country.trim()) {
      toast.error("Country is required");
      return;
    }

    if (requiresReverification(company, buildInput())) {
      setConfirmOpen(true);
      return;
    }

    void persistChanges();
  };

  const sensitiveChanges = detectSensitiveCompanyChanges(company, buildInput());
  const labels = sensitiveFieldLabels();

  return (
    <>
      <SettingsSection
        title="Organization profile"
        description="Importer organization details stored on your company record."
      >
        <form className="grid max-w-2xl gap-5" onSubmit={handleSubmit}>
          <div>
            <FieldLabel htmlFor="buyer-company-name">
              Organization / legal name
            </FieldLabel>
            <Input
              id="buyer-company-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>

          <div>
            <FieldLabel htmlFor="buyer-country">
              Country of registration
            </FieldLabel>
            <select
              id="buyer-country"
              className="flex h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
            >
              <option value="">Select country</option>
              {countries.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="buyer-business-type">Business type</FieldLabel>
              <select
                id="buyer-business-type"
                className="flex h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
              >
                <option value="">Select business type</option>
                {BUSINESS_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel htmlFor="buyer-company-structure">
                Company structure
              </FieldLabel>
              <select
                id="buyer-company-structure"
                className="flex h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm"
                value={companyStructure}
                onChange={(e) => setCompanyStructure(e.target.value)}
              >
                <option value="">Select structure</option>
                {COMPANY_STRUCTURES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="buyer-employee-count">
                Employee count
              </FieldLabel>
              <Input
                id="buyer-employee-count"
                value={employeeCount}
                onChange={(e) => setEmployeeCount(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel htmlFor="buyer-annual-volume">
                Annual purchase volume
              </FieldLabel>
              <Input
                id="buyer-annual-volume"
                value={annualPurchaseVolume}
                onChange={(e) => setAnnualPurchaseVolume(e.target.value)}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Import categories</FieldLabel>
            <Select
              isMulti
              options={productCategories}
              value={categories}
              onChange={(value) => setCategories([...(value ?? [])])}
              placeholder="Select categories"
              styles={selectStyles}
            />
          </div>

          <div>
            <FieldLabel>Sourcing countries</FieldLabel>
            <Select
              isMulti
              options={countries}
              value={targetMarkets}
              onChange={(value) => setTargetMarkets([...(value ?? [])])}
              placeholder="Select sourcing countries"
              styles={selectStyles}
            />
          </div>

          <div>
            <FieldLabel>Required certifications</FieldLabel>
            <Select
              isMulti
              options={certifications}
              value={requiredCertifications}
              onChange={(value) =>
                setRequiredCertifications([...(value ?? [])])
              }
              placeholder="Select required certifications"
              styles={selectStyles}
            />
          </div>

          <Button type="submit" className="w-fit" disabled={saving}>
            {saving ? "Saving..." : "Save organization profile"}
          </Button>
        </form>
      </SettingsSection>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm identity change</DialogTitle>
            <DialogDescription>
              Your organization identity is locked while{" "}
              {company.verification_status === "verified"
                ? "verified"
                : "under review"}
              . Changing{" "}
              {sensitiveChanges.map((field) => labels[field]).join(" or ")} will
              reset verification to pending
              {company.verification_status === "verified"
                ? " and require admin re-review"
                : " and cancel the current review"}
              .
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void persistChanges()}>
              {saving ? "Saving..." : "Confirm and save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
