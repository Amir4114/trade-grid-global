"use client";

import { useEffect, useState } from "react";

import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DataTable from "@/components/dashboard/DataTable";
import { fetchAdminUsers } from "@/lib/auth/onboarding";
import { formatVerificationStatus } from "@/lib/dashboard/roles";

type UserRow = {
  company: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

export default function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const users = await fetchAdminUsers();

        setRows(
          users.map((user) => ({
            company: user.company_name,
            email: user.email,
            role: user.role,
            status: formatVerificationStatus(user.verification_status),
            created_at: new Date(user.created_at).toLocaleDateString(),
          }))
        );
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Failed to load platform users."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadUsers();
  }, []);

  return (
    <DashboardShell
      role="admin"
      title="Users"
      description="Platform user directory with verification and role data."
    >
      <DashboardPanel>
        {loading ? (
          <p className="text-sm text-neutral-500">Loading users...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <DataTable
            columns={[
              { key: "company", label: "Company" },
              { key: "email", label: "Email" },
              { key: "role", label: "Role" },
              { key: "status", label: "Verification Status" },
              { key: "created_at", label: "Created Date" },
            ]}
            rows={rows}
          />
        )}
      </DashboardPanel>
    </DashboardShell>
  );
}
