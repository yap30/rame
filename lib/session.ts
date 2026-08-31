// ============================================================
// RAME — session (JWT httpOnly cookie, jose)
// ============================================================
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import prisma from "@/lib/db";

export const SESSION_COOKIE = "rame_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 hari

/** Flag Secure mengikuti protokol request (localhost HTTP tetap bisa) */
export function isSecureRequest(req?: NextRequest): boolean {
  if (req) return new URL(req.url).protocol === "https:";
  return process.env.NODE_ENV === "production";
}

export interface SessionPayload {
  sub: string; // userId
  role: string;
  orgId?: string; // organisasi utama (untuk organizer)
}

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET ?? "insecure-dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, orgId: payload.orgId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
}

export async function readSession(): Promise<SessionPayload | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const session: SessionPayload = { sub: String(payload.sub), role: String(payload.role ?? "PARTICIPANT"), orgId: payload.orgId ? String(payload.orgId) : undefined };
    // user SUSPENDED tidak boleh mengakses fitur yang butuh autentikasi (blokir total)
    const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { status: true } });
    if (user?.status === "SUSPENDED" || user?.status === "DISABLED") return null;
    return session;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Helper respons API error standar (tanpa kebocoran internal) */
export function apiError(message: string, code: string, status: number) {
  return Response.json({ error: { code, message, request_id: crypto.randomUUID().slice(0, 8) } }, { status });
}
