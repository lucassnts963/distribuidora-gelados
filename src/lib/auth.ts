import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "gelados_session";
const secret = () => process.env.APP_PASSWORD || "troque-esta-senha";

export function makeToken() {
  const payload = String(Date.now());
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function validToken(token?: string | null) {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export async function isLogged() {
  const c = await cookies();
  return validToken(c.get(COOKIE)?.value);
}

export async function login(password: string) {
  if (password !== secret()) return false;
  const c = await cookies();
  c.set(COOKIE, makeToken(), {
    httpOnly: true, sameSite: "lax", path: "/",
    maxAge: 60 * 60 * 24 * 90,
    secure: process.env.NODE_ENV === "production",
  });
  return true;
}

export async function logout() {
  const c = await cookies();
  c.delete(COOKIE);
}

export const COOKIE_NAME = COOKIE;
