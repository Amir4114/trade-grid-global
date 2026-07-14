import {
  canonicalizeInternalPath,
  resolveSafeNotificationActionUrl,
} from "../lib/notifications/safe-url";

type Case = {
  label: string;
  input: string;
  role?: "buyer" | "supplier" | "admin";
  expectCanonical: string | null;
  expectResolved?: string | null;
};

const cases: Case[] = [
  {
    label: "rejects protocol-relative URL",
    input: "//evil.com",
    expectCanonical: null,
  },
  {
    label: "rejects absolute external URL",
    input: "https://evil.com",
    expectCanonical: null,
  },
  {
    label: "rejects javascript URL",
    input: "javascript:alert(1)",
    expectCanonical: null,
  },
  {
    label: "rejects encoded traversal",
    input: "/dashboard/buyer/%2e%2e/admin",
    expectCanonical: null,
  },
  {
    label: "rejects backslash path trick",
    input: "\\dashboard\\admin\\verification",
    expectCanonical: null,
  },
  {
    label: "canonicalizes dot segments",
    input: "/dashboard/supplier/products/./list",
    role: "supplier",
    expectCanonical: "/dashboard/supplier/products/list",
    expectResolved: "/dashboard/supplier/products/list",
  },
  {
    label: "canonicalizes traversal then role gate rejects admin for supplier",
    input: "/dashboard/supplier/../admin/verification",
    role: "supplier",
    expectCanonical: "/dashboard/admin/verification",
    expectResolved: null,
  },
  {
    label: "rejects admin path for buyer role after canonicalization",
    input: "/dashboard/admin/verification",
    role: "buyer",
    expectCanonical: "/dashboard/admin/verification",
    expectResolved: null,
  },
  {
    label: "allows admin verification path for admin role",
    input: "/dashboard/admin/verification",
    role: "admin",
    expectCanonical: "/dashboard/admin/verification",
    expectResolved: "/dashboard/admin/verification",
  },
];

let passed = 0;
const failures: string[] = [];

for (const testCase of cases) {
  const canonical = canonicalizeInternalPath(testCase.input);
  const canonicalOk = canonical === testCase.expectCanonical;

  if (!canonicalOk) {
    failures.push(
      `${testCase.label}: expected canonical ${JSON.stringify(testCase.expectCanonical)}, got ${JSON.stringify(canonical)}`
    );
    continue;
  }

  if (testCase.role !== undefined) {
    const resolved = resolveSafeNotificationActionUrl(
      testCase.input,
      testCase.role
    );
    const expectedResolved =
      testCase.expectResolved === undefined
        ? testCase.expectCanonical
        : testCase.expectResolved;

    if (resolved !== expectedResolved) {
      failures.push(
        `${testCase.label}: expected resolved ${JSON.stringify(expectedResolved)}, got ${JSON.stringify(resolved)}`
      );
      continue;
    }
  }

  passed++;
  console.log(`PASS - ${testCase.label}`);
}

console.log(`\nSafe URL verification: ${passed}/${cases.length} passed`);

if (failures.length > 0) {
  console.log("\nFailures:");
  for (const failure of failures) {
    console.log(` - ${failure}`);
  }
  process.exit(1);
}
