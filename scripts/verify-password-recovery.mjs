// Password-recovery verification (safe, no real inbox required).
//
// This script separates three verification layers honestly:
//   1. CODE-LEVEL   - the required files/wiring exist in the repo.
//   2. API-LEVEL    - Supabase accepts resetPasswordForEmail with the
//                     callback redirect URL (no error thrown).
//   3. MANUAL       - clicking the emailed link, code exchange, and
//                     updateUser({ password }) MUST be tested by a human.
//
// It does NOT and CANNOT prove the end-to-end email-link flow works,
// because that requires opening a real recovery email in a browser.

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
}

let failures = 0;
function check(label, ok) {
  console.log(`${ok ? "PASS" : "FAIL"} - ${label}`);
  if (!ok) failures += 1;
}

console.log("== CODE-LEVEL VERIFICATION ==");

const callbackPath = "app/auth/callback/route.ts";
const resetPath = "app/reset-password/page.tsx";
const forgotPath = "app/forgot-password/page.tsx";
const passwordInputPath = "components/auth/PasswordInput.tsx";

check("auth callback route exists", existsSync(callbackPath));
check("reset-password page exists", existsSync(resetPath));
check("PasswordInput component exists", existsSync(passwordInputPath));

if (existsSync(callbackPath)) {
  const src = readFileSync(callbackPath, "utf8");
  check("callback uses exchangeCodeForSession", src.includes("exchangeCodeForSession"));
  check("callback guards against open redirect", src.includes("startsWith(\"//\")"));
}

if (existsSync(resetPath)) {
  const src = readFileSync(resetPath, "utf8");
  check("reset page uses updateUser({ password })", src.includes("updateUser("));
  check("reset page gates on an existing session", src.includes("getSession"));
  check("reset page signs out after update", src.includes("signOut"));
  check("reset page validates password match", src.includes("do not match"));
}

if (existsSync(forgotPath)) {
  const src = readFileSync(forgotPath, "utf8");
  check("forgot-password targets /auth/callback", src.includes("/auth/callback"));
  check("forgot-password uses window.location.origin", src.includes("window.location.origin"));
  check(
    "forgot-password uses privacy-preserving message",
    src.includes("If an account exists")
  );
}

console.log("\n== API-LEVEL VERIFICATION ==");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Non-existent test address: Supabase returns success without leaking existence
// and (for a non-existent user) will not actually deliver an email.
const testEmail = `recovery-probe-${Date.now()}@tradegrid.test`;
const redirectTo = "http://localhost:3000/auth/callback?next=%2Freset-password";

try {
  const { error } = await supabase.auth.resetPasswordForEmail(testEmail, {
    redirectTo,
  });
  check("resetPasswordForEmail accepted the request (no error)", !error);
  if (error) {
    console.log(`   detail: ${error.message}`);
    console.log(
      "   NOTE: an error here usually means the redirect URL is not in the\n" +
        "   Supabase Auth 'Redirect URLs' allow-list. Add /auth/callback there."
    );
  }
} catch (err) {
  check("resetPasswordForEmail accepted the request (no error)", false);
  console.log(`   detail: ${err instanceof Error ? err.message : err}`);
}

console.log("\n== MANUAL VERIFICATION REQUIRED (cannot be automated) ==");
console.log("  - Open the recovery email in a real inbox and click the link.");
console.log("  - Confirm the browser lands on /reset-password with a session.");
console.log("  - Set a new password and confirm redirect to /login.");
console.log("  - Log in with the new password.");

if (failures > 0) {
  console.error(`\n${failures} code/API check(s) failed.`);
  process.exit(1);
}

console.log("\nAll automated code/API checks passed.");
console.log(
  "This does NOT certify the end-to-end email-link flow. Test that manually."
);
