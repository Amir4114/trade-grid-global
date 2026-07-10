"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";

import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, useCompany, useProfile } from "@/contexts/AuthProvider";
import type { Company, Profile } from "@/lib/database/types";
import { createClient } from "@/lib/supabase/client";

type BuyerSettingsFormProps = {
  user: User;
  profile: Profile | null;
  company: Company;
  refreshCompany: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

function BuyerSettingsForm({
  user,
  profile,
  company,
  refreshCompany,
  refreshProfile,
}: BuyerSettingsFormProps) {
  const supabase = createClient();
  const [companyName, setCompanyName] = useState(company.company_name);
  const [contactEmail, setContactEmail] = useState(
    profile?.email ?? user.email ?? ""
  );
  const [primaryMarket, setPrimaryMarket] = useState(
    company.target_markets?.[0] ?? company.country
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const { error: companyError } = await supabase
        .from("companies")
        .update({
          company_name: companyName,
          country: primaryMarket,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (companyError) {
        throw new Error(companyError.message);
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ email: contactEmail })
        .eq("id", user.id);

      if (profileError) {
        throw new Error(profileError.message);
      }

      await Promise.all([refreshCompany(), refreshProfile()]);
      setMessage("Company profile updated.");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell
      role="buyer"
      title="Settings"
      description="Manage company profile, notification preferences, and trade defaults."
    >
      <DashboardPanel title="Company Profile">
        {error ? (
          <p className="mb-4 text-sm text-red-600">{error}</p>
        ) : null}
        {message ? (
          <p className="mb-4 text-sm text-green-700">{message}</p>
        ) : null}
        <form
          className="grid max-w-xl gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          <Input
            placeholder="Company name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <Input
            placeholder="Contact email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
          <Input
            placeholder="Primary import market"
            value={primaryMarket}
            onChange={(e) => setPrimaryMarket(e.target.value)}
          />
          <Button type="submit" className="w-fit" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </DashboardPanel>
    </DashboardShell>
  );
}

export default function BuyerSettingsPage() {
  const { user } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const { company, refreshCompany, loading } = useCompany();

  if (!user || loading || !company) {
    return (
      <DashboardShell
        role="buyer"
        title="Settings"
        description="Manage company profile, notification preferences, and trade defaults."
      >
        <DashboardPanel>
          <p className="text-sm text-neutral-500">Loading company profile...</p>
        </DashboardPanel>
      </DashboardShell>
    );
  }

  return (
    <BuyerSettingsForm
      key={company.id}
      user={user}
      profile={profile}
      company={company}
      refreshCompany={refreshCompany}
      refreshProfile={refreshProfile}
    />
  );
}
