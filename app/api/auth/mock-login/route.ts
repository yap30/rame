import { NextRequest, NextResponse } from "next/server";
import { demoLogin } from "@/lib/auth";
import { SESSION_COOKIE, isSecureRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Login demo (mode mock, atau dev bila EID_ALLOW_DEMO_LOGIN=true) */
export async function POST(req: NextRequest) {
  if (process.env.EID_MODE && process.env.EID_MODE !== "mock" && process.env.EID_ALLOW_DEMO_LOGIN !== "true") {
    return Response.json({ error: { code: "MOCK_DISABLED", message: "Mode mock nonaktif." } }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as { kind?: string };
  const kind = body.kind === "organizer" ? "organizer" : "participant";

  const { user, token } = await demoLogin(kind);
  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(req),
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
