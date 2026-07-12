import { redirect } from "next/navigation";

import { resolveOnboardingEntryPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profileResult, companyResult] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase
      .from("companies")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  redirect(
    resolveOnboardingEntryPath({
      role: profileResult.data?.role ?? null,
      onboardingCompleted: companyResult.data?.onboarding_completed ?? false,
    })
  );
}
