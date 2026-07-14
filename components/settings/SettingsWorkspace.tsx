"use client";

import AccountSettingsSection from "@/components/settings/AccountSettingsSection";
import BuyerCompanyProfileSection from "@/components/settings/BuyerCompanyProfileSection";
import NotificationPreferencesSection from "@/components/settings/NotificationPreferencesSection";
import SupplierCompanyProfileSection from "@/components/settings/SupplierCompanyProfileSection";
import VerificationSecuritySection from "@/components/settings/VerificationSecuritySection";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DashboardPanel from "@/components/dashboard/DashboardPanel";
import { useAuth, useCompany, useProfile } from "@/contexts/AuthProvider";

type SettingsWorkspaceProps = {
  role: "buyer" | "supplier";
  title: string;
  description: string;
};

export default function SettingsWorkspace({
  role,
  title,
  description,
}: SettingsWorkspaceProps) {
  const { user } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const { company, refreshCompany, loading } = useCompany();

  if (!user || loading || !company) {
    return (
      <DashboardShell role={role} title={title} description={description}>
        <DashboardPanel>
          <p className="text-sm text-neutral-500">Loading settings...</p>
        </DashboardPanel>
      </DashboardShell>
    );
  }

  const handleCompanySaved = async () => {
    await refreshCompany();
  };

  const handleAccountSaved = async () => {
    await Promise.all([refreshProfile(), refreshCompany()]);
  };

  return (
    <DashboardShell role={role} title={title} description={description}>
      <div className="space-y-6">
        <AccountSettingsSection
          user={user}
          profile={profile}
          onSaved={handleAccountSaved}
        />

        {role === "supplier" ? (
          <SupplierCompanyProfileSection
            key={company.updated_at}
            user={user}
            company={company}
            onSaved={handleCompanySaved}
          />
        ) : (
          <BuyerCompanyProfileSection
            key={company.updated_at}
            user={user}
            company={company}
            onSaved={handleCompanySaved}
          />
        )}

        <VerificationSecuritySection company={company} />
        <NotificationPreferencesSection />
      </div>
    </DashboardShell>
  );
}
