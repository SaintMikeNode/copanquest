import { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../state/useGame";
import { useL10n, useT, type L10n } from "../i18n";
import { binocularsUnlocked, computeXp, lensUnlocked, rankIndex, RANKS, useProgress, useXp } from "../state/progress";
import { requestCapture, useCamera } from "../game/camera";
import { SUBJECTS, SUBJECT_BY_ID } from "../game/subjects";
import { ARTIFACTS, GLYPH_NUMBERS, ITEM_NAMES, QUESTS, type Item } from "../game/gameData";
import { checkRankUp, questCheck } from "../game/questLogic";
import { mayaDate, dayClock } from "../game/time";
import { useLens } from "../game/lens";
import { Overlay } from "./Overlay";
import { ballHit, finishDig, useAction } from "../game/WorldGame";

// ---------------------------------------------------------------- HUD buttons + rank

export function HudButtons() {
  const t = useT();
  const toggleCamera = useCamera((s) => s.toggle);
  const camOn = useCamera((s) => s.active);
  const setOverlay = useGame((s) => s.setOverlay);
  const xp = useXp();
  const lensOn = useLens((s) => s.on);
  const toggleLens = useLens((s) => s.toggle);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyC") useCamera.getState().toggle();
      if (e.code === "KeyJ") useGame.getState().setOverlay(useGame.getState().overlay === "journal" ? null : "journal");
      if (e.code === "KeyT") clickLens();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const [fx, setFx] = useState(0);
  const clickLens = () => {
    if (!lensUnlocked(computeXp())) useGame.getState().showToast(t("lens.locked"));
    else {
      toggleLens();
      setFx(Date.now());
      useGame.getState().showToast(useLens.getState().on ? t("lens.past") : t("lens.present"));
    }
  };
  return (
    <div className="hud-buttons">
      {fx > 0 && <div key={fx} className="lens-fx" />}
      <button className={camOn ? "round on" : "round"} onClick={() => toggleCamera()} aria-label={t("camera")}>
        📷
      </button>
      <button className="round" onClick={() => setOverlay("journal")} aria-label={t("journal")}>
        📖
      </button>
      <button className={`round ${lensOn ? "on" : ""} ${lensUnlocked(xp) ? "" : "locked"}`} onClick={clickLens} aria-label={t("lens")}>
        ⏳
      </button>
    </div>
  );
}

export function RankChip() {
  const xp = useXp();
  const l = useL10n();
  const r = rankIndex(xp);
  const next = RANKS[r + 1];
  const pct = next ? ((xp - RANKS[r].xp) / (next.xp - RANKS[r].xp)) * 100 : 100;
  return (
    <span className="chip rank-chip">
      {l(RANKS[r].name)} · {xp}
      <span className="xpbar">
        <i style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}

export function MayaClock() {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 2000);
    return () => clearInterval(id);
  }, []);
  const d = useMemo(() => mayaDate(), []);
  const night = dayClock.night > 0.5;
  return (
    <span className="chip maya-clock" title={`${d.longCount} · ${d.tzolkin} · ${d.haab}`}>
      {night ? "☾" : "☀"} {d.tzolkin} · {d.haab} <small>{d.longCount}</small>
    </span>
  );
}

// ---------------------------------------------------------------- camera

export function CameraOverlay() {
  const t = useT();
  const l = useL10n();
  const active = useCamera((s) => s.active);
  const aim = useCamera((s) => s.aim);
  const zoom = useCamera((s) => s.zoom);
  const flash = useCamera((s) => s.flash);
  const xp = useXp();
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyF" || e.code === "Enter") shoot();
      if (e.code === "Escape") useCamera.getState().toggle(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  if (!active) return null;
  const subject = aim ? SUBJECT_BY_ID[aim] : null;
  function shoot() {
    const cam = useCamera.getState();
    cam.doFlash();
    const target = cam.aim;
    if (!target) {
      useGame.getState().showToast(t("photo.none"));
      return;
    }
    const before = rankIndex(computeXp());
    const had = !!useProgress.getState().photos[target];
    requestCapture((url) => {
      useProgress.getState().addPhoto(target, url);
      const name = SUBJECT_BY_ID[target]?.name;
      const lang = useGame.getState().lang;
      useGame.getState().showToast(had ? t("photo.again") : `📷 ${t("photo.new")} ${name ? name[lang] : ""} · +15 XP`);
      checkRankUp(before);
    });
  }
  return (
    <div className="viewfinder">
      <div key={flash} className="flash" />
      <i className="vf tl" />
      <i className="vf tr" />
      <i className="vf bl" />
      <i className="vf br" />
      <div className={subject ? "reticle on" : "reticle"} />
      <div className="vf-label">{subject ? l(subject.name) : t("photo.none")}</div>
      <div className="vf-controls">
        {binocularsUnlocked(xp) && (
          <button className="round" onClick={() => useCamera.getState().setZoom(!zoom)}>
            {zoom ? "1×" : "3×"}
          </button>
        )}
        <button className="shutter" onClick={shoot} aria-label="📷" />
        <button className="round" onClick={() => useCamera.getState().toggle(false)} aria-label={t("close")}>
          ✕
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- journal

function QuestsTab() {
  const t = useT();
  const l = useL10n();
  const states = useProgress((s) => s.quests);
  const items = useProgress((s) => s.items);
  const check = questCheck();
  const list = QUESTS.filter((q) => states[q.id]);
  return (
    <div className="journal-list">
      {list.length === 0 && <p className="muted">{t("quests.none")}</p>}
      {list.map((q) => {
        const [have, need] = q.progress(check);
        const done = states[q.id] === "done";
        return (
          <div key={q.id} className={done ? "quest done" : "quest"}>
            <strong>
              {done ? "✔ " : ""}
              {l(q.title)}
            </strong>
            <span>
              {l(q.goal)} {done ? "" : `(${Math.min(have, need)}/${need})`}
            </span>
          </div>
        );
      })}
      <h4>{t("inventory")}</h4>
      <p className="bag">
        {(Object.keys(ITEM_NAMES) as Item[])
          .filter((k) => (items[k] ?? 0) > 0)
          .map((k) => `${items[k]} × ${l(ITEM_NAMES[k])}`)
          .join(" · ") || "—"}
      </p>
    </div>
  );
}

function AlbumTab() {
  const t = useT();
  const l = useL10n();
  const photos = useProgress((s) => s.photos);
  const groups: [string, (typeof SUBJECTS)[number]["kind"]][] = [
    [t("album.animals"), "animal"],
    [t("album.people"), "person"],
    [t("album.monuments"), "monument"],
  ];
  return (
    <div>
      {groups.map(([title, kind]) => (
        <section key={kind}>
          <h4>
            {title} ({SUBJECTS.filter((s) => s.kind === kind && photos[s.id]).length}/{SUBJECTS.filter((s) => s.kind === kind).length})
          </h4>
          <div className="album">
            {SUBJECTS.filter((s) => s.kind === kind).map((s) => (
              <figure key={s.id} className={photos[s.id] ? "" : "locked"}>
                {photos[s.id] ? <img src={photos[s.id]} alt="" /> : <div className="silhouette">?</div>}
                <figcaption>
                  <strong>{photos[s.id] ? l(s.name) : "???"}</strong>
                  {photos[s.id] && <span>{l(s.fact)}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MuseumTab() {
  const t = useT();
  const l = useL10n();
  const found = useProgress((s) => s.artifacts);
  if (!found.length) return <p className="muted">{t("museum.empty")}</p>;
  return (
    <div className="journal-list">
      {ARTIFACTS.filter((a) => found.includes(a.id)).map((a) => (
        <div key={a.id} className="quest artifact">
          <i className="swatch" style={{ background: a.color }} />
          <div>
            <strong>{l(a.name)}</strong>
            <span>{l(a.fact)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RankTab() {
  const l = useL10n();
  const xp = useXp();
  const r = rankIndex(xp);
  return (
    <div className="journal-list">
      {RANKS.map((k, i) => (
        <div key={i} className={i <= r ? "quest done" : "quest"}>
          <strong>
            {i <= r ? "★ " : "☆ "}
            {l(k.name)} · {k.xp} XP
          </strong>
          <span>{l(k.reward)}</span>
        </div>
      ))}
    </div>
  );
}

export function Journal() {
  const t = useT();
  const [tab, setTab] = useState<"quests" | "album" | "museum" | "rank">("quests");
  return (
    <Overlay title={`📖 ${t("journal")}`} onClose={() => useGame.getState().setOverlay(null)}>
      <div className="journal">
        <nav className="tabs">
          {(["quests", "album", "museum", "rank"] as const).map((k) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
              {t(`tab.${k}`)}
            </button>
          ))}
        </nav>
        {tab === "quests" && <QuestsTab />}
        {tab === "album" && <AlbumTab />}
        {tab === "museum" && <MuseumTab />}
        {tab === "rank" && <RankTab />}
      </div>
    </Overlay>
  );
}

// ---------------------------------------------------------------- glyph puzzle (Maya numbers)

/** Draws a Maya numeral: dots (1) over bars (5); a shell for zero. */
function MayaNumber({ n }: { n: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const g = c.getContext("2d")!;
    g.fillStyle = "#d3cdb9";
    g.fillRect(0, 0, 32, 32);
    g.fillStyle = "#3a3328";
    if (n === 0) {
      // Shell
      g.fillRect(9, 12, 14, 8);
      g.fillRect(7, 14, 2, 4);
      g.fillRect(23, 14, 2, 4);
      g.fillStyle = "#d3cdb9";
      for (const x of [12, 16, 20]) g.fillRect(x, 14, 1, 4);
      return;
    }
    const bars = Math.floor(n / 5);
    const dots = n % 5;
    let y = 26;
    for (let b = 0; b < bars; b++) {
      g.fillRect(6, y - 3, 20, 3);
      y -= 5;
    }
    const w = dots * 5 - 2;
    for (let d = 0; d < dots; d++) g.fillRect(16 - w / 2 + d * 5, y - 3, 3, 3);
  }, [n]);
  return <canvas ref={ref} width={32} height={32} className="maya-number" />;
}

export function GlyphPuzzle() {
  const t = useT();
  const picked = useProgress((s) => s.picked);
  const solved = useProgress((s) => s.solvedGlyphs);
  const [msg, setMsg] = useState<string | null>(null);
  const pending = picked.filter((id) => id.startsWith("glyph-") && !solved.includes(id));
  const current = pending[0];
  const n = current ? GLYPH_NUMBERS[current] : 0;
  const options = useMemo(() => {
    const set = new Set([n]);
    for (const d of [5, 1, -1, -5, 2, 3]) if (set.size < 3 && n + d >= 0 && n + d <= 19) set.add(n + d);
    return [...set].sort(() => Math.random() - 0.5);
  }, [n, current]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Overlay title={`✍ ${t("glyphs.title")}`} onClose={() => useGame.getState().setOverlay(null)}>
      <div className="glyph-puzzle">
        {!current ? (
          <p>{t("glyphs.none")}</p>
        ) : (
          <>
            <MayaNumber n={n} />
            <p>
              <strong>{t("glyphs.q")}</strong>
            </p>
            <div className="options">
              {options.map((o) => (
                <button
                  key={o}
                  className="primary small"
                  onClick={() => {
                    if (o === n) {
                      const before = rankIndex(computeXp());
                      useProgress.getState().solveGlyph(current);
                      setMsg(t("glyphs.right"));
                      checkRankUp(before);
                    } else setMsg(`${t("glyphs.wrong")} ${t("glyphs.hint")}`);
                  }}
                >
                  {o}
                </button>
              ))}
            </div>
            <p className="muted">{t("glyphs.hint")}</p>
          </>
        )}
        {msg && <p className="glyph-msg">{msg}</p>}
      </div>
    </Overlay>
  );
}

export type { L10n };

// ---------------------------------------------------------------- dig / ball action prompt

const DIG_SECONDS = 2.2;

export function ActionPrompt() {
  const t = useT();
  const l = useL10n();
  const kind = useAction((s) => s.kind);
  const id = useAction((s) => s.id);
  const found = useAction((s) => s.found);
  const talk = useGame((s) => s.talkTarget);
  const [progress, setProgress] = useState(0);
  const timer = useRef<number | null>(null);
  const start = () => {
    if (kind === "ball") {
      ballHit.pending = true;
      return;
    }
    if (kind !== "dig" || timer.current !== null) return;
    const t0 = performance.now();
    timer.current = window.setInterval(() => {
      const k = (performance.now() - t0) / 1000 / DIG_SECONDS;
      setProgress(Math.min(1, k));
      if (k >= 1) {
        stop();
        if (id) finishDig(id);
      }
    }, 50);
  };
  const stop = () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    setProgress(0);
  };
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "KeyE" && !e.repeat && !useGame.getState().talkTarget) start();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "KeyE") stop();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  });
  if (found) {
    const a = ARTIFACTS.find((x) => x.id === found)!;
    return (
      <section className="dialogue found-card">
        <header>
          <h2>⛏ {t("dig.found")}</h2>
        </header>
        <div className="quest artifact">
          <i className="swatch" style={{ background: a.color }} />
          <div>
            <strong>{l(a.name)}</strong>
            <span>{l(a.fact)}</span>
          </div>
        </div>
        <footer>
          <span>+20 XP</span>
          <button className="primary small" onClick={() => useAction.getState().setFound(null)}>
            {t("close")} ▸
          </button>
        </footer>
      </section>
    );
  }
  if (!kind || talk) return null;
  return (
    <button
      className="talk-prompt action-prompt"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      style={{ ["--p" as string]: `${progress * 100}%` }}
    >
      <span className="talk-key">E</span> {kind === "dig" ? (progress > 0 ? t("dig.hold") : `⛏ ${t("dig")}`) : `🏐 ${t("hit")}`}
      {kind === "dig" && <i className="dig-bar" />}
    </button>
  );
}
