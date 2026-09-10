import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("gelados_session")?.value;
  const isLogin = req.nextUrl.pathname.startsWith("/login");
  // Validacao forte acontece nas paginas (server). Aqui so evita navegacao solta.
  if (!token && !isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (token && isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|favicon.ico|manifest.webmanifest|icon).*)"] };
