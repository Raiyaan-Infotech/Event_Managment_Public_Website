# Event Management — Public Website

The customer-facing website that the Website Builder produces. One deployment serves **every**
company: the tenant is resolved from the request's `Host`, not from a route or a header.

This is **not** a builder. The admin UI for editing this content lives in
`Event_Management_Admin_Frontend` under `/admin/website-builder`.

## Why it is a separate app

The rendered site used to be a set of routes inside the admin panel. That was fine as a live preview
and wrong as a product:

- every page was `'use client'`, so a crawler received an empty shell;
- the tenant came from an `x-company-id` header, which a visitor on `acme.com` cannot send — the
  site was effectively hardcoded to one company;
- customer sites shared a deployment, a bundle and a domain with the admin panel.

Here each page is server-rendered per tenant, with that tenant's own `<title>`, Open Graph tags,
`robots.txt` and `sitemap.xml`.

## Tenant resolution

`company_websites` carries two columns that decide which site a request gets:

| Column | Example | Resolution |
|---|---|---|
| `slug` | `acme` | `acme.<root>` where `<root>` is any domain in `PUBLIC_SITE_ROOT_DOMAINS` |
| `custom_domain` | `acme.com` | any host not under a configured root |

The Host is normalised (port stripped, lowercased, leading `www.` removed) and looked up by the
backend. An unknown host, or a site whose `status` is not `published`, renders a 404 — it never
falls through to another company's content.

### Assigning a domain

- **Subdomain** — nothing to do per company. Point a wildcard `*.<root>` at the deployment once and
  every slug works immediately.
- **Custom domain** — the customer points a `CNAME` at the host provider, the domain is added to the
  project, and the certificate is issued automatically.

## Data

One request per page render:

```
GET /api/v1/public/site/resolve?host=<host>          -> which company is this
GET /api/v1/public/site/bundle?host=<host>&lang=ta   -> the entire site
```

The bundle exists because the section data spans ~35 tables. Fetching them individually costs one
network round trip each, which is invisible on localhost and seconds against a remote database.

Language works the same way: `?lang=ta` selects the translation overlay **on the server**, so the
translated copy is in the HTML rather than swapped in after hydration.

Pages are cached with ISR and tagged `site:<host>`, so a single tenant can be revalidated without
touching the others.

## Running it

```bash
npm install
cp .env.example .env.local   # then edit
npm run dev                  # http://localhost:3010
```

`NEXT_PUBLIC_API_URL` is inlined at build time — change it and rebuild, or the running app keeps
calling the old address.

Because you cannot point a real domain at localhost, `PUBLIC_SITE_DEV_HOST` tells the app which
tenant a `localhost` request belongs to. **Never set it in production**: it would pin every visitor
to one company regardless of the domain they typed.

The backend needs `PUBLIC_SITE_ROOT_DOMAINS` set to the roots that subdomains hang off.

## Layout

```
src/
  app/
    _render.tsx      one fetch-resolve-render shared by every route
    layout.tsx       per-tenant metadata
    robots.ts        per-tenant; unpublished hosts are fully disallowed
    sitemap.ts       core routes + the tenant's own published pages
    [slug]/          custom pages created in the builder
  components/site/   the rendered sections (ported from the admin preview)
  lib/site.ts        host resolution + bundle loading
```

Section components are presentational: they take data as props and never fetch. Keep it that way —
a component that fetches its own data renders client-side and drops out of the server HTML, which
is the whole reason this app exists.
