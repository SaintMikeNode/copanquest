import { useSound } from "../audio/sound";
import { useT } from "../i18n";

/** Music and sound-effect switches (same look as the language toggle). */
export function SoundToggle() {
  const t = useT();
  const { music, sfx, setMusic, setSfx } = useSound();
  return (
    <div className="lang-toggle sound-toggle" role="group">
      <button aria-pressed={music} onClick={() => setMusic(!music)} aria-label={t("sound.music")} title={t("sound.music")}>
        ♫
      </button>
      <button aria-pressed={sfx} onClick={() => setSfx(!sfx)} aria-label={t("sound.sfx")} title={t("sound.sfx")} data-silent={!sfx || undefined}>
        🔊
      </button>
    </div>
  );
}
