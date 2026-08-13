import { renderPage } from '@/app/_render';

// Must be a literal; see the sibling routes.
export const revalidate = 60;

// A dynamic-segment route with no generateStaticParams is treated as fully
// dynamic and never enters the route cache — which is exactly the problem this
// restructure exists to fix. Returning an empty list prebuilds nothing while
// opting the route into on-demand ISR: each (tenant, language, path) renders
// once and is then served from cache until it revalidates.
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

/**
 * Custom pages the admin creates in the builder, plus Terms / Privacy. The
 * renderer resolves an unknown key against that list and 404s if it matches
 * nothing, so this route needs no extra work.
 */
export default async function CustomPage({
  params,
}: {
  params: Promise<{ host: string; lang: string; slug: string }>;
}) {
  const { host, lang, slug } = await params;
  return renderPage({ page: slug, host, lang });
}
