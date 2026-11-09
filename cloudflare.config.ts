import { defineConfig } from "cf/config";

// Static-assets Worker. Files come from ./dist (built by `npm run build`; see wrangler.config.ts).
// Not deployed yet: create the Worker / custom domain only when explicitly asked.
export default defineConfig({
  worker: {
    name: "copanquest",
    compatibilityDate: "2026-11-01",
    observability: {
      enabled: true,
    },
    assets: {
      htmlHandling: "auto-trailing-slash",
      notFoundHandling: "single-page-application",
    },
    domains: ["copanquest.todosenlaweb.com"],
  },
});
