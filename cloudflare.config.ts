import { defineConfig } from "cf/config";

// Static-assets Worker. `cf build` runs `vite build`; the Cloudflare Vite plugin (v2 beta) writes
// the assets and this config to .cloudflare/output. Deployed by Workers Builds on push to main.
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
