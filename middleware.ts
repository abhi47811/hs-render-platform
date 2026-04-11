import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware-client'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - /share/... (public client preview links — no auth required)
     */
    '/((?!_next/static|_next/image|favicon.ico|share).*)',
  ],
}
