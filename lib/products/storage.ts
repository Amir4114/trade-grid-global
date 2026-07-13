import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database/types";

type Client = SupabaseClient<Database>;

export const PRODUCT_IMAGE_BUCKET = "product-images";

/** Keep in sync with the bucket definition in migration 008. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
] as const;

/** Maximum number of gallery images per product (excludes the main image). */
export const MAX_GALLERY_IMAGES = 6;

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

/**
 * Validate an image File client-side before upload. Returns a human-readable
 * error message, or null when the file is acceptable. The database bucket
 * enforces the same MIME/size limits as a second line of defence.
 */
export function validateImageFile(file: File): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Unsupported image type. Use PNG, JPG, or WebP.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Image is too large. Maximum size is 5 MB.";
  }
  return null;
}

/**
 * Upload a validated product image into the owning company's storage folder and
 * return its public URL. Path: <company_id>/<random-uuid>.<ext>. Storage RLS
 * (migration 008) rejects uploads outside the caller's own company folder.
 */
export async function uploadProductImage(
  supabase: Client,
  params: { companyId: string; file: File }
): Promise<string> {
  const validationError = validateImageFile(params.file);
  if (validationError) {
    throw new Error(validationError);
  }

  const ext = EXT_BY_TYPE[params.file.type] ?? "jpg";
  const path = `${params.companyId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, params.file, {
      contentType: params.file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Best-effort deletion of a previously uploaded product image, given its public
 * URL. Only objects inside the caller's own company folder can be removed (RLS).
 * Failures are swallowed: a dereferenced-but-undeleted object is a harmless
 * orphan, never a broken live image.
 */
export async function deleteProductImageByUrl(
  supabase: Client,
  publicUrl: string
): Promise<void> {
  const marker = `/${PRODUCT_IMAGE_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return;

  const path = publicUrl.slice(index + marker.length).split("?")[0];
  if (!path) return;

  try {
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
  } catch {
    // Orphaned storage object is acceptable; see migration 008 residual risk.
  }
}
