# CopánQuest branding

The logo is the game's icon (a stepped Maya pyramid on a sand tile, also `public/favicon.svg`)
and the **CopánQuest** wordmark in yellow with a dark red drop shadow, the same as the title
screen on the bedroom computer's CRT.

| File | What |
| --- | --- |
| `copanquest-icon.svg`, `-512.png`, `-1024.png` | Icon only |
| `copanquest-wordmark.svg` / `.png` | Wordmark only, transparent |
| `copanquest-logo-horizontal.svg` / `.png` | Icon left, wordmark right, transparent |
| `copanquest-logo-stacked.svg` / `.png` | Icon above wordmark, transparent |
| `copanquest-logo-dark.svg` / `.png` | Title card on dark jade with step frets and the tagline "Copán, Honduras · ca. 800 d. C." |
| `copanquest-logo-square.svg`, `.png` (2048), `-1024.png` | The same title card, square (profile pictures, app stores, social posts) |

The SVGs have the letters as outlines, so they open anywhere without the font. The transparent
versions are made for dark backgrounds (the yellow is light); on white, use the dark card.

## Colors

| | Hex |
| --- | --- |
| Wordmark yellow | `#f2c14e` |
| Wordmark shadow | `#7a1d10` |
| Pyramid red | `#b3402a` |
| Stair gold | `#e9b949` |
| Icon sand | `#f1d9a6` |
| Jade background | `#0d2a20` → `#06140f` |
| Fret green | `#1c4a36` |
| Tagline mint | `#9be3b5` |

## Type

[Pixelify Sans](https://github.com/eifetx/Pixelify-Sans) Bold (SIL Open Font License 1.1). Its
capital C is nearly closed and can read as an O, so the logo cuts a notch in the right side of
the C (the game does the same: `.title-c` in `src/styles.css`, `drawTitle` in `src/room/Crt.tsx`).

## Rebuilding

```bash
npm i --no-save opentype.js@1.3.4 && node branding/build-logo.mjs
```
