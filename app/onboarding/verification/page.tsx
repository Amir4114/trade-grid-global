"use client";

import { useEffect, useState } from "react";

import Select from "react-select";

import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

import { documentTypes } from "@/lib/document-options";

// =========================
// DOCUMENT OPTIONS
// =========================

const documentOptions = documentTypes.map((doc) => ({
  value: doc,
  label: doc,
}));

// =========================
// TYPES
// =========================

type SelectOption = {
  value: string;
  label: string;
};

type UploadedDocument = {
  id: string;
  doc_type: string;
  status: string;
  file_url: string;
  document_name: string;
};

export default function VerificationPage() {

  const router = useRouter();

  const [selectedDocType, setSelectedDocType] =
    useState<SelectOption | null>(null);

  const [file, setFile] =
    useState<File | null>(null);

  const [uploading, setUploading] =
    useState(false);

  const [documents, setDocuments] =
    useState<UploadedDocument[]>([]);

  const [loading, setLoading] =
    useState(true);

  // =========================
  // FETCH DOCUMENTS
  // =========================

  const fetchDocuments = async () => {

    try {

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!company) return;

      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("company_id", company.id)
        .order("uploaded_at", {
          ascending: false,
        });

      if (error) {
        console.error(error);
        return;
      }

      setDocuments(data || []);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // =========================
  // GET STATUS COLOR
  // =========================

  const getStatusStyle = (status: string) => {

    switch (status) {

      case "approved":
        return "bg-green-600/20 text-green-400";

      case "rejected":
        return "bg-red-600/20 text-red-400";

      default:
        return "bg-yellow-600/20 text-yellow-400";
    }
  };

  // =========================
  // UPLOAD DOCUMENT
  // =========================

  const uploadDocument = async () => {

    if (uploading) return;

    // VALIDATION

    if (!selectedDocType) {
      alert("Please select document type");
      return;
    }

    if (!file) {
      alert("Please choose file");
      return;
    }

    // FILE TYPE VALIDATION

    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];

    if (!allowedTypes.includes(file.type)) {

      alert(
        "Only PDF, PNG, JPG files are allowed"
      );

      return;
    }

    // FILE SIZE VALIDATION

    const maxSize =
      5 * 1024 * 1024;

    if (file.size > maxSize) {

      alert(
        "File size must be below 5MB"
      );

      return;
    }

    try {

      setUploading(true);

      // GET USER

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("User not found");
        return;
      }

      // GET COMPANY

      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!company) {
        alert("Company not found");
        return;
      }

      // CHECK DUPLICATE DOC TYPE

      const existingDoc = documents.find(
        (doc) =>
          doc.doc_type ===
          selectedDocType.value
      );

      if (existingDoc) {

        alert(
          "Document type already uploaded"
        );

        return;
      }

      // FILE PATH

      const cleanFileName =
        file.name.replace(/\s+/g, "-");

      const filePath =
        `documents/${company.id}/${Date.now()}-${cleanFileName}`;

      // STORAGE UPLOAD

      const { error: uploadError } =
        await supabase.storage
          .from("company-docs")
          .upload(filePath, file);

      if (uploadError) {

        alert(uploadError.message);

        return;
      }

      // SAVE TO DATABASE

      const { error: dbError } =
        await supabase
          .from("documents")
          .insert([
            {
              company_id: company.id,

              doc_type:
                selectedDocType.value,

              document_name:
                file.name,

              file_url: filePath,

              status: "pending",
            },
          ]);

      if (dbError) {

        alert(dbError.message);

        return;
      }

      alert(
        "Document uploaded successfully"
      );

      setFile(null);

      setSelectedDocType(null);

      fetchDocuments();

    } catch (err) {

      console.error(err);

      alert("Upload failed");

    } finally {

      setUploading(false);

    }
  };

  // =========================
  // FINISH VERIFICATION
  // =========================

  const finishVerification = async () => {

    if (documents.length < 2) {

      alert(
        "Upload minimum 2 verification documents"
      );

      return;
    }

    try {

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!company) return;

      // UPDATE COMPANY STATUS

      const { error } = await supabase
        .from("companies")
        .update({
          verification_status:
            "under_review",
        })
        .eq("id", company.id);

      if (error) {

        alert(error.message);

        return;
      }

      alert(
        "Verification submitted successfully"
      );

      router.push("/dashboard");

    } catch (err) {

      console.error(err);

      alert("Something went wrong");

    }
  };

  // =========================
  // UI
  // =========================

  return (
    <main className="min-h-screen bg-black p-6 text-white">

      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">

        <h1 className="mb-8 text-center text-4xl font-bold">
          Company Verification
        </h1>

        {/* DOCUMENT TYPE */}

        <div className="mb-5">

          <p className="mb-2 text-sm text-neutral-400">
            Select Document Type
          </p>

          <Select
            options={documentOptions}
            value={selectedDocType}
            onChange={(option) =>
              setSelectedDocType(
                option as SelectOption
              )
            }
            placeholder="Choose Document"
          />

        </div>

        {/* FILE */}

        <div className="mb-5">

          <input
            type="file"
            onChange={(e) =>
              setFile(
                e.target.files?.[0] || null
              )
            }
            className="w-full rounded-xl border border-white/10 bg-black/40 p-4"
          />

        </div>

        {/* UPLOAD BUTTON */}

        <button
          onClick={uploadDocument}
          disabled={uploading}
          className="w-full rounded-xl bg-white py-4 font-semibold text-black transition hover:scale-105 disabled:opacity-50"
        >
          {uploading
            ? "Uploading..."
            : "Upload Document"}
        </button>

        {/* DOCUMENT LIST */}

        <div className="mt-10">

          <h2 className="mb-3 text-2xl font-bold">
            Uploaded Documents
          </h2>

          <p className="mb-5 text-neutral-400">
            Total Uploaded:
            {" "}
            {documents.length}
          </p>

          {loading ? (

            <div className="text-neutral-400">
              Loading documents...
            </div>

          ) : (

            <div className="space-y-4">

              {documents.length === 0 && (

                <div className="rounded-2xl border border-white/10 bg-black/40 p-5 text-neutral-400">
                  No documents uploaded yet.
                </div>

              )}

              {documents.map((doc) => (

                <div
                  key={doc.id}
                  className="rounded-2xl border border-white/10 bg-black/40 p-5"
                >

                  <p className="text-lg font-semibold">
                    {doc.doc_type}
                  </p>

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

        {/* FINISH */}

        <button
          onClick={finishVerification}
          className="mt-10 w-full rounded-xl bg-green-600 py-4 font-semibold transition hover:scale-105"
        >
          Submit For Verification
        </button>

      </div>

    </main>
  );
} 