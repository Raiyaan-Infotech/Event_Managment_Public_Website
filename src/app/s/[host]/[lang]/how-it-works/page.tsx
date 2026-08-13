import { renderPage, type SiteRouteProps } from '@/app/_render';

// Next parses this statically, so it must be a literal — an imported constant
// or env lookup is rejected at build time. Seconds the rendered HTML is served
// from the edge before it re-renders.
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

export default async function Page({ params }: SiteRouteProps) {
  const { host, lang } = await params;
  return renderPage({ page: 'how-it-works', host, lang });
}
