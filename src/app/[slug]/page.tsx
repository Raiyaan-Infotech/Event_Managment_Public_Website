import { renderPage, type PageProps } from '@/app/_render';

/**
 * Custom pages the admin creates in the builder (`company_website_pages`),
 * plus Terms / Privacy. The renderer already resolves an unknown key against
 * that list and 404s if it matches nothing, so this route needs no extra work.
 */
export default async function CustomPage({
  params,
  searchParams,
}: PageProps & { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return renderPage({ page: slug, searchParams });
}
