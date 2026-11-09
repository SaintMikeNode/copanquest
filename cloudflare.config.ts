import { bindings, defineConfig } from "cf/config";

// Static-assets Worker with a small script for /audio/* (worker/index.ts), which streams the
// licensed music and sound effects from the R2 bucket "copanquest-assets" (they are not in Git).
// `cf build` runs `vite build`; the Cloudflare Vite plugin (v2 beta) writes the assets and this
// config to .cloudflare/output. Deployed by Workers Builds on push to main.
export default defineConfig({
  worker: {
    name: "copanquest",
    compatibilityDate: "2026-11-01",
    entrypoint: "./worker/index.ts",
    env: {
      AUDIO: bindings.r2({ name: "copanquest-assets" }),
      ASSETS: bindings.assets(),
    },
    observability: {
      enabled: true,
    },
    assets: {
      htmlHandling: "auto-trailing-slash",
      notFoundHandling: "single-page-application",
      runWorkerFirst: ["/audio/*"],
    },
    domains: ["copanquest.todosenlaweb.com"],
  },
});
