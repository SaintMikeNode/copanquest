// Sound effects for game events, by watching the stores (so the game code doesn't need to know
// about sound). A few one-off sounds are played where they happen: jump (Player), ball hit
// (BallGame), rank up (questLogic), errors (GameUI). Mounted once in the HUD.
import { useEffect } from "react";
import { useGame } from "../state/useGame";
import { useProgress } from "../state/progress";
import { useAction } from "../game/WorldGame";
import { useCamera } from "../game/camera";
import { useLens } from "../game/lens";
import { play } from "./sound";

const doneCount = (q: Record<string, string>) => Object.values(q).filter((s) => s === "done").length;

export function AudioEvents() {
  useEffect(() => {
    const offs: (() => void)[] = [];
    const lastPoi = new Map<string, number>();

    offs.push(
      useGame.subscribe((s, p) => {
        if (s.overlay !== p.overlay) play(!p.overlay ? "open" : !s.overlay ? "close" : "page");
        if (s.dialogue && !p.dialogue) play("talk");
        else if (s.dialogue && p.dialogue && s.dialogue.line !== p.dialogue.line) play("line", { rate: 0.95 + Math.random() * 0.1 });
        if (s.activePoi && s.activePoi !== p.activePoi) {
          // Walking along the edge of a place can switch the card back and forth: once a minute is enough.
          const now = performance.now();
          if (now - (lastPoi.get(s.activePoi) ?? -1e9) > 60000) play("discover");
          lastPoi.set(s.activePoi, now);
        }
        if (s.jades.length > p.jades.length) play("jade");
      }),
    );

    offs.push(
      useProgress.subscribe((s, p) => {
        if (s.picked.length > p.picked.length) play("pickup", { rate: 0.95 + Math.random() * 0.1 });
        if (s.turkeys.length > p.turkeys.length) play("catch");
        if (s.ballScore > p.ballScore) play("score");
        if (s.solvedGlyphs.length > p.solvedGlyphs.length) play("place");
        if (doneCount(s.quests) > doneCount(p.quests)) play("quest");
        if (s.photos !== p.photos && Object.keys(s.photos).length > Object.keys(p.photos).length) play("photo");
      }),
    );

    // Digging: a scoop of dirt every ~0.4 s while the bar fills; a chime when the find pops up.
    let digTimer = 0;
    offs.push(
      useAction.subscribe((s, p) => {
        if (s.digging && !p.digging) {
          play("dig");
          digTimer = window.setInterval(() => play("dig", { rate: 0.9 + Math.random() * 0.2 }), 420);
        } else if (!s.digging && p.digging) {
          window.clearInterval(digTimer);
          digTimer = 0;
        }
        if (s.found && !p.found) play("found");
      }),
    );
    offs.push(() => window.clearInterval(digTimer));

    offs.push(
      useCamera.subscribe((s, p) => {
        if (s.active !== p.active) play(s.active ? "camera-on" : "camera-off");
        if (s.flash !== p.flash) play("shutter");
      }),
    );
    offs.push(useLens.subscribe((s, p) => void (s.on !== p.on && play("lens"))));

    const onRespawn = () => play("respawn");
    window.addEventListener("cq-respawn", onRespawn);
    offs.push(() => window.removeEventListener("cq-respawn", onRespawn));

    return () => offs.forEach((f) => f());
  }, []);
  return null;
}
