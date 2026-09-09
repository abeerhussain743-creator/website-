import { NextResponse } from "next/server";
import {
  DEMO_PASSWORD,
  SESSION_COOKIE,
  findDemoUser,
  sessionTokenFor,
  toPublicUser,
} from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };

  const email = body.email?.trim() || "";
  const password = body.password || "";
  const user = findDemoUser(email, password);

  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password. Demo password is demo1234." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({
    user: toPublicUser(user),
    hint: `Signed in as ${user.role}. Demo password: ${DEMO_PASSWORD}`,
  });

  response.cookies.set(SESSION_COOKIE, sessionTokenFor(user.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  return response;
}
