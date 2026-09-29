# ZLG Public Review Mirror

Public read-only snapshot for product and UI review.

- Source: ZLG `V2.3.3`
- Production Deploy: `6ab13e2d0dcd7f64cb3a69bf`
- Product data: Production Product Graph and reviewed Search V3.2 snapshots
- Public products: `357`
- Public families: `284`
- Public brands: `79`
- Verified-headquarters brands: `56`
- Countries: `19`
- Mock/demo products: `0`

This repository is a read-only review mirror. It is not the production deployment.

The published site contains static HTML, static JSON and browser-only filtering. It does not call Netlify Functions or the Production search runtime to display core review content. Forms, CRM writes, email, business mutations and database writes are not included.

GitHub Pages publishes the committed `public/` snapshot through `.github/workflows/pages.yml`. Production settings, DNS, data, Product Graph, Search V3.2, ranking, intent and UI are unchanged.
