import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

import { env } from "@/lib/env"

const publicPaths = ["/", "/login", "/api/auth"]
function isPublic(pathname: string) {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  if (isPublic(pathname)) return NextResponse.next()
  const token = await getToken({
    req,
    secret: env.NEXTAUTH_SECRET,
  })
  if (!token) {
    const login = new URL("/login", req.url)
    login.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(login)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
