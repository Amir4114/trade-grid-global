import { redirect } from "next/navigation";

export default function AuthLegacyPage() {
  redirect("/login");
}
