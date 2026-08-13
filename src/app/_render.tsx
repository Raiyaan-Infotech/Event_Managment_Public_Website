import { notFound } from 'next/navigation';
import { loadSite } from '@/lib/site';
import { SiteRoot } from '@/components/site/site-root';

/**
 * Every public route is the same render with a different page key, so the
 * fetch-resolve-render sequence lives here once.
 *
 * `host` and `lang` arrive as route params (middleware puts them there) rather
 * than from `headers()`/`searchParams`. Reading either of those marks the route
 * dynamic, and a dynamic route is never stored in the route cache — which is
 * what made every visitor pay a full server render.
 *
 * The page is still fully server-rendered; it is just rendered once per
 * (tenant, language, path) and reused until it revalidates.
 */
export async function renderPage({
  page,
  host,
  lang,
}: {
  page: string;
  host: string;
  lang?: string;
}) {
  // `_` is middleware's placeholder for "this tenant's default language" — the
  // default is per-tenant and middleware can't look it up without a network call.
  const requested = lang && lang !== '_' ? lang : undefined;

  const bundle = await loadSite(decodeURIComponent(host), requested);

  // No tenant for this host, or the admin hasn't published yet. A 404 is the
  // honest answer — never fall back to some other company's content.
  if (!bundle) notFound();
  if (bundle.site.status !== 'published') notFound();

  const defaultLanguage = bundle.languages.find((l) => l.is_default)?.code || 'en';
  const active = bundle.translations?.language?.code || defaultLanguage;

  return <SiteRoot bundle={bundle} initialPage={page} language={String(active)} />;
}

export type SiteRouteProps = {
  params: Promise<{ host: string; lang: string }>;
};

