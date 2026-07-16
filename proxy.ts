import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Password gate: everything except the login flow requires the auth cookie.
// If APP_PASSWORD is not set (e.g. local dev), the app stays open.

const PUBLIC_PATHS = ['/login', '/api/login'];

async function expectedToken(): Promise<string | null> {
  const secret = process.env.APP_PASSWORD;
  if (!secret) return null;
  const data = new TextEncoder().encode(`jobtracker:${secret}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const expected = await expectedToken();
  if (!expected) return NextResponse.next();

  if (req.cookies.get('jt_auth')?.value === expected) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
