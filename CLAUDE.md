# CopánQuest

Web 3D exploration game: Honduran kids walk around the Maya city of Copán as it looked around 800 AD. Spanish first, English second. Must run in mobile browsers (low-end Android) and on desktop.

## Commands

- `npm run dev` — dev server (port 5180 in `.claude/launch.json`)
- `npm run build` — typecheck + production build (`.cloudflare/output/v0/`)
- `npm run typecheck`
- `npm run heightmap` — regenerate `public/terrain/` from the Copernicus DEM
- `npm run icons` — regenerate PWA icons

Node 24 (matches Cloudflare Workers Builds; `.nvmrc` / `.node-version` / `engines`). On this Mac it is
installed keg-only by Homebrew: prefix commands with `PATH="/opt/homebrew/opt/node@24/bin:$PATH"`
(the default `node` is still 22.11). Vite 8 + @vitejs/plugin-react 6. npm 11 install scripts are
allow-listed in package.json (`allowScripts`: esbuild, workerd, fsevents).

Live at https://copanquest.todosenlaweb.com (Worker `copanquest`, repo `SaintMikeNode/copanquest`).
**Pushing to `main` deploys** through Workers Builds (trigger "Deploy main": build
`npx tsc && npx cf build`, deploy `npx cf deploy --prebuilt`, `NODE_VERSION=24`). Never push unless
the user says so in that moment. `cloudflare.config.ts` holds the Worker name, domain and SPA fallback.
Builds go through the Cloudflare Vite plugin (v2 beta, required by `cf` for Vite projects): output is
`.cloudflare/output/v0/` (assets in `workers/default/assets/`), not `dist/`. `npm run preview` serves it
in the local Workers runtime, which snapshots the build when it starts: **restart the preview after every
build**, or the page asks for new script files the server doesn't know and the game stays blank. Manual fallback deploy: `npm run deploy` (needs `npx cf auth login`).

## Layout

- `src/world/` — terrain collider, site colliders, boundary, sky. **Site layout lives in `siteData.ts`** (meters; x = east, z = south, origin = Stela C, y = 0 plaza floor; positions from OpenStreetMap). `buildGreybox.ts` turns it into voxel shapes + colliders.
- `src/voxel/` — block engine: block types, procedural pixel textures, voxel world, greedy mesher with AO (Web Worker), block shader. Visuals are voxels; physics uses the smooth invisible colliders.
- `src/player/` — ecctrl character, input bridge (keyboard + ecctrl joystick store → `setMovement`), collision-aware follow camera, `playerState` (mutable per-frame data, never React state).
- `src/poi/` — point-of-interest data and tracker. **Every fact needs a source.**
- `src/room/` — the landing page: a PS2-era 3D bedroom whose CRT shows the menu (`Landing.tsx` flow and camera, `RoomScene.tsx` models, `psx.ts` shared material + light rig, `roomTextures.ts` painted textures, `Crt.tsx` CRT shader, `RecordPlayer.tsx` + `RecordBox.tsx` the clickable record player and its info box, its public-domain track in `public/music/`; `CreditsBookModel.tsx` + `CreditsBook.tsx` the clickable book with "how it was made" (`aboutData.ts`, keep it true to the README) and the credits). Keep it light: it is the first thing every phone loads.
- `src/ui/` — HUD, minimap, info card, credits, debug overlay, pause menu / journal (language, sound and Ir al inicio live there, not in the HUD; credits in the start menu and in the bedroom's credits book), menu + loading background (`MayaBackground.tsx`). Pixel UI textures and HUD icons are drawn in `uiTextures.ts`.
- `src/npc/` — villagers, trail walkers and jaguars (`People.tsx`, data in `npcData.ts`). Their ground ray only sees fixed colliders; they step up ≤ 0.6 m and keep ~1.1 m apart.
- `src/game/` — quests, pickups, digging, ballgame, camera, time lens, Maya calendar.
- `src/audio/` — Web Audio engine (`sound.ts`: music playlist, effect list `SFX`) and `AudioEvents.tsx` (plays effects by watching the stores). Files in `public/audio/` are 128 kbps MP3 made from the Ovani Sound packs in `../sfx/` with LAME (`brew install lame`; `lame -b 128 --cbr -q 2`). **Never commit them** (license: no redistribution; git-ignored, the repo is public): the live site serves `/audio/*` from the R2 bucket `copanquest-assets` through `worker/index.ts`; upload changed files with `npx cf r2 objects put`.
- `src/components/PixelBlast/` — React Bits background (MIT + Commons Clause, header kept; added by hand: the project has no shadcn/Tailwind).
- `src/i18n/` — `es.json` (source of truth) and `en.json`.
- `branding/` — logo files (icon, wordmark, lockups; SVG with outlined letters + PNG), colors and `build-logo.mjs` to regenerate them.

## Rules

- Content must be factual about the real site. Cite the source for each POI text; mark estimates as estimates.
- Visual meshes and colliders stay separate; each staircase gets one invisible ramp wedge.
- Keep draw calls low: voxel chunks are merged into 64 m regions; check the debug panel (F3) for draw calls / triangles / voxel build time.
- Dev console helpers: `cqTeleport(x, y, z)`, `cqView(yaw, pitch, distance)`, `cqFreeCam(x, y, z, lookX, lookY, lookZ)` (no args releases it; from inside a solid mound you can see into chambers).
- Changing voxel generation (`decorate.ts`, `village.ts`, `mesher.ts`, `REGION`) needs a bump of `VOXEL_CODE_VERSION` in `voxelStream.ts`, or the cached voxels are reused.
- Performance budget: compare the F3 numbers (near tris, plants, voxel ms, Auto quality) before and after anything that adds geometry; trees are the costliest voxels. The detailed voxel world (`REGION`) reaches past the fence only where needed (60 m west for the entrance forest).
- The horizon mountains (`Background.tsx`) are framed, not exact geography (see README, Horizon); keep them low (~2–6° above the horizon) with dips, never a wall.
- Player-facing text: Spanish first, add English at the same time.
- Dev tools: `?debug` in the URL (or `npm run dev`) enables the collider view; `F3` toggles the debug panel; `window.cqTeleport(x, y, z)` in dev.
