import type { ReactNode } from "react";

import DashboardPanel from "@/components/dashboard/DashboardPanel";

type SettingsSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export default function SettingsSection({
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <DashboardPanel title={title} description={description}>
      {children}
    </DashboardPanel>
  );
}
