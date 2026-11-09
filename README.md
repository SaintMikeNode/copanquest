# CopánQuest

Un juego web en 3D para que niñas y niños de Honduras exploren las ruinas mayas de **Copán**.
*A web-based 3D exploration game where Honduran kids explore the Maya ruins of Copán.*

**Art direction:** Copán as it feels **today**, interpreted as a game world rather than a photo replica:
- Restored grey-beige tuff masonry with moss, rain streaks and grass on every terrace, and ruined temple tops.
- Green lawns with clumps of tall grass and flowers, and dirt trails.
- Giant ceibas and figs, with the city core kept open.
- Scarlet macaws overhead, and El Corte with the river.

The look follows a vivid block-game texture pack: banded palettes, bevelled stones, grass fringes, a painted sky and soft fog, all at one pixel density (16 px per 0.5 m block). Characters, animals and carved monuments use the same density.

The Principal Group is built from **0.5 m blocks** (a Minecraft-style voxel look) laid out from the real site: positions from OpenStreetMap, published dimensions where they exist, and estimates (marked in the code) where they don't.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5180 (with the launch config) or Vite's default port
npm run build      # typecheck + production build in .cloudflare/output/v0/
npm run preview    # serve the build in the local Workers runtime (service worker active)
```

Requires **Node 24** (same as Cloudflare Workers Builds; see `.nvmrc`). Built with Vite 8.

Hosting: a Cloudflare static-assets Worker at https://copanquest.todosenlaweb.com (`cloudflare.config.ts`; the Cloudflare Vite plugin writes the build to `.cloudflare/output/`). Pushing to `main` on GitHub (`SaintMikeNode/copanquest`) deploys through Workers Builds. `npm run deploy` is the manual fallback. Only push or deploy when the user asks.

### Controls

| | Desktop | Phone / tablet |
| --- | --- | --- |
| Walk | W A S D / arrows | Left joystick |
| Run | Shift | Push the joystick to the edge |
| Jump | Space | *Saltar* button |
| Look | Click the game once, then move the mouse | Drag on the screen |
| Zoom | Mouse wheel | Pinch |
| Talk / observe / dig / hit the ball | Right-click | The prompt button |
| Journal (inventory) | E (or J) | Book button |
| Explorer's camera | C (left click or F takes the photo) | Camera button |
| Time lens | T | Hourglass button |
| Back to the entrance | R | Pause menu |
| Pause | Esc (also frees the cursor; closes an open window first) | — |
| Map | Click the minimap | Tap the minimap |

**UI look:** pixel-art wood, moss and red ochre in the style of "garden/nature" Minecraft UI packs (style references only; no art copied). The textures are drawn at startup from the game's own palettes (`src/ui/uiTextures.ts`) and used as CSS variables: wood-framed panels with parchment inside and moss on top, calm low-contrast plank buttons with outlined text, red-ochre plaster (like Copán's painted stucco) for the main action and selected toggles, dark inset slots for HUD chips, 9-slice pixel frames (`border-image`). Font: Pixelify Sans.

The pause menu freezes the whole world (R3F frameloop `never`) and has Resume, Back to the entrance, the language / sound / credits row and the controls. The same row is at the bottom of the journal (E or the book button), so phones reach it too; the HUD itself only keeps one row of same-height chips (an **Esc Menú** button that opens the pause menu, ☰ on phones; help; rank, Maya date, jade, places, people; FPS), the map and the camera / journal / time-lens buttons. On computers those three buttons show their key (C, E, T) on a small keycap, and their icons are 16×16 pixel art from `uiTextures.ts` (`--icon-camera`, `--icon-book`, `--icon-lens`). Losing the mouse capture (Esc, switching windows) opens it. Computer keys live in `src/ui/DesktopKeys.tsx`; right-click fires a `cq-interact` event from `FollowCamera`.

Dev tools: `npm run dev` or `?debug` in the URL enables the collider view. `F3` (or tapping the FPS counter) opens the debug panel: draw calls, triangles, position and quality. `?touch` forces the touch controls on desktop. In dev, `cqTeleport(x, y, z)` in the console moves the player.

## Game features

- **Start at the visitor entrance**, next to Don Mateo, a Ch'orti' Maya guide. The Ch'orti' live in the Copán region today.
- **A living Maya ward** west of the Great Plaza, toward El Bosque, modeled on Joya de Cerén (El Salvador, buried by ash around AD 600):
  - Patio groups of earthen, thatched houses on low platforms, with sleeping benches.
  - Open kitchens with three-stone hearths, and storehouses with maize and pots.
  - A domed temazcal (sweat bath).
  - Maize, bean and squash milpas, an agave field, and fruit trees.
  - A market along the trail. (`src/world/villageData.ts`, `src/voxel/village.ts`)
- **Two more wards** fill the open ground east of the Great Plaza (along the road to the Las Sepulturas sacbe) and southwest of the Acropolis, with patio groups, temazcales, fields, fruit trees, hearth smoke and neighbors walking their lanes. Around AD 750–800 about 20,000 people lived in the Copán valley, most in patio groups like these (Webster & Freter 1990, *Latin American Antiquity*). Their layout is a game layout.
- **Trails skip the ball court:** from the entrance the trail runs down the west side of the middle plaza and passes west of the ball court; a spur crosses the Court of the Hieroglyphic Stairway to its foot.
- **People you can talk to** (right-click / *Hablar* button): a weaver, a farmer, a cacao merchant, a scribe, a ballplayer, a sculptor at an unfinished stela, a potter making Copador pottery, an obsidian knapper, a village girl, and the guide. Every line is sourced (`src/npc/npcData.ts`). Townspeople also walk the trails, some carrying baskets.
- **Jaguars** prowl three edges of the woods. Get close and they sit and watch you; *Observar* teaches about b'alam.
- **Scarlet macaws** perch on the entrance gate and the market stall awnings (folded wings, head bobs, a wing stretch now and then), besides the flocks overhead (`Macaws.tsx`).
- **White-faced capuchins** (*mono cara blanca*, *Cebus imitator*): nine troops of three sit on canopy ledges around the park (entrance, Great Plaza, ball court, stairway, Acropolis, both wards), look around, leap from tree to tree and scatter when you come close. Perches come from the voxel worker (`treePerches`); all monkeys are 6 instanced draw calls (`Monkeys.tsx`). The species is one of Honduras' three wild monkeys; we found no record of it at Copán itself, so the game says only that it lives in Honduras.
- **Ladders:** wooden ladders up stepped walls, terrace by terrace (Acropolis north wall, Temples 16, 22 and 26, and the ball court's Structure 10). Walk into the wall to climb (`src/world/ladders.ts`).
- **10 jade beads** to find, many only reachable by ladder. Progress (jade, places visited, people met) is saved in the browser.

## Sound

`src/audio/sound.ts`: Web Audio engine. Music plays Tiki Party → 5 s pause → Field Day → 5 s pause → around again, starting on the first tap or key press (browsers block sound before that). The ♫ / 🔊 buttons in the start menu, the pause menu and the journal switch music and effects off separately (saved in `localStorage`). Every button click ticks; `src/audio/AudioEvents.tsx` plays effects by watching the stores (windows, dialogue, places, pickups, jade, digging, finds, quests, photos, camera, time lens, respawn); jump, ball hit, rank up and errors are played where they happen. Footsteps (`Player.tsx`): one per stride of ground covered (longer when running), soft dirt on the terrain and gravel on stone (the ground ray hits a non-trimesh collider: mounds, stairs, floors), a louder step on landing and a wood knock per ladder rung. The step sounds are the first ~0.25 s of the pack's Dirt/Gravel Interaction clips, trimmed with a fade-out before encoding. Sound effects are cached by the service worker after first use; music streams.

## Game loop

Everything feeds **XP** and four **ranks** (`src/state/progress.ts`): Turista → Explorador/a (binoculars, so the camera can zoom) → Arqueólogo/a (the time lens) → Guardián/a de Copán (jade hat). Progress is saved in localStorage.

- **Explorer's camera** (📷 / C, shutter F):
  - Over-the-shoulder viewfinder. An aim check finds the subject nearest the center that nothing blocks.
  - Saves a real thumbnail into the **album**: animals, people and monuments, each with a fact (`src/game/subjects.ts`, `CameraAim.tsx`).
- **Quests** (`src/game/gameData.ts`, `questLogic.ts`). Each villager has one, delivered through dialogue (offer → reminder with progress → payoff with a sourced fact):
  - Guide: photograph 3 animals, then dig 3 archaeology squares.
  - Weaver: 5 indigo plants (Maya blue).
  - Merchant: 6 cacao pods.
  - Farmer: 8 ears of maize.
  - Scribe: read 6 glyph fragments.
  - Ballplayer: hit 3 macaw markers.
  - Sculptor: 3 flints.
  - Girl: find her 4 turkeys.
- **Glyph puzzles:** Maya numbers in dots (1), bars (5) and the shell (0), drawn in pixel art.
- **Digging:** hold to dig at staked squares. Each square gives an artifact with a fact (Copador pottery, Ixtepeque obsidian, shell bead, spindle whorl, greenstone axe), which goes to the journal's **museum**.
- **Ballgame:** a physics rubber ball, a hip-bump action, and six macaw-head markers on the sloped walls.
- **Ball Court A-III**, measured on clear dry-season satellite imagery (Esri Wayback 2024-03-28): alley axis x 36.8 (z 152–181), Structure 9 x 6–34 and Structure 10 x 40–63 with wide sloped playing walls and rows of ruined rooms; a stepped platform closes the north end on the same axis, with Stela 2 (AD 652, K'ahk' Uti' Witz' K'awiil, "Smoke Imix") and Altar L (AD 822, the last carved monument) on top, centered as in photos from the south; stairs at the south ends and on the outer sides; Stela 1 at Structure 9's west face (Mesoweb Copán tour; FLAAR ballcourt report; OSM outlines).
- **Other mapped ruins:** footprints traced from OpenStreetMap's wall outlines (checked over satellite imagery and the park's scale model): the western platform with a mound at each end, the long platform west of the middle plaza, the patio group by the entrance (the village's houses stand on its platforms), a small mound west of the Hieroglyphic Stairway court, Mound 7 (with Altar O) and Mound 8, two platforms west of the Acropolis, the long gallery platform and Mound 3 northeast of the Great Plaza, and small house platforms by the east fence. Heights are estimates. The fictional wards and trails were moved off them.
- **Time lens** (⏳ / T): blends the world toward Copán around AD 800 in the shaders. Stone becomes red-painted stucco, plazas and terrace tops become cream plaster, wild plants fade from the city core, and ancient townspeople fill the plazas while today's tourists disappear (`src/game/lens.ts`).
- **Fixed time of day** (`src/game/time.ts`, `FIXED_TIME`): a bright morning with readable shadows. The night code (stars, Venus, fireflies) is still there; `cqTime()` previews it. A HUD chip shows **today's real date in the Maya calendar** (Long Count, Tzolk'in, Haab'; GMT correlation 584283, checked against 21 Dec 2012 = 13.0.0.0.0 4 Ajaw 3 K'ank'in); tapping it explains the three parts.
- **Rosalila:**
  - A torch-lit tunnel from Temple 16's east face, near the tunnel entrances in OpenStreetMap, leads to a chamber with Rosalila inside.
  - You come out in the north corridor, turn the corner, and find the painted west front, with room in front of it to see the whole façade. Two clay censers flank the door (censers were found inside Rosalila).
  - It's true to the published size: three levels, about 12.9 m, base 18.5 × 12.5 m. Proportions are measured from front photos of the full-size replica in the Copán Sculpture Museum (Wikimedia Commons).
  - It is not voxels but a painted stucco relief model (`src/voxel/rosalilaArt.ts`) at the same 32 px/m as the blocks, drawn from the replica:
    - Level 1: doorways, and giant green-feathered bird masks with the red Sun God face coming out of the beak.
    - The projecting frieze: a Sun God mask with a jade column over each door, serpent bodies ending in big white scrolls, green cartouches, and cut-out serpent crests at the corners.
    - Level 2: the earth-monster (witz) mask on the west and east, and serpent heads at the sides.
    - Level 3: vents, the skeletal censer face, and white braided serpent bands rising like smoke.
  - Masks and crests are real boxes and cut-out cards, so the façade has depth. Everything is one atlas (1024 px wide) and two draw calls. Massing and colliders live in `src/world/rosalilaShape.ts`.
  - The interior is dark, with flickering torchlight built into the shared shader; the stucco keeps a faint glow so its colors read.
  - Colliders are carved by box subtraction. The chamber stays inside Temple 16's fourth terrace so the darkness never reaches the outside.
  - The info card notes that the real tunnels are much narrower.
- **Life around the city:**
  - Animals: agoutis that scurry off, turkeys, butterflies, pollen and fireflies.
  - Flowering macuelizo (pink) and guayacán (yellow) trees.
  - Fallen sculpture fragments at the foot of the ruins.
  - Stone benches along the trails, and an entrance gate.
  - Hearth smoke over the village, and tourists in the plazas.

Dev console helpers (with `?debug` or `npm run dev`): `cqTeleport(x, y, z)`, `cqView(yaw, pitch, dist)`, `cqTime(0..1)`, `cqLens(true)`.

## Loading and streaming

- **Loading screen:** shows real progress and rotating facts. It stays up until everything within 150 m of the player is meshed *and* the world has rendered a few frames.
- **World partition:** the worker first sends colliders, plants and the distant hills, then streams 64 m regions **nearest-first** (`meshVoxelWorld` + `voxelStream.ts`).
- **Cache:** production builds keep the finished world in **IndexedDB**, keyed by a hash of the site data plus `VOXEL_CODE_VERSION`. Repeat visits skip the build entirely. Bump the version when meshing or decoration code changes.
- **Distance culling:** plants beyond about 75 m and people and jaguars beyond 95 m are not drawn. Regions are frustum-culled, and the fog hides the far edge.

## Tech stack

Vite + React + TypeScript · Three.js via React Three Fiber and drei · Rapier physics via `@react-three/rapier` · `ecctrl` 2 character controller and touch joystick · zustand · `vite-plugin-pwa` (installable, works offline). The voxel engine is our own (`src/voxel/`), with no extra dependency.

## Voxel rendering

- **Blocks:** 0.5 m cubes, half of Minecraft's, so the stepped temples and stairs keep their proportions. Block types live in `src/voxel/blocks.ts`. The 16×16 textures are original pixel art generated in code (`textures.ts`), with three variants each. The shader picks a variant per block from a position hash, so surfaces never look tiled and greedy meshing still works.
- **Shader detail:** lawns get drifting lush/sunny patches. Walls get rain streaks, moss blotches and a damp base. Each tree gets its own green.
- **Life:**
  - Trees: giant ceibas with buttress roots and flat crowns, figs, and forest trees (`decorate.ts`).
  - Bushes along the bases of walls.
  - About 70k wind-swayed plant sprites: grass, ferns, flowers and heliconias. They're clumped, lusher at edges, sink away past about 75 m, and are grouped by region.
  - Flocks of scarlet macaws (`Macaws.tsx`).
- **Carved monuments** (`monumentArt.ts`): stelae and altars are drawn as relief height maps and shaded like stone, at the same pixel density. Each figure gets a feather headdress, face, ceremonial bar, apron and sandals, and the glyph columns get cartouches. Specific details come from the sources: macaw beaks on Stela B, a bearded back on Stela C, a jade-bead skirt on Stela H, a ballplayer yoke on Stelae 4 and F, full-figure glyphs on Stela D, and Altar Q's 16 seated rulers with its 36 top glyphs.
- **Character:** an explorer kid painted in pixel art: turquoise shirt with the flag's five stars, hat and backpack (`pixelModel.ts`).
- **Light:** real sun shadows (a shadow map that follows the player) on High quality, plus a painted cloud sky.
- **World:** `voxelWorld.ts` builds ground columns from the DEM, then rasterizes the site shapes from `buildGreybox.ts` into sparse 32³ chunks.
- **Meshing** (`mesher.ts`) runs in a **Web Worker**, so the game never freezes while it builds:
  - Greedy meshing merges same-looking faces into big quads.
  - Per-vertex ambient occlusion gives the soft corner shading.
  - Chunks are grouped into 64 m regions, one draw call each, frustum-culled.
- **Distant hills:** blocky 10 m / 20 m columns from the real DEM, with block trees. The city core has no trees, since it was cleared around 800 AD.
- **Shader** (`material.ts`): texture-array lookup with `textureGrad` (no seams between tiles), block-game face shading, sun + sky light, and distance fog. There are no real-time shadows.
- **Physics stays smooth:** collisions use the invisible colliders (smooth terrain trimesh, cuboids, stair ramp wedges), not the blocks. Walking and stair climbing stay fluid while everything looks blocky.

Current numbers (desktop, dev build):
- Build time: about 1.5 s.
- Near site: about 37k triangles. Everything including the hills: about 140k.
- Visible on screen: 110–155k triangles in about 30 draw calls.
- Phones get a smaller distant ring.

The ecctrl 2 API doesn't read the keyboard or move the camera itself. `src/player/Player.tsx` merges drei `KeyboardControls` and ecctrl's joystick and button stores into `setMovement()` every frame. `src/player/FollowCamera.tsx` is a custom orbit camera that casts a Rapier ray from the player to the camera, so the camera never clips through walls.

## Project layout

```
src/
  world/   siteData.ts (layout data), buildGreybox.ts, Greybox, Terrain, terrainData, Boundary, Environment
  player/  Player (ecctrl + input), FollowCamera, controls, playerState
  poi/     poiData.ts (info-card content + sources), PoiTracker, PoiMarkers
  ui/      Menu, Hud, Minimap, InfoCard, Credits, DebugOverlay, TouchControls
  i18n/    es.json (source of truth), en.json
scripts/   dem-to-heightmap.mjs, make-icons.mjs, lib/png.mjs
public/    terrain/ (heightmap), icons/
```

### Coordinates

Local meters with the origin at **Stela C** in the Great Plaza (OpenStreetMap node 3889488600, 14.8400755° N, 89.1420256° W): **x = east, z = south** (north is −z), y = up, and y = 0 is the Great Plaza floor (DEM elevation ≈ 608 m). The handoff's coordinate (14.8376, −89.1418) is actually Temple 11 on the Acropolis, about 270 m further south.

Structure positions are converted from OpenStreetMap with `x = (lon − lon0) × 107 696.6`, `z = −(lat − lat0) × 110 574`. All site positions and sizes live in `src/world/siteData.ts` and `src/poi/poiData.ts`, never in components.

## Terrain

`npm run heightmap` runs `scripts/dem-to-heightmap.mjs`:

1. It reads the **Copernicus GLO-30 DEM** tile `Copernicus_DSM_COG_10_N14_00_W090_00_DEM` straight from the public AWS bucket `copernicus-dem-30m` (no key needed). The file is a Cloud-Optimized GeoTIFF, so only the crop window is downloaded.
2. It resamples a **3 × 3 km** square around the origin onto a metric grid: 101 × 101 samples, **30 m per pixel**.
3. It writes three files to `public/terrain/`:
   - `copan-heightmap.png`: a 16-bit grayscale image (for Blender and inspection)
   - `copan-heightmap.bin`: the same samples as raw Uint16 little-endian. The game loads this file because browsers reduce 16-bit PNGs to 8 bits.
   - `copan-heightmap.json`: metadata and the scale.

**Scale:** `elevation_m = minElevation + value / 65535 × (maxElevation − minElevation)`. The game height is `elevation_m − datumElevation`. Row 0 is north and column 0 is west. The current crop spans 576.6–831.6 m, with the datum at 607.9 m.

At 30 m the DEM is too coarse for the site core, and it is a surface model that includes trees. So `terrainData.ts` flattens the core rectangle (`FLAT_CORE`) to y = 0 with a 120 m smooth falloff, then applies hand-sculpted areas (`TERRAIN_SCULPT`, e.g. the river channel under El Corte). The physics collider is an invisible trimesh of the same 20k-triangle grid; the visible ground is voxels. If the files are missing, a procedural valley is used instead.

For Blender: import the PNG as a Displace texture on a 3000 m plane subdivided 100 × 100, with strength = `maxElevation − minElevation`.

## Collisions

- Visual meshes and colliders are **separate**. Platforms, temples and monuments use cuboid colliders, and the terrain uses a trimesh.
- **Stairs:** the visual steps are decoration only. Each staircase gets one invisible convex-hull wedge. The wedge runs from the top edge to `(tiers + 1) × setback` out from it. That length clears every tier corner by `tierHeight / (tiers + 1)`; with a shorter run the capsule snags on the corners. The 62-step Hieroglyphic Stairway climbs smoothly (tested to the top, ~21 m).
- The character's walkable slope limit is set to 62°.
- Invisible boundary walls surround the playable area (`BOUNDS`), plus extra walls such as the El Corte cliff edge (`EXTRA_WALLS`).

## Performance (mobile first)

| Budget | Target | Current greybox |
| --- | --- | --- |
| Frame rate | 60 fps mid-range, ≥ 30 fps low-end | 165 fps (desktop, display-capped) |
| Draw calls | < 100 | **~30** |
| Triangles | < 300k | **110–155k visible** |
| Initial download | < 15 MB | **~1.2 MB gzip** (Rapier WASM included) |

- The menu loads first (~74 kB gzip). The 3D engine chunk is fetched while the player reads it.
- `dpr` is `[1, 1.5]` on High and `[0.75, 1]` on Low. drei's `PerformanceMonitor` drives the *Auto* setting; it ignores the first 4 s to avoid the shader-compile hitch.
- **Shadows on every device, split between two shadow maps by render layer** (`src/game/layers.tsx`):
  - **World (layer 2):** scenery and monuments. The time of day is fixed, so this map is effectively baked. It is redrawn only when the player has moved about 10 m (2048 on High, 1024 on Low).
  - **Characters (layer 1):** the player, people, animals and the ball. A small 16 m map follows the player and is redrawn every frame (1024 / 512). It's cheap because it only contains a handful of meshes.
- The voxel world is greedy-meshed in a Web Worker and grouped into regions (one draw call each). The POI markers and clouds are one InstancedMesh each.
- Physics runs at a fixed 60 Hz with interpolation. A variable timestep launched the floating character into the sky after the first long frame.
- ecctrl's character update runs once per physics step, not once per rendered frame: a small plugin in `vite.config.ts` moves its `useFrame` loop into `useBeforePhysicsStep`. Without it, on 120–165 Hz screens the hover spring ran several times per step (the kid bobbed and sank into the floor) and the jump shrank to a hop. Phones at 60 Hz didn't show it. Quick jump taps are held for 50 ms so a step always sees them.
- The flat core's terrain collider sits at y = 0, level with the voxel block tops.
- Ground-level platforms have foundations down to the terrain (`skirt` shapes plus a collider to the bottom of the world). Where the river bank dips under the Acropolis's east edge, the foundation shows layered fill (plaster floors, earth, rubble), like the real El Corte, instead of leaving a hollow.
- The river's animated texture cross-fades between frames; switching all frames at once made the water blink.
- A wooden post-and-rail fence marks the edge of the playable area (`src/world/Fence.tsx`, one merged mesh). It stands just inside the invisible boundary walls, joins the entrance gate, and leaves out the river channel (the walls still stop you there). Random trees keep 4 m clear of it.

To test on mobile: in Chrome DevTools, turn on device emulation (e.g. a Moto G-class phone), throttle the CPU 4–6×, use "Fast 4G", then open the debug panel (`F3`).

## Asset pipeline (Phase 2+)

1. **Model in Blender**, low-poly and stylized. In 800 AD the buildings were plastered and painted, mostly red with polychrome details (as on Rosalila), not grey ruins. Prefer flat or vertex colors over textures.
2. **Bake the lighting** (AO and sun) into vertex colors or a small lightmap, since there are no real-time shadows on mobile.
3. **Keep collision separate:** model simple `*_col` boxes and hulls, or reuse the greybox colliders. Don't use the visual mesh for collisions.
4. **Export glTF binary** (`.glb`), +Y up, with transforms applied. Set the origin with the same local coordinates as `siteData.ts`.
5. **Compress** with [`@gltf-transform/cli`](https://gltf-transform.dev/cli):
   ```bash
   npx @gltf-transform/cli optimize in.glb out.glb \
     --compress meshopt --texture-compress ktx2 --texture-size 1024 --simplify false
   # or step by step:
   npx @gltf-transform/cli meshopt in.glb tmp.glb
   npx @gltf-transform/cli etc1s tmp.glb out.glb   # KTX2/Basis (use uastc for normal maps)
   ```
6. **Load** with drei `useGLTF(url, /* draco */ false, /* meshopt */ true, (loader) => loader.setKTX2Loader(ktx2))`, with a shared `KTX2Loader` whose `setTranscoderPath` points at the Basis transcoder in `public/basis/`.
7. **Instancing and LODs:** trees, rocks and stelae go through drei `<Instances>` / `<Merged>`. Big temples get `<Detailed distances={[0, 80, 200]}>`.
8. **Streaming:** keep zones (Principal Group, the future Las Sepulturas) as separate GLBs, loaded lazily when the player nears them.

## Fact checking

All player-facing facts must be verifiable. Each POI in `src/poi/poiData.ts` has a `source`.

- **Dates** are rounded to the year, because published Gregorian dates differ by 1–4 days depending on the calendar correlation.
- **Positions** come from OpenStreetMap.
- **Published dimensions:**
  - Hieroglyphic Stairway: 62 steps, about 10 m wide, about 21 m high, facing west.
  - Temple 16: about 20 m above the West Court.
  - Ball court alley: about 28.4 × 7 m, running north–south.
- **Layout check:** compare `siteData.ts` with OpenStreetMap's traced walls (barrier=wall / building=ruins in the Main Group) over satellite imagery before adding or moving structures. Neither is enough alone: OSM's ball court outline was misleading, and the current Esri imagery is hazy here; the clearest is Esri World Imagery Wayback release 13968 (2024-03-28, dry season).
- **Estimates** (marked "est." in `siteData.ts`): the other heights and platform sizes, the Acropolis court height (12 m) and Altar Q's exact spot. Check them against the UNAH 2016 survey before the art pass.

- **Capuchin:** one of three wild primates in Honduras (with *Ateles geoffroyi* and *Alouatta palliata*): *Neotropical Primates* (2020), first record of *Cebus imitator* on Honduras' Pacific slope.
- **Villager facts:** Copador polychrome (Copán + El Salvador; used by villagers at Joya de Cerén): Alfaro Moisa 2011, *Cerámica polícroma Copador en El Salvador*. Copán's obsidian almost all from Ixtepeque, ~80 km away, imported as large flakes and nodules: Aoyama (Mesoweb Simposio 1999, 2009). Valley population ~20,000 in AD 750–800: Webster & Freter 1990, "Settlement history and the Classic collapse at Copán", *Latin American Antiquity*.

**Known simplifications:**
- On the 0.5 m grid, the Hieroglyphic Stairway shows about 46 block steps, not its real 62.
- El Corte is the present-day river cut. The game shows it even though the scene is set around 800 AD.
- Las Sepulturas is about 800 m **east** of the Principal Group according to OpenStreetMap (bearing ≈ 83°), not northeast as the handoff said. Published distances vary from 0.5 to 1.5 km.

## Credits and licensing

The in-game **Créditos** screen (`src/ui/creditsData.ts`) must stay in sync with this list.

**Used (with attribution)**
- Copán site plan (*CPN SITE PLAN 01*) by **Arjuno3**, after talk2winik, **CC BY-SA 3.0**: https://commons.wikimedia.org/wiki/File:CPN_SITE_PLAN_01_en.jpg. Also published on World History Encyclopedia (image 3513), which labels it CC BY-SA 4.0. The original Commons licence is 3.0.
- **Copernicus DEM GLO-30** (modified): produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved. Via AWS Open Data, `copernicus-dem-30m`.
- A. P. Maudslay, *Biologia Centrali-Americana: Archaeology* (1889–1902), **public domain**: https://biodiversitylibrary.org/item/106393
- OpenStreetMap data (structure and monument positions): © OpenStreetMap contributors, **ODbL 1.0**
- Pixelify Sans font by The Pixelify Sans Project Authors, **SIL OFL 1.1** (bundled via `@fontsource/pixelify-sans`): https://github.com/eifetx/Pixelify-Sans
- Maya day signs (tzolk'in) for the menu and loading background, from Wikimedia Commons: 19 signs by **Bluebalam**, **CC BY-SA 4.0**; Ok by CJLL Wright (vector by ExtendedPartition), **CC BY 2.5**. Kept as SVGs in `public/glyphs/` (per-file list in `public/glyphs/LICENSE.txt`) and drawn as pixel art at runtime by `src/ui/MayaBackground.tsx`; the adapted images are under the same licences.
- **PixelBlast** background from React Bits by David Haz, **MIT + Commons Clause** (copyright notice kept in `src/components/PixelBlast/PixelBlast.jsx`): https://reactbits.dev/backgrounds/pixel-blast. Added by hand instead of `npx shadcn add` (the project has no shadcn/Tailwind setup); one change: the canvas is created per effect run so it survives React StrictMode.
- Music: *Tiki Party* and *Field Day* (Main versions) from **Ovani Sound**'s Casual Music Pack Vol. 1; sound effects from Ovani Sound's Cozy Casual Sound FX Pack Vol. 2. **Ovani Sound royalty-free license** (https://ovanisound.com/policies/terms-of-service): used inside the game only, not redistributed as a pack. Converted from the packs' WAVs to 128 kbps MP3 with LAME (`lame -b 128 --cbr -q 2`) into `public/audio/`; the effect → file map is `SFX` in `src/audio/sound.ts`.
- Fact sources for the info cards: Wikipedia (CC BY-SA), Penn Museum *Expedition*, mayaruins.com, Uncovered History, ahutnick.github.io/copanaltarqkings, Mesoweb, Asociación Copán, and Sugiyama et al. 2018 (*PLOS ONE*). See `src/ui/creditsData.ts`.

**Reference only (copyrighted; not redistributed)**
- UNAH 2016 drone/GPS map update: https://www.camjol.info/index.php/CE/article/view/5729
- mayaruins.com Copán map: https://mayaruins.com/copan/copan_map.html
- Mused 3D scans: https://mused.com/copan/about
- T. Proskouriakoff, *An Album of Maya Architecture*; D. R. Holloway reconstructions: https://www.dennisrhollowayarchitect.com/Copan.html
- Rosalila colors: https://www.worldhistory.org/image/4066/rosalila-temple-copan/
- Rosalila replica photos: https://commons.wikimedia.org/wiki/File:CPN_Rosalila_01.jpg, https://commons.wikimedia.org/wiki/File:Rosalila_Temple.jpg, https://commons.wikimedia.org/wiki/File:Honduras-0385B_(4260008116).jpg
- Getty Hieroglyphic Stairway project: https://www.getty.edu/projects/maya-initiative/hieroglyphic-stairway-at-copan/

**Software:** three.js (MIT), React (MIT), pmndrs React Three Fiber / drei / react-three-rapier / ecctrl / zustand (MIT), Rapier (Apache-2.0), Vite (MIT), vite-plugin-pwa (MIT), geotiff.js (MIT).

Code license: not chosen yet.
