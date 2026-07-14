import SettingsSection from "@/components/settings/SettingsSection";

export default function NotificationPreferencesSection() {
  return (
    <SettingsSection
      title="Notification preferences"
      description="Control how Trade Grid Global notifies you about verification, products, and trade activity."
    >
      <div className="max-w-xl rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 py-5">
        <p className="text-sm font-medium text-neutral-900">
          Preference storage is not yet enabled
        </p>
        <p className="mt-1.5 text-sm text-neutral-600">
          In-app notifications from verification and product moderation are
          already active through the dashboard bell. Email and granular
          notification toggles will be added once preference columns are
          introduced in a future migration.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-600">
          <li>In-app verification updates</li>
          <li>In-app product moderation updates</li>
          <li>Email notifications (planned)</li>
          <li>RFQ and quotation alerts (planned)</li>
        </ul>
      </div>
    </SettingsSection>
  );
}
