import type { Metadata } from 'next';
import { loadSite } from '@/lib/site';

/**
 * Per-tenant metadata for every page under this tree.
 *
 * It lives here rather than in the root layout because the root layout would
 * have to call `headers()` to know which tenant it is rendering — and that one
 * call marks every route dynamic, undoing the caching this tree exists for.
 * Here the host is a param, and the bundle fetch is shared with the page's own
 * render through the fetch cache, so this costs no extra request.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ host: string; lang: string }>;
}): Promise<Metadata> {
  const { host, lang } = await params;
  const bundle = await loadSite(decodeURIComponent(host), lang !== '_' ? lang : undefined);

  if (!bundle) return { title: 'Site not found', robots: { index: false, follow: false } };

  const seo = bundle.seo || {};
  const basic = bundle.basic_information || {};

  const name = String(seo.site_name || basic.company_name || 'Events');
  const title = String(seo.default_title || name);
  const description = String(seo.default_description || '');
  const image = String(seo.og_image_url || basic.logo_url || '');

  return {
    title: { default: title, template: `%s · ${name}` },
    description,
    applicationName: name,
    keywords: String(seo.default_keywords || '') || undefined,
    authors: seo.author ? [{ name: String(seo.author) }] : undefined,
    robots: {
      index: seo.robots_index === undefined ? true : Boolean(Number(seo.robots_index)),
      follow: seo.robots_follow === undefined ? true : Boolean(Number(seo.robots_follow)),
    },
    openGraph: {
      siteName: name,
      title: String(seo.og_title || title),
      description: String(seo.og_description || description),
      images: image ? [image] : undefined,
      type: 'website',
    },
    twitter: {
      card: (String(seo.twitter_card || 'summary_large_image') as 'summary_large_image'),
      title: String(seo.og_title || title),
      description: String(seo.og_description || description),
      images: image ? [image] : undefined,
    },
    icons: basic.logo_url ? { icon: String(basic.logo_url) } : undefined,
  };
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
