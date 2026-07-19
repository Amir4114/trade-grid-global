import "server-only"

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto"

export const GUEST_SESSION_COOKIE = "tradegrid_guest"
export const GUEST_SESSION_MAX_AGE_SECONDS = 2 * 60 * 60

export type GuestSession = {
  version: 1
  name: string
  email: string
  expiresAt: number
  sessionId: string
}

function getGuestSessionSecret(): string {
  const secret = process.env.GUEST_SESSION_SECRET

  if (!secret || secret.length < 32) {
    throw new Error(
      "GUEST_SESSION_SECRET must be configured with at least 32 characters."
    )
  }

  return secret
}

function getEncryptionKey(): Buffer {
  return createHash("sha256").update(getGuestSessionSecret()).digest()
}

export function createGuestSessionToken(input: {
  name: string
  email: string
}): string {
  const payload: GuestSession = {
    version: 1,
    name: input.name,
    email: input.email,
    expiresAt: Date.now() + GUEST_SESSION_MAX_AGE_SECONDS * 1000,
    sessionId: randomUUID(),
  }
  const initializationVector = randomBytes(12)
  const cipher = createCipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    initializationVector
  )
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ])

  return [
    initializationVector.toString("base64url"),
    ciphertext.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".")
}

export function verifyGuestSessionToken(
  token: string | undefined
): GuestSession | null {
  if (!token) return null

  const [encodedIv, encodedCiphertext, encodedAuthTag, extra] = token.split(".")
  if (!encodedIv || !encodedCiphertext || !encodedAuthTag || extra) return null

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(),
      Buffer.from(encodedIv, "base64url")
    )
    decipher.setAuthTag(Buffer.from(encodedAuthTag, "base64url"))
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encodedCiphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8")
    const payload = JSON.parse(plaintext) as Partial<GuestSession>

    if (
      payload.version !== 1 ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.expiresAt !== "number" ||
      typeof payload.sessionId !== "string" ||
      payload.expiresAt <= Date.now()
    ) {
      return null
    }

    return payload as GuestSession
  } catch {
    return null
  }
}
