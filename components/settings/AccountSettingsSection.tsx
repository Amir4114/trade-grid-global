"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

import SettingsSection from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/field-help";
import type { Profile } from "@/lib/database/types";
import { roleLabel } from "@/lib/dashboard/roles";
import {
  requestLoginEmailChange,
  updateAccountSettings,
} from "@/lib/settings/service";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

type AccountSettingsSectionProps = {
  user: User;
  profile: Profile | null;
  onSaved: () => Promise<void>;
};

export default function AccountSettingsSection({
  user,
  profile,
  onSaved,
}: AccountSettingsSectionProps) {
  const supabase = useMemo(() => createClient(), []);

  const loginEmail = user.email ?? profile?.email ?? "";
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [nextEmail, setNextEmail] = useState(loginEmail);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  const emailChanged = nextEmail.trim() !== loginEmail.trim();

  const handleSaveAccount = async () => {
    try {
      setSavingAccount(true);
      await updateAccountSettings(supabase, user.id, { fullName });
      await onSaved();
      toast.success("Account updated", {
        description: "Your contact name has been saved.",
      });
    } catch (err) {
      console.error(err);
      toast.error("Unable to save account settings", {
        description:
          err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSavingAccount(false);
    }
  };

  const handleRequestEmailChange = async () => {
    try {
      setSavingEmail(true);
      await requestLoginEmailChange(supabase, nextEmail);
      toast.success("Email change requested", {
        description:
          "Check your inbox to confirm the new login email. Until confirmed, your current email remains active.",
      });
    } catch (err) {
      console.error(err);
      toast.error("Unable to request email change", {
        description:
          err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSavingEmail(false);
    }
  };

  return (
    <SettingsSection
      title="Account"
      description="Login identity and contact name. Your login email is managed through Supabase Auth."
    >
      <div className="grid max-w-xl gap-5">
        <div>
          <FieldLabel htmlFor="settings-full-name">Contact name</FieldLabel>
          <Input
            id="settings-full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
          />
        </div>

        <div>
          <FieldLabel htmlFor="settings-login-email">Login email</FieldLabel>
          <Input
            id="settings-login-email"
            type="email"
            value={nextEmail}
            onChange={(e) => setNextEmail(e.target.value)}
            placeholder="Business email"
          />
          <p className="mt-1.5 text-xs text-neutral-500">
            Current active login: {loginEmail || "—"}
          </p>
        </div>

        <div className="grid gap-2 text-sm text-neutral-600">
          <p>
            Role:{" "}
            <span className="font-medium text-neutral-900">
              {profile?.role ? roleLabel(profile.role) : "—"}
            </span>
          </p>
          {profile?.created_at ? (
            <p>
              Member since:{" "}
              <span className="font-medium text-neutral-900">
                {new Date(profile.created_at).toLocaleDateString()}
              </span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={savingAccount}
            onClick={() => void handleSaveAccount()}
          >
            {savingAccount ? "Saving..." : "Save contact name"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!emailChanged || savingEmail}
            onClick={() => void handleRequestEmailChange()}
          >
            {savingEmail ? "Sending..." : "Request email change"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/reset-password">Change password</Link>
          </Button>
        </div>
      </div>
    </SettingsSection>
  );
}
