"use client";

import { useEffect, useState } from "react";
import Select from "react-select";
import { useRouter } from "next/navigation";

import {
  fetchCompanyDocuments,
  submitCompanyForVerification,
  uploadCompanyDocument,
} from "@/lib/auth/onboarding";
import {
  fetchClientAuthRedirectContext,
  resolvePostAuthRedirectPath,
} from "@/lib/auth/redirects";
import { documentTypes } from "@/lib/document-options";
import type { CompanyDocument } from "@/lib/database/types";
import { createClient } from "@/lib/supabase/client";

const documentOptions = documentTypes.map((doc) => ({
  value: doc,
  label: doc,
}));

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

type SelectOption = {
  value: string;
  label: string;
};

function getStatusStyle(status: string) {
  switch (status) {
    case "approved":
      return "bg-green-600/20 text-green-400";
    case "rejected":
      return "bg-red-600/20 text-red-400";
    default:
      return "bg-yellow-600/20 text-yellow-400";
  }
}

export default function VerificationPage() {
  const router = useRouter();
  const supabase = createClient();

  const [selectedDocType, setSelectedDocType] = useState<SelectOption | null>(
    null
  );
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshDocuments = async (nextCompanyId: string) => {
    const nextDocuments = await fetchCompanyDocuments(nextCompanyId);
    setDocuments(nextDocuments);
  };

  useEffect(() => {
    let cancelled = false;

    async function loadVerificationData() {
      const supabase = createClient();

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return;
        }

        const { data: company, error: companyError } = await supabase
          .from("companies")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (companyError) {
          throw new Error(companyError.message);
        }

        if (!company) {
          return;
        }

        if (!cancelled) {
          setCompanyId(company.id);
          await refreshDocuments(company.id);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load verification documents."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadVerificationData();

    return () => {
      cancelled = true;
    };
  }, []);

  const uploadDocument = async () => {
    if (uploading || !companyId) {
      return;
    }

    if (!selectedDocType) {
      setError("Please select a document type.");
      return;
    }

    if (!file) {
      setError("Please choose a file.");
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError("Only PDF, PNG, and JPG files are allowed.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File size must be below 5MB.");
      return;
    }

    const existingDoc = documents.find(
      (doc) => doc.doc_type === selectedDocType.value
    );

    if (existingDoc) {
      setError("This document type has already been uploaded.");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      await uploadCompanyDocument(
        companyId,
        file,
        selectedDocType.value
      );

      setFile(null);
      setSelectedDocType(null);
      await refreshDocuments(companyId);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const finishVerification = async () => {
    if (!companyId) {
      return;
    }

    if (documents.length < 2) {
      setError("Upload at least two verification documents.");
      return;
    }

    try {
      setError(null);
      await submitCompanyForVerification(companyId);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const authContext = await fetchClientAuthRedirectContext(user.id);
      router.push(resolvePostAuthRedirectPath(authContext));
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit verification request."
      );
    }
  };

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
        <h1 className="mb-8 text-center text-4xl font-bold">
          Company Verification
        </h1>

        {error ? (
          <p className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <div className="mb-5">
          <p className="mb-2 text-sm text-neutral-400">Select Document Type</p>
          <Select
            options={documentOptions}
            value={selectedDocType}
            onChange={(option) => setSelectedDocType(option as SelectOption)}
            placeholder="Choose Document"
          />
        </div>

        <div className="mb-5">
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-xl border border-white/10 bg-black/40 p-4"
          />
        </div>

        <button
          type="button"
          onClick={() => void uploadDocument()}
          disabled={uploading}
          className="w-full rounded-xl bg-white py-4 font-semibold text-black transition hover:scale-105 disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload Document"}
        </button>

        <div className="mt-10">
          <h2 className="mb-3 text-2xl font-bold">Uploaded Documents</h2>
          <p className="mb-5 text-neutral-400">
            Total Uploaded: {documents.length}
          </p>

          {loading ? (
            <div className="text-neutral-400">Loading documents...</div>
          ) : (
            <div className="space-y-4">
              {documents.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/40 p-5 text-neutral-400">
                  No documents uploaded yet.
                </div>
              ) : null}

              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-2xl border border-white/10 bg-black/40 p-5"
                >
                  <p className="text-lg font-semibold">{doc.doc_type}</p>
                  <p className="mt-1 text-sm text-neutral-400">
                    {doc.document_name}
                  </p>
                  <div
                    className={`mt-3 inline-block rounded-full px-3 py-1 text-sm ${getStatusStyle(doc.status)}`}
                  >
                    {doc.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => void finishVerification()}
          className="mt-10 w-full rounded-xl bg-green-600 py-4 font-semibold transition hover:scale-105"
        >
          Submit For Verification
        </button>
      </div>
    </main>
  );
}
