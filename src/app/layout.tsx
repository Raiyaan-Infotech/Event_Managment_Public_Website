import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { resolveSite, loadSite } from '@/lib/site';
import './globals.css';

/**
 * Per-tenant metadata. Every site served by this app has its own title,
 * description and social image, pulled from the tenant's SEO settings — the
 * single biggest thing the in-admin preview could never do, since one Next
 * app there served one hardcoded identity.
 */
export async function generateMetadata(): Promise<Metadata> {
  const site = await resolveSite();
  if (!site.found) {
    return { title: 'Site not found' };
  }

  const bundle = await loadSite();
  const seo = bundle?.seo || {};
  const basic = bundle?.basic_information || {};

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
