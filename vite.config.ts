import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { VitePWA } from "vite-plugin-pwa";

// ecctrl 2 runs its whole character update (hover spring, jump timer, move impulses) in a
// useFrame, scaled by world.timestep. Our physics steps at a fixed 1/60 s, so on 120–165 Hz
// displays the update ran 2–3 times per physics step: the hover spring became unstable (the
// kid bobbed and sank up to ~0.3 m into the floor) and the jump window shrank to a third
// (a 0.18 m hop instead of a jump). Phones at 60 Hz were fine.
//
// Fix: run that update in @react-three/rapier's useBeforePhysicsStep, once per physics step,
// which is what its world.timestep scaling assumes. Applied when Vite loads the file (dev
// pre-bundling and the production build), so node_modules stays untouched.
// If ecctrl changes and the patterns are gone, the build fails loudly here.

const LOOP = "useFrame(() => {\n\t\tvar _joystick$x, _joystick$y;";
const IMPORT = 'import { CapsuleCollider, RigidBody, useRapier } from "@react-three/rapier";';

const ecctrlFixedStep = {
  name: "ecctrl-fixed-step",
  transform(code: string, id: string) {
    if (!/[\\/]ecctrl[\\/]dist[\\/][^\\/]+\.js$/.test(id) || !code.includes("var _joystick$x, _joystick$y;")) return null;
    if (!code.includes(LOOP) || !code.includes(IMPORT))
      throw new Error(`[ecctrl-fixed-step] ecctrl changed; update vite/ecctrlFixedStep.ts (${id})`);
    return {
      code: code
        .replace(IMPORT, 'import { CapsuleCollider, RigidBody, useBeforePhysicsStep, useRapier } from "@react-three/rapier";')
        .replace(LOOP, "useBeforePhysicsStep(() => {\n\t\tvar _joystick$x, _joystick$y;"),
      map: null,
    };
  },
};

export default defineConfig({
  plugins: [
    ecctrlFixedStep,
    react(),
    // Writes the Worker deploy config (static assets from the client build) that `cf deploy` uses.
    cloudflare(),
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
  // Build output (Cloudflare Build Output Spec) must not trigger dev reloads.
  server: { watch: { ignored: ["**/.cloudflare/**"] } },
  // Dev pre-bundles ecctrl with Rolldown, so the patch must run there too.
  optimizeDeps: { rolldownOptions: { plugins: [ecctrlFixedStep] } },
  build: {
    target: "es2022",
    // The engine chunk (three + Rapier WASM) is ~3.3 MB raw / 1.1 MB gzip, loaded after the menu.
    chunkSizeWarningLimit: 3500,
  },
});
