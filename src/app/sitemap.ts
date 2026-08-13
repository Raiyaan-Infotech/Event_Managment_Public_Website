import type { MetadataRoute } from 'next';
import { currentHost, loadSite } from '@/lib/site';

/** Fixed routes every tenant has. */
const CORE_PATHS = ['', '/features', '/templates', '/pricing', '/how-it-works', '/contact', '/gallery'];

/**
 * Per-tenant sitemap: the core pages plus whatever custom pages the admin
 * published in the builder.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = await currentHost();
  const bundle = await loadSite();
  if (!bundle || bundle.site.status !== 'published') return [];

  const origin = `https://${host}`;
  const now = new Date();

  const custom = (bundle.pages || [])
    .filter((page) => page.slug && String(page.status || 'published') === 'published')
    .map((page) => ({
      url: `${origin}/${String(page.slug).replace(/^\//, '')}`,
      lastModified: page.updated_at ? new Date(String(page.updated_at)) : now,
    }));

  return [
    ...CORE_PATHS.map((path) => ({ url: `${origin}${path}`, lastModified: now })),
    ...custom,
  ];
}
