"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Eye, FileCheck2, RefreshCw, Trash2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  createCompanyDocumentPreviewUrl,
  deletePendingCompanyDocument,
  fetchCompanyDocuments,
  replacePendingCompanyDocument,
  uploadCompanyDocument,
  validateCompanyDocumentFile,
} from "@/lib/auth/onboarding"
import type {
  CompanyDocument,
  CompanyVerificationStatus,
} from "@/lib/database/types"
import { documentTypes, type CompanyDocumentType } from "@/lib/document-options"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

type CompanyDocumentManagerProps = {
  companyId: string | null
  verificationStatus: CompanyVerificationStatus
  onDocumentsChange?: (documents: CompanyDocument[]) => void
}

const statusClasses: Record<CompanyDocument["status"], string> = {
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
}

function formatStatus(status: CompanyDocument["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function CompanyDocumentManager({
  companyId,
  verificationStatus,
  onDocumentsChange,
}: CompanyDocumentManagerProps) {
  const [documents, setDocuments] = useState<CompanyDocument[]>([])
  const [documentType, setDocumentType] =
    useState<CompanyDocumentType>("Trade License")
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(Boolean(companyId))
  const [busyDocumentId, setBusyDocumentId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CompanyDocument | null>(null)

  const publishDocuments = useCallback(
    (nextDocuments: CompanyDocument[]) => {
      setDocuments(nextDocuments)
      onDocumentsChange?.(nextDocuments)
    },
    [onDocumentsChange]
  )

  const refresh = useCallback(async () => {
    if (!companyId) {
      publishDocuments([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      publishDocuments(await fetchCompanyDocuments(companyId))
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load company documents."
      )
    } finally {
      setLoading(false)
    }
  }, [companyId, publishDocuments])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refresh()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [refresh])

  const mutationLocked =
    verificationStatus === "under_review" || verificationStatus === "verified"

  const currentTypeDocument = useMemo(
    () =>
      documents.find(
        (document) =>
          document.doc_type === documentType &&
          (document.status === "pending" || document.status === "approved")
      ),
    [documentType, documents]
  )

  const handleUpload = async () => {
    if (!companyId) {
      setError("Save the company profile before uploading documents.")
      return
    }

    if (!file) {
      setError("Choose a PDF, PNG, or JPG file.")
      return
    }

    const fileError = validateCompanyDocumentFile(file)
    if (fileError) {
      setError(fileError)
      return
    }

    if (currentTypeDocument) {
      setError(
        `A ${documentType} is already active. Use Replace on that document.`
      )
      return
    }

    try {
      setUploading(true)
      setError(null)
      await uploadCompanyDocument(companyId, file, documentType)
      setFile(null)
      const fileInput = document.getElementById(
        "company-document-upload"
      ) as HTMLInputElement | null
      if (fileInput) fileInput.value = ""
      await refresh()
      toast.success("Document uploaded", {
        description: `${documentType} is ready for verification submission.`,
      })
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to upload document."
      )
    } finally {
      setUploading(false)
    }
  }

  const handlePreview = async (document: CompanyDocument) => {
    try {
      setBusyDocumentId(document.id)
      setError(null)
      const signedUrl = await createCompanyDocumentPreviewUrl(document)
      window.open(signedUrl, "_blank", "noopener,noreferrer")
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to preview document."
      )
    } finally {
      setBusyDocumentId(null)
    }
  }

  const handleReplace = async (
    document: CompanyDocument,
    replacement: File | null
  ) => {
    if (!replacement) return

    const fileError = validateCompanyDocumentFile(replacement)
    if (fileError) {
      setError(fileError)
      return
    }

    try {
      setBusyDocumentId(document.id)
      setError(null)
      if (document.status === "pending") {
        await replacePendingCompanyDocument(document, replacement)
      } else if (document.status === "rejected") {
        await uploadCompanyDocument(
          document.company_id,
          replacement,
          document.doc_type
        )
      } else {
        throw new Error("Approved documents cannot be replaced.")
      }
      await refresh()
      toast.success("Document replaced", {
        description:
          document.status === "rejected"
            ? "The rejected evidence was retained and a new version was uploaded."
            : "The pending evidence was replaced.",
      })
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to replace document."
      )
    } finally {
      setBusyDocumentId(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return

    try {
      setBusyDocumentId(deleteTarget.id)
      setError(null)
      await deletePendingCompanyDocument(deleteTarget)
      setDeleteTarget(null)
      await refresh()
      toast.success("Pending document deleted")
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete document."
      )
    } finally {
      setBusyDocumentId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Company documents</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Add legal and compliance evidence using the approved document types.
          Trade License and Company Registration are required before submission.
        </p>
      </div>

      {mutationLocked ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Documents are locked while verification is{" "}
          {verificationStatus === "verified" ? "approved" : "under review"}.
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] md:items-end">
        <label className="grid gap-2 text-sm font-medium">
          Document type
          <select
            className="h-11 rounded-xl border border-neutral-300 bg-white px-3"
            value={documentType}
            disabled={mutationLocked || uploading || !companyId}
            onChange={(event) =>
              setDocumentType(event.target.value as CompanyDocumentType)
            }
          >
            {documentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Evidence file
          <Input
            id="company-document-upload"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            disabled={mutationLocked || uploading || !companyId}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <Button
          type="button"
          className="h-11"
          disabled={mutationLocked || uploading || !companyId || !file}
          onClick={() => void handleUpload()}
        >
          <Upload className="size-4" />
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </div>

      {!companyId ? (
        <p className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
          Complete and save Business Information to enable secure uploads.
        </p>
      ) : loading ? (
        <p className="text-sm text-neutral-500">Loading company documents...</p>
      ) : documents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center">
          <FileCheck2 className="mx-auto size-8 text-neutral-400" />
          <p className="mt-3 font-medium">No company documents uploaded</p>
          <p className="mt-1 text-sm text-neutral-500">
            Upload legal evidence before the Review step.
          </p>
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Uploaded company documents">
          {documents.map((document) => {
            const busy = busyDocumentId === document.id
            const canReplace =
              !mutationLocked &&
              (document.status === "pending" || document.status === "rejected")

            return (
              <li
                key={document.id}
                className="flex flex-col gap-4 rounded-2xl border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{document.doc_type}</p>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-semibold",
                        statusClasses[document.status]
                      )}
                    >
                      {formatStatus(document.status)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-neutral-500">
                    {document.document_name}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void handlePreview(document)}
                  >
                    <Eye className="size-4" />
                    Preview
                  </Button>
                  {canReplace ? (
                    <Button
                      asChild
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                    >
                      <label>
                        <RefreshCw className="size-4" />
                        Replace
                        <input
                          type="file"
                          className="sr-only"
                          accept=".pdf,.png,.jpg,.jpeg"
                          disabled={busy}
                          onChange={(event) => {
                            void handleReplace(
                              document,
                              event.target.files?.[0] ?? null
                            )
                            event.target.value = ""
                          }}
                        />
                      </label>
                    </Button>
                  ) : null}
                  {!mutationLocked && document.status === "pending" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-red-700 hover:text-red-800"
                      disabled={busy}
                      onClick={() => setDeleteTarget(document)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !busyDocumentId) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete pending document?</DialogTitle>
            <DialogDescription>
              This removes the file and its pending record. Submitted, rejected,
              and approved evidence can never be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(busyDocumentId)}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={Boolean(busyDocumentId)}
              onClick={() => void confirmDelete()}
            >
              {busyDocumentId ? "Deleting..." : "Delete document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
