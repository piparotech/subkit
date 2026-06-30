// @piparo/seo-meta-structured-data — the build/SSR-time discoverability Engine (capability
// seo-meta-structured-data; 1:1 module). Pure, deterministic generators for everything a crawler and
// social scraper read: complete meta/OG/Twitter tags per page, a valid sitemap.xml + robots.txt from
// one page list, and per-page-type schema.org JSON-LD (Organization/WebSite/Breadcrumb/Article/
// BlogPosting). No host, no DOM, no I/O — so the same code runs at build time, on the server and in
// tests, and the output is byte-reproducible for the Rich-Results/Lighthouse QA gate.
//
// Vendored into the web showcase from piparo-platform/modules/seo-meta-structured-data/src. The
// platform Engine validates config with zod; this copy keeps the same shape/defaults via a small
// dependency-free resolver (see config.ts) so the showcase has no extra runtime deps.
export * from './config'
export * from './url'
export * from './meta'
export * from './sitemap'
export * from './robots'
export * from './jsonld'
