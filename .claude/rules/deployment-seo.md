---
paths:
  - ".github/**/*"
  - "**/Dockerfile*"
  - "compose*.yml"
  - "compose*.yaml"
  - "VIImpact.Web/package.json"
  - "VIImpact.Web/vite.config.*"
  - "**/*sitemap*"
  - "**/*seo*"
---

# Deployment and SEO

A successful local build is not proof of production success.

When runtime/deployment/config changes are in scope, validate the relevant:

- frontend production build;
- API health/readiness;
- environment variables;
- CORS;
- frontend API base URL;
- production routes;
- database/provider readiness.

Historical production has used Vercel, Render, and Neon/PostgreSQL, but current repository/deployment state wins.

For event/SEO changes verify current generated pages, canonical metadata, sitemap, duplicate slugs, and internal links.
Never hardcode old historical page counts as the current expected count.
