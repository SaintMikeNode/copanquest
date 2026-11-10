# Director: filming CopánQuest

A dev-only toolkit to film the game (trailers, social videos): smooth drone flights, orbits,
360° spins around the player, scripted walks, aimed photos, a clean frame without UI. It runs
on the **local dev server only** (`npm run dev`); it is not in the production build.

## Start

```bash
PATH="/opt/homebrew/opt/node@24/bin:$PATH" npm run dev -- --port 5180 --host 0.0.0.0
```

Open **http://localhost:5180/?director** (from a phone on the same Wi-Fi, use this computer's local IP address instead of `localhost`).
`?director` skips the bedroom and the tutorial, starts in the world at high quality, turns the
music off (sound effects stay; music is added in the edit), hides the "click to look" hint and
the place-description cards, and draws plants (grass, flowers) out to 260 m so aerial shots keep
their detail. Wait ~12 s for the world to build, then use
`window.cq` (same as `window.cqDirector`) from the console or from automation
(`page.evaluate`).

Phones and tablets: use real device emulation (mobile + touch, e.g. Playwright
`isMobile: true, hasTouch: true`, or Chrome DevTools device mode), not `?touch`: the phone layout
(map button, text boxes at the top, sideways layout) follows the browser's touch / orientation
media queries.

## API (`window.cq`)

All moves run in real time on the render clock and return promises, so `await` chains shots.
Coordinates: meters, x = east, z = south, y = up; origin at Stela C, Great Plaza floor y = 0,
Acropolis top y = 12. `cq.places` has named spots.

| Call | What it does |
| --- | --- |
| `cq.fly([{pos:[x,y,z], look:[x,y,z]}, …], seconds, ease?)` | Smooth flight through keyframes (Catmull-Rom). `ease`: `"inOut"` (default), `"in"`, `"out"`, `"linear"`. |
| `cq.orbit({center, radius, height, seconds, from, turns, lookHeight, ease})` | Circle around a point, looking at it. `from` in radians (0 = east), `turns` 1 = full circle. |
| `cq.orbitPlayer({radius, height, seconds, from, turns, ease})` | 360° around the player wherever they stand. |
| `cq.hold(pos, look)` / `cq.release()` | Park the camera / back to the normal third-person camera. |
| `cq.fov(deg)` | Lens for director shots (game camera: 60). 50–60 looks good. |
| `cq.place(x, y, z, [faceX, faceZ]?)` | Teleport the player (y can be a bit high: they fall), facing a point. |
| `cq.view(yaw, pitch?, dist?)` | Third-person view angles (pitch 0.35, distance 7 by default). |
| `cq.walkTo(x, z, {run?, timeout?})` | The player walks (or runs) to a point, view turned to follow. Stops when blocked. |
| `cq.photo({subject?, hold?})` | Explorer's camera: viewfinder, shutter, flash, "¡Nueva foto! …". With `subject` (`"rosalila"`, `"stela-c"`, `"macaw"`, a villager id…) it centers that first so the game recognizes it. |
| `cq.hud(true\|false)` | Show / hide every on-screen control (clean frame for aerials). |
| `cq.cards(true\|false)` | Show / hide the place-description cards (off with `?director`). |
| `cq.plants(meters)` | Grass and flowers draw distance (game: 75; `?director`: 260). |
| `cq.time(t)` / `cq.lens(on)` / `cq.quality("high")` | Time of day 0..1 (0.35 = bright morning), the time lens, graphics quality. |
| `cq.skipTutorial()`, `cq.wait(ms)` | |

### Ready-made shots (`cq.shots`)

| Shot | Length | What |
| --- | --- | --- |
| `hookAerial()` | 4.5 s | Drone rising over the Great Plaza's stelae and the ceiba, gliding toward the ball court. |
| `plazaDrone()` | 5 s | Low drone arc around Stela C and the plaza. |
| `ballCourtToStairway()` | 5 s | Down the ball court alley (macaw markers), up to the Hieroglyphic Stairway. |
| `acropolisOrbit()` | 7 s | Slow drone arc over the Acropolis and Temple 16. |
| `templeTop360()` | ~8.5 s | Player on top of Temple 11; the camera circles them 360°. |
| `photoStela()` | ~4 s | Player photographs Stela C (viewfinder, flash, "¡Nueva foto! Estela C · +18 XP"). |
| `rosalila()` | ~17 s | Through the torch-lit tunnel into Temple 16, around to Rosalila's painted façade, photo. |

Example (clean aerial, then gameplay with the HUD):

```js
cq.hud(false); cq.fov(55);
await cq.shots.hookAerial();
await cq.shots.ballCourtToStairway();
cq.release(); cq.hud(true);
await cq.shots.rosalila();
```

Notes: aerials hide the HUD, gameplay keeps it. Run each shot once as a rehearsal (the first run
compiles shaders and can stutter). Plazas are mown lawns on purpose (short grass), so most plant
detail shows on the edges and near the trails.
