import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Define role-based access for pages
    const roleBasedRoutes: Record<string, string[]> = {
      '/dashboard/partners': ['masteradmin'],
    }

    // Check if the current path has role restrictions
    for (const [route, allowedRoles] of Object.entries(roleBasedRoutes)) {
      if (path.startsWith(route)) {
        if (!token?.role || !allowedRoles.includes(token.role as string)) {
          return NextResponse.redirect(new URL('/dashboard', req.url))
        }
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*'],
}
