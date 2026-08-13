import type { MetadataRoute } from 'next';
import { currentHost, loadSite } from '@/lib/site';

/**
 * Per-tenant robots.txt. An unpublished or unknown host must be fully
 * disallowed — otherwise a half-built site gets indexed the moment DNS
 * resolves, which is very hard to undo.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = await currentHost();
  const bundle = await loadSite();

  if (!bundle || bundle.site.status !== 'published') {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  const indexable = bundle.seo?.robots_index === undefined
    ? true
    : Boolean(Number(bundle.seo.robots_index));

  return {
    rules: [{ userAgent: '*', ...(indexable ? { allow: '/' } : { disallow: '/' }) }],
    sitemap: `https://${host}/sitemap.xml`,
  };
}
