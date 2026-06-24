"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Company = {
  id: string;
  company_name: string;
  country: string;
  business_type: string;
  verification_status: string;
  risk_score: number;
};

export default function AdminPage() {

  const [companies, setCompanies] =
    useState<Company[]>([]);

  // =========================
  // FETCH COMPANIES
  // =========================

  const fetchCompanies = async () => {

    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (!error) {
      setCompanies(data || []);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // =========================
  // APPROVE
  // =========================

  const approveCompany = async (
    id: string
  ) => {

    await supabase
      .from("companies")
      .update({
        verification_status: "verified",
        risk_score: 0,
      })
      .eq("id", id);

    fetchCompanies();
  };

  // =========================
  // REJECT
  // =========================

  const rejectCompany = async (
    id: string
  ) => {

    await supabase
      .from("companies")
      .update({
        verification_status: "rejected",
      })
      .eq("id", id);

    fetchCompanies();
  };

  // =========================
  // REVIEW
  // =========================

  const markReview = async (
    id: string
  ) => {

    await supabase
      .from("companies")
      .update({
        verification_status:
          "under_review",
      })
      .eq("id", id);

    fetchCompanies();
  };

  return (
    <main className="min-h-screen bg-black p-10 text-white">

      <div className="mb-10 flex items-center justify-between">

        <div>
          <h1 className="text-4xl font-bold">
            Admin Verification Panel
          </h1>

          <p className="mt-2 text-neutral-400">
            Manage supplier verification
          </p>
        </div>

      </div>

      <div className="space-y-6">

        {companies.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">

            No companies found.

          </div>
        )}

        {companies.map((company) => (

          <div
            key={company.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-6"
          >

            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

              <div className="space-y-2">

                <h2 className="text-2xl font-semibold">
                  {company.company_name}
                </h2>

                <p className="text-neutral-300">
                  Country: {company.country}
                </p>

                <p className="text-neutral-300">
                  Business Type:{" "}
                  {company.business_type}
                </p>

                <p className="text-neutral-300">
                  Status:{" "}
                  {company.verification_status}
                </p>

                <p className="text-neutral-300">
                  Risk Score:{" "}
                  {company.risk_score}
                </p>

              </div>

              <div className="flex flex-wrap gap-3">

                <button
                  onClick={() =>
                    approveCompany(company.id)
                  }
                  className="rounded-xl bg-green-600 px-5 py-3 font-medium transition hover:scale-105"
                >
                  Approve
                </button>

                <button
                  onClick={() =>
                    markReview(company.id)
                  }
                  className="rounded-xl bg-yellow-500 px-5 py-3 font-medium text-black transition hover:scale-105"
                >
                  Review
                </button>

                <button
                  onClick={() =>
                    rejectCompany(company.id)
                  }
                  className="rounded-xl bg-red-600 px-5 py-3 font-medium transition hover:scale-105"
                >
                  Reject
                </button>

              </div>

            </div>

          </div>
        ))}

      </div>

    </main>
  );
}