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

After a push: wait for the build (`npx cf builds list --external-script-id 9f9338062f7841c7bdde6073866f9866`,
newest first, `status` / `build_outcome`), then purge the zone's cached HTML, which otherwise keeps
serving the previous version: `npx cf cache purge -z a41b0baf1e1bfb353ebf69e1a3954fc4 --force --body
'{"files":["https://copanquest.todosenlaweb.com/", ".../index.html", ".../sw.js", ".../registerSW.js",
".../manifest.webmanifest", ".../workbox-*.js"]}'` (max 30 URLs per call; full URLs). Check that the
live `assets/index-*.js` matches the local build; if the working tree has uncommitted changes the names
differ, so instead grep the live chunks for a string the new commit adds. A git push of the binaries can drop mid-way over
HTTPS: retry with `git -c http.postBuffer=157286400 push`. Phones keep the previous version one
load longer (service worker, `autoUpdate`); that old code then asks for chunks the new deploy
removed, so `staleReload.ts` reloads once on a missing chunk.

## Layout

- `src/world/` — terrain collider, site colliders, boundary, sky. **Site layout lives in `siteData.ts`** (meters; x = east, z = south, origin = Stela C, y = 0 plaza floor; positions from OpenStreetMap). `buildGreybox.ts` turns it into voxel shapes + colliders.
- `src/voxel/` — block engine: block types, procedural pixel textures, voxel world, greedy mesher with AO (Web Worker), block shader. Visuals are voxels; physics uses the smooth invisible colliders.
- `src/player/` — ecctrl character, input bridge (keyboard + ecctrl joystick store → `setMovement`), collision-aware follow camera, `playerState` (mutable per-frame data, never React state).
- `src/poi/` — point-of-interest data and tracker. **Every fact needs a source.**
- `src/room/` — the landing page: a PS2-era 3D bedroom whose CRT shows the menu (`Landing.tsx` flow and camera, `RoomScene.tsx` models, `psx.ts` shared material + light rig, `roomTextures.ts` painted textures, `Crt.tsx` CRT shader, `RecordPlayer.tsx` + `RecordBox.tsx` the clickable record player and its info box, its public-domain track in `public/music/`; `CreditsBookModel.tsx` + `CreditsBook.tsx` the clickable book with "how it was made" (`aboutData.ts`, keep it true to the README) and the credits). Keep it light: it is the first thing every phone loads.
- `src/ui/` — HUD, minimap, info card, credits, debug overlay, pause menu / journal (language, sound and Ir al inicio live there, not in the HUD; credits in the start menu and in the bedroom's credits book), menu + loading background (`MayaBackground.tsx`). Pixel UI textures and HUD icons are drawn in `uiTextures.ts`. Also:
  - `Tutorial.tsx` — first-play tutorial (localStorage `cq-tutorial-v1`), restartable from the pause menu.
  - `presence.tsx` — enter / exit animations: `useExit(value)` keeps the last value on screen while it animates out, `Presence` wraps whole windows. A component rendering from `useExit` must **not rebuild its content from live state while leaving** (the dialogue keeps the script it opened with: an end action changes the quest, and a rebuilt, shorter script once crashed the app reading a line past its end).
  - `ErrorBoundary.tsx` (in `main.tsx`) — a render error shows a reload card instead of an empty dark-green page (the page background is all that's left when React unmounts).
    It also draws that card over the game for failures outside React's render, watched by `src/crash.ts`: a WebGL context lost and not restored within 1.5 s (the card goes away if it comes back; three.js redraws by itself), 20 uncaught errors in 3 s (one thrown every frame), a chunk that won't load after the one automatic reload, a dead voxel worker. Simulate a lost context with `gl.getExtension("WEBGL_lose_context").loseContext()` / `.restoreContext()` on the `.game-canvas canvas` context.
  - `ProjectCredit.tsx` (the author credit line at the top of the credits and the pause menu; the bedroom footer in `Landing.tsx` is shorter and names no author: two balanced lines on every screen, "Un proyecto educativo de código abierto" / "de Todos en la Web", one nowrap `<span>` per line; on phones held sideways the bedroom buttons sit higher to clear it), `ReportBug.tsx` (mailto hola@saintmikenode.com with page / browser / screen), `InstallApp.tsx` + `src/installApp.ts` (touch only: Chrome's install prompt caught at startup, or install steps; hidden when installed).
  - Touch layout (styles.css, `pointer: coarse` blocks near the end): no minimap (a map button in the column instead), text boxes at the top as columns whose buttons stay visible and whose text scrolls; phones held sideways (`LANDSCAPE_PHONE` in `TouchControls.tsx`) get a button row top right and wide centered boxes. Desktop styles must stay untouched by these.
- `src/npc/` — villagers, trail walkers and jaguars (`People.tsx`, data in `npcData.ts`). Their ground ray only sees fixed colliders; they step up ≤ 0.6 m and keep ~1.1 m apart. Decoration colliders (bushes, trunks, village boxes) are in their own collision group (`src/world/groups.ts`): actors spawn on the nearest bare ground and never step onto a decoration.
- `src/game/` — quests, pickups, digging, ballgame, camera, time lens, Maya calendar. `Glow.tsx`: light shafts over things to collect (pickups, jade beads, the turkeys during their mission), one instanced draw call; owners call `glow()` every frame. `src/npc/QuestMarkers.tsx`: the floating `!` / `?` above villagers with a mission.
- `src/audio/` — Web Audio engine (`sound.ts`: music playlist, effect list `SFX`) and `AudioEvents.tsx` (plays effects by watching the stores). Files in `public/audio/` are 128 kbps MP3 made from the Ovani Sound packs in `../sfx/` with LAME (`brew install lame`; `lame -b 128 --cbr -q 2`). **Never commit them** (license: no redistribution; git-ignored, the repo is public): the live site serves `/audio/*` from the R2 bucket `copanquest-assets` through `worker/index.ts`; upload changed files with `npx cf r2 objects put`.
- `src/components/PixelBlast/` — React Bits background (MIT + Commons Clause, header kept; added by hand: the project has no shadcn/Tailwind).
- `src/i18n/` — `es.json` (source of truth) and `en.json`.
- `branding/` — logo files (icon, wordmark, lockups; SVG with outlined letters + PNG), colors and `build-logo.mjs` to regenerate them.

## Filming (dev only)

Tools to record trailers and social videos: drone flights, orbits, 360° spins around the player,
scripted walks, aimed photos and a clean frame without UI. Full API: `DIRECTOR.md`. Code in `src/dev/`
(`Director.tsx` the API, `directorCam.ts` the camera override that `FollowCamera` and `VoxelTerrain`
read). Everything is mounted with `import.meta.env.DEV`, so none of it reaches the production build;
keep it that way (after changing it, build and grep the output for `cqDirector`: 0 matches).

How to film:
1. Start the dev server (`npm run dev`, port 5180) and open `http://localhost:5180/?director`.
   It starts in the world with no bedroom or tutorial, high quality, music off (sound effects stay),
   plants drawn to 260 m and no place cards. Wait ~12 s for the world to build.
2. Drive it from the browser console or automation (`page.evaluate`) with `window.cq`:
   - `cq.hud(false)` for a clean frame (aerials), `cq.hud(true)` for gameplay; `cq.fov(55)`.
   - Camera: `cq.fly([{pos, look}, …], seconds)`, `cq.orbit({center, radius, height, seconds})`,
     `cq.orbitPlayer({radius, height, seconds})`, `cq.hold(pos, look)`, `cq.release()`.
   - Player: `cq.place(x, y, z, [faceX, faceZ])`, `cq.walkTo(x, z, {run: true})`,
     `cq.photo({subject: "rosalila"})` (the explorer's camera, centered on its subject).
   - Ready-made shots: `cq.shots.hookAerial()`, `plazaDrone()`, `ballCourtToStairway()`,
     `acropolisOrbit()`, `templeTop360()`, `photoStela()`, `rosalila()`. All moves return promises.
3. Record with real device emulation for phones and tablets (Playwright `isMobile: true, hasTouch: true`;
   e.g. 390×844 portrait, 844×390 sideways, 820×1180 tablet), not `?touch`: the touch layout follows
   media queries. Desktop: 1920×1080. Run each shot once as a rehearsal (the first run compiles shaders).
4. Save the video files outside the repo (e.g. `../copanquest-video/`). Don't put local paths, IP
   addresses or machine names in committed files: the repo is public.

## Rules

- Content must be factual about the real site. Cite the source for each POI text; mark estimates as estimates.
- Visual meshes and colliders stay separate; each staircase gets one invisible ramp wedge. Ruins with an eroded top (temple superstructures, ruined walls) get a triangle-mesh collider over the same columns the voxel builder draws (`src/world/ruinCollider.ts`, sharing `erodedTop` / `boxBlocks` with `voxelWorld.ts`): change the erosion in one place only, or the player floats above the blocks again.
- Keep draw calls low: voxel chunks are merged into 64 m regions; check the debug panel (F3) for draw calls / triangles / voxel build time.
- Dev console helpers: `cqTeleport(x, y, z)`, `cqView(yaw, pitch, distance)`, `cqFreeCam(x, y, z, lookX, lookY, lookZ)` (no args releases it; from inside a solid mound you can see into chambers).
- Changing voxel generation (`decorate.ts`, `village.ts`, `mesher.ts`, `REGION`) needs a bump of `VOXEL_CODE_VERSION` in `voxelStream.ts`, or the cached voxels are reused.
- Performance budget: compare the F3 numbers (near tris, plants, voxel ms, Auto quality) before and after anything that adds geometry; trees are the costliest voxels. The detailed voxel world (`REGION`) reaches past the fence only where needed (60 m west for the entrance forest).
- The horizon mountains (`Background.tsx`) are framed, not exact geography (see README, Horizon); keep them low (~2–6° above the horizon) with dips, never a wall.
- Player-facing text: Spanish first, add English at the same time. No "work in progress" disclaimers, and no claims the game works offline (music streams online).
- Trails (`PATHS`) must never cross stonework: check new or moved trails against every mound and stair footprint (the West Court trail used to run over Platform 13).
- Test touch layouts in the browser at phone sizes, portrait and sideways (e.g. 375×812, 412×760, 740×340; widths under 768 emulate touch), and check desktop is unchanged.
- Dev tools: `?debug` in the URL (or `npm run dev`) enables the collider view; `F3` toggles the debug panel; `window.cqTeleport(x, y, z)` in dev.
- Several Claude sessions may work in this checkout at once (their commits show up on `main`): commit only your own files or hunks (stage a partial file with `git apply --cached` on a filtered diff), and never revert changes you didn't make.
