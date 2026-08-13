import { headers } from 'next/headers';

/**
 * Tenant resolution + data loading.
 *
 * The admin app addresses the builder API with an `x-company-id` header. A
 * visitor on acme.com has no such header and never will, so this app resolves
 * the tenant from the Host and asks the backend which company that is.
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');

/**
 * Local development cannot point acme.com at localhost, so a fallback host is
 * read from the environment. Never set this in production: it would pin every
 * visitor to one tenant.
 */
const DEV_HOST = process.env.PUBLIC_SITE_DEV_HOST || '';

export type SiteIdentity = {
  found: boolean;
  id?: number;
  company_id?: number;
  slug?: string;
  custom_domain?: string | null;
  status?: string;
  is_published?: boolean;
};

export type AnyRecord = Record<string, any>;

export type SiteBundle = {
  found: boolean;
  site: {
    id: number;
    company_id: number;
    slug: string;
    custom_domain: string | null;
    status: string;
    theme_id: number | null;
    palette_id: number | null;
    settings: AnyRecord;
  };
  hero_sections: Record<string, AnyRecord>;
  highlights: AnyRecord[];
  languages: AnyRecord[];
  translations: { language: AnyRecord | null; translations: Record<string, AnyRecord> };
  basic_information: AnyRecord;
  theme_settings: AnyRecord;
  footer: AnyRecord;
  seo: AnyRecord;
  contact_settings: AnyRecord;
  login_settings: AnyRecord;
  pricing_settings: AnyRecord;
  social_links: AnyRecord[];
  pages: AnyRecord[];
  menu_items: AnyRecord[];
  ui_blocks: AnyRecord[];
  sliders: AnyRecord[];
  slider_items: AnyRecord[];
  gallery_categories: AnyRecord[];
  gallery_items: AnyRecord[];
  contact_categories: AnyRecord[];
  testimonials: AnyRecord[];
  clients: AnyRecord[];
  sponsors: AnyRecord[];
  features: AnyRecord[];
  pricing_plans: AnyRecord[];
  pricing_matrix_features: AnyRecord[];
  faqs: AnyRecord[];
  faq_categories: AnyRecord[];
  how_it_works: AnyRecord[];
  templates: AnyRecord[];
  template_categories: AnyRecord[];
  video_tutorials: AnyRecord[];
  video_tutorial_categories: AnyRecord[];
};

/**
 * The host the visitor typed. `x-forwarded-host` wins because behind Vercel the
 * `host` header is the internal one.
 */
export async function currentHost(): Promise<string> {
  const store = await headers();
  const raw = store.get('x-forwarded-host') || store.get('host') || '';
  const host = raw.split(',')[0].trim().toLowerCase().split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') return DEV_HOST || host;
  return host;
}

/**
 * ISR rather than per-request fetching: a marketing page changes when an admin
 * saves, not per visitor. Tagged so a future webhook from the builder can
 * revalidate a single tenant instead of waiting out the window.
 */
const REVALIDATE_SECONDS = Number(process.env.PUBLIC_SITE_REVALIDATE || 60);

async function apiGet<T>(path: string, tag: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: [tag] },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    // The backend wraps everything as { success, message, data }.
    return (json?.data ?? json) as T;
  } catch {
    return null;
  }
}

/** Cheap "is this host a site?" check — no content, for metadata and 404s. */
export async function resolveSite(host?: string): Promise<SiteIdentity> {
  const target = host || (await currentHost());
  if (!target) return { found: false };
  const data = await apiGet<SiteIdentity>(`/public/site/resolve?host=${encodeURIComponent(target)}`, `site:${target}`);
  return data || { found: false };
}

/**
 * Everything needed to render any page of this tenant's site, in one request.
 *
 * `host` is passed in rather than read from `headers()` on purpose. Calling
 * `headers()` marks the route dynamic, which opts it out of Next's route cache
 * entirely — every visitor then pays a full server render (measured: ~1.1s TTFB,
 * `X-Vercel-Cache: MISS` on every hit). The host reaches the page as a route
 * param via middleware instead, so the rendered HTML is cacheable at the edge.
 *
 * `lang` ships the translation overlay for that language; omit it for the
 * site's default language and none is sent.
 */
export async function loadSite(host: string, lang?: string): Promise<SiteBundle | null> {
  if (!host) return null;

  const params = new URLSearchParams({ host });
  if (lang) params.set('lang', lang);

  const bundle = await apiGet<SiteBundle>(`/public/site/bundle?${params.toString()}`, `site:${host}`);
  if (!bundle || bundle.found === false) return null;
  return bundle;
}
