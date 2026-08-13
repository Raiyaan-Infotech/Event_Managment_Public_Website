import { notFound } from 'next/navigation';
import { loadSite } from '@/lib/site';
import { SiteRoot } from '@/components/site/site-root';

/**
 * Every public route is the same render with a different page key, so the
 * fetch-resolve-render sequence lives here once.
 *
 * `?lang=` selects the translation overlay ON THE SERVER, so a Tamil page is
 * Tamil in the HTML rather than after hydration. That is the difference
 * between a translated site and a translated-looking one.
 */
export async function renderPage({
  page,
  searchParams,
}: {
  page: string;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) || {};
  const langParam = params.lang;
  const lang = Array.isArray(langParam) ? langParam[0] : langParam;

  const bundle = await loadSite(lang);

  // No tenant for this host, or the admin hasn't published yet. A 404 is the
  // honest answer — never fall back to some other company's content.
  if (!bundle) notFound();
  if (bundle.site.status !== 'published') notFound();

  const defaultLanguage = bundle.languages.find((l) => l.is_default)?.code || 'en';
  const active = bundle.translations?.language?.code || defaultLanguage;

  return <SiteRoot bundle={bundle} initialPage={page} language={String(active)} />;
}

export type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};
