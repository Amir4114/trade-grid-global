import { redirect } from "next/navigation";

import {
  fetchAuthRedirectContext,
  resolvePostAuthRedirectPath,
} from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardRouterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const authContext = await fetchAuthRedirectContext(supabase, user.id);

  redirect(resolvePostAuthRedirectPath(authContext));
}
