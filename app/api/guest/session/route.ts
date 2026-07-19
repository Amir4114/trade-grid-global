import { NextResponse } from "next/server"

import {
  createGuestSessionToken,
  GUEST_SESSION_COOKIE,
  GUEST_SESSION_MAX_AGE_SECONDS,
} from "@/lib/guest/session"

export const runtime = "nodejs"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    )
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Name and email are required." },
      { status: 400 }
    )
  }

  const input = body as Record<string, unknown>
  const name = typeof input.name === "string" ? input.name.trim() : ""
  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : ""

  if (name.length < 2 || name.length > 100) {
    return NextResponse.json(
      { error: "Enter a name between 2 and 100 characters." },
      { status: 400 }
    )
  }

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid business email address." },
      { status: 400 }
    )
  }

  try {
    const response = NextResponse.json({
      redirectTo: "/marketplace?guest=1",
    })

    response.cookies.set({
      name: GUEST_SESSION_COOKIE,
      value: createGuestSessionToken({ name, email }),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: GUEST_SESSION_MAX_AGE_SECONDS,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Guest session configuration error:", error)
    return NextResponse.json(
      { error: "Guest access is temporarily unavailable." },
      { status: 503 }
    )
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set({
    name: GUEST_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  })
  return response
}
