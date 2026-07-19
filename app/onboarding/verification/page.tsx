import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export default async function VerificationCompatibilityPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?next=/onboarding/verification")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.role === "buyer" || profile?.role === "supplier") {
    redirect(`/onboarding/${profile.role}?section=documents`)
  }

  redirect("/dashboard")
}
