import { NextResponse, type NextRequest } from 'next/server';

/**
 * Turns the request's Host into a route param.
 *
 * The pages used to read the host with `headers()`. That works, but it marks
 * every route dynamic, and a dynamic route is never stored in Next's route
 * cache — so each visitor triggered a full server render (measured on the live
 * site: ~1.1s TTFB, `X-Vercel-Cache: MISS` on every request).
 *
 * Rewriting to `/s/<host>/<lang>/<path>` moves both variables into the path,
 * leaving the pages free of `headers()` and `searchParams`. They can then be
 * rendered once and served from the edge until they revalidate.
 *
 * The rewrite is internal — the visitor's URL is untouched.
 */

const INTERNAL_PREFIX = '/s';

/** Same normalisation the backend applies, so both sides agree on the key. */
function normalizeHost(raw: string | null): string {
  return (raw || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .split(':')[0]
    .replace(/^www\./, '');
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Only the rewrite may reach the internal tree. Without this, anyone could
  // render any tenant from any domain by typing /s/<other-host>/... which is
  // both a duplicate-content problem and a surprising information leak.
  if (pathname === INTERNAL_PREFIX || pathname.startsWith(`${INTERNAL_PREFIX}/`)) {
    return new NextResponse('Not found', { status: 404 });
  }

  let host = normalizeHost(request.headers.get('x-forwarded-host') || request.headers.get('host'));

  // A real domain cannot point at localhost, so development falls back to a
  // configured tenant. Never set this in production.
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    host = normalizeHost(process.env.PUBLIC_SITE_DEV_HOST || null) || host;
  }
  if (!host) return NextResponse.next();

  // `_` means "this tenant's default language". The default varies per tenant
  // and middleware must not make a network call to find out, so the decision is
  // deferred to the page, which already has the bundle.
  const lang = (searchParams.get('lang') || '_').toLowerCase();

  const url = request.nextUrl.clone();
  url.pathname = `${INTERNAL_PREFIX}/${host}/${encodeURIComponent(lang)}${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Everything except Next internals, the metadata routes (which resolve the
  // host themselves) and anything with a file extension.
  matcher: ['/((?!_next/|api/|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.[\\w]+$).*)'],
};
