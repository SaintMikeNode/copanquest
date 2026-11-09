import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/*.png"],
      manifest: {
        name: "CopánQuest",
        short_name: "CopánQuest",
        description: "Explora las ruinas mayas de Copán, Honduras, en un mundo de bloques.",
        lang: "es",
        start_url: "/",
        display: "fullscreen",
        orientation: "any",
        background_color: "#1d2a24",
        theme_color: "#b3402a",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Rapier's WASM is inlined in a JS chunk (~2 MB), above Workbox's default limit.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,svg,png,json,bin,glb,ktx2}"],
        // macOS AppleDouble files appear when the repo lives on an exFAT drive.
        globIgnores: ["**/._*"],
      },
    }),
  ],
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 3000,
  },
});
