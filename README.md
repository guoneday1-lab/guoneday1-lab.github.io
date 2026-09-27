# ZLG Public Review

Read-only public review environment pinned to ZLG Production Deploy `6ab13e2d0dcd7f64cb3a69bf`.

- Source Version: `V2.3.3`
- Production origin: `https://zlg-ai-platform-staging-20260816.netlify.app/`
- Review source: immutable Netlify deploy URL
- Product data: production Product Graph and Search V3.2
- Mock products: `0`

The root route proxies only `GET` and `HEAD` requests to the immutable production deploy. The only accepted `POST` routes are `/api/product-search` and `/__review/search`; both perform production search reads. All other mutation methods return `405`.

Review-only compatibility additions:

1. Response headers and HTML metadata identify the review source version and production deploy.
2. `GET /api/product-search?query=...` mirrors the production read-only search POST for non-browser clients.
3. `/__review/search?q=...` renders the same production search response as server-readable HTML.
4. `/robots.txt` explicitly allows ordinary review crawling.

No production settings, DNS, data, deploys, or environment variables are changed.
