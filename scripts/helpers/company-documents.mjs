const REQUIRED_DOCUMENT_TYPES = ["Trade License", "Company Registration"]

export async function seedRequiredCompanyDocuments(
  supabase,
  companyId,
  suffix = Date.now()
) {
  for (const [index, docType] of REQUIRED_DOCUMENT_TYPES.entries()) {
    const storagePath = `documents/${companyId}/${suffix}-${index}.pdf`
    const body = new TextEncoder().encode(
      `%PDF-1.4\n% Trade Grid verification fixture: ${docType}\n`
    )

    const { error: uploadError } = await supabase.storage
      .from("company-docs")
      .upload(storagePath, body, {
        contentType: "application/pdf",
        upsert: false,
      })

    if (uploadError) {
      throw new Error(
        `${docType} fixture upload failed: ${uploadError.message}`
      )
    }

    const { error: documentError } = await supabase.from("documents").insert({
      company_id: companyId,
      doc_type: docType,
      document_name: `${docType}.pdf`,
      file_url: storagePath,
      status: "pending",
    })

    if (documentError) {
      await supabase.storage.from("company-docs").remove([storagePath])
      throw new Error(
        `${docType} fixture metadata failed: ${documentError.message}`
      )
    }
  }
}
