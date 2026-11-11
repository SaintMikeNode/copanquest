// The "Acerca de" video, playing "inside" the bedroom computer's monitor (same CRT frame as the
// menu): Spanish or English by the current language, switchable while it plays. Nothing is
// downloaded until the player asks for it: the <video> element is made when the CD is clicked
// (`prepareVideo`, so it buffers while the disc goes in and the camera zooms), with
// preload="auto" and a faststart MP4 that starts playing from its first bytes. Leaving drops the
// source, which stops the download.
//
// Files: public/video/about-{es,en}.mp4 locally (git-ignored); live, the R2 bucket
// "copanquest-assets" via worker/index.ts. Made from the 1080p masters with:
//   ffmpeg -i master.mp4 -vf "scale=-2:720,fps=30" -c:v libx264 -preset slow -crf 26 -profile:v high
//     -level 4.0 -pix_fmt yuv420p -maxrate 2000k -bufsize 4000k -c:a aac -b:a 96k -ac 2
//     -movflags +faststart about-es.mp4
import { useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";
import { useT } from "../i18n";
import { useGame } from "../state/useGame";
import { LangToggle } from "../ui/LangToggle";

const url = (lang: Lang) => `/video/about-${lang}.mp4`;

let pending: HTMLVideoElement | null = null;

/** Makes the video element and starts buffering (call from the click that opens it). */
export function prepareVideo(lang: Lang) {
  const v = document.createElement("video");
  v.className = "about-video";
  v.dataset.lang = lang;
  v.preload = "auto";
  v.playsInline = true;
  v.controls = true;
  v.src = url(lang);
  v.load();
  pending = v;
  return v;
}

function takeVideo(lang: Lang) {
  const v = pending?.dataset.lang === lang ? pending : prepareVideo(lang);
  pending = null;
  return v;
}

type State = "loading" | "playing" | "paused" | "blocked";

export function AboutVideo({ onBack }: { onBack: () => void }) {
  const t = useT();
  const lang = useGame((s) => s.lang);
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    const v = takeVideo(lang);
    video.current = v;
    box.current?.appendChild(v);
    setState("loading");
    const on = (type: string, fn: () => void) => v.addEventListener(type, fn);
    on("playing", () => setState("playing"));
    on("waiting", () => setState("loading"));
    on("pause", () => setState("paused"));
    // Browsers can refuse to start a video with sound without a fresh tap (iOS): show a play button.
    v.play().catch(() => setState("blocked"));
    return () => {
      v.pause();
      v.removeAttribute("src");
      v.load(); // stops the download
      v.remove();
      if (video.current === v) video.current = null;
    };
  }, [lang]);

  return (
    <div className="crt">
      <div className="crt-glass about-screen">
        <div ref={box} className="about-video-box" />
        {state === "loading" && <p className="about-status">{t("about.loading")}</p>}
        {state === "blocked" && (
          <button className="primary about-play" onClick={() => video.current?.play().catch(() => undefined)} aria-label={t("about.play")}>
            ▶
          </button>
        )}
        <button className="primary menu-back" onClick={onBack}>
          ◀ {t("back")}
        </button>
        <div className="menu-lang">
          <LangToggle />
        </div>
        <div className="crt-fx" aria-hidden="true" />
      </div>
    </div>
  );
}
