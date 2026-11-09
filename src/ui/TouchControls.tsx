import { Joystick, VirtualButton } from "ecctrl/input";
import { useT } from "../i18n";

// ecctrl's controls are position: fixed with no offsets, so place them here.
const joystickWrapper = {
  borderRadius: 0,
  left: "max(8px, env(safe-area-inset-left))",
  bottom: "max(16px, env(safe-area-inset-bottom))",
  width: "170px",
  height: "170px",
};
// Pixel look (see uiTextures.ts): dark inset base, wooden knob, jade jump button.
const pixel = { imageRendering: "pixelated" as const, borderRadius: 0, borderStyle: "solid", borderColor: "transparent" };
const joystickBase = {
  ...pixel,
  width: "120px",
  height: "120px",
  borderWidth: "10px",
  borderImage: "var(--ui-frame-in) 4 / 10px stretch",
  background: "var(--ui-slot) 0 0 / 40px 40px",
  opacity: 0.85,
};
const joystickKnob = {
  ...pixel,
  width: "60px",
  height: "60px",
  borderWidth: "8px",
  borderImage: "var(--ui-frame) 4 / 8px stretch",
  background: "var(--ui-wood) 0 0 / 32px 32px",
};
const buttonWrapper = {
  right: "max(24px, env(safe-area-inset-right))",
  bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 45px)",
  width: "84px",
  height: "84px",
  background: "transparent",
  borderRadius: 0,
};
const buttonCap = {
  ...pixel,
  width: "76px",
  height: "76px",
  borderWidth: "8px",
  borderImage: "var(--ui-frame) 4 / 8px stretch",
  background: "var(--ui-clay) 0 0 / 32px 32px",
  fontFamily: "inherit",
  fontSize: "16px",
  fontWeight: 700,
  color: "#fff1d2",
  textShadow: "var(--outline-clay)",
};

/** On-screen joystick (left) and jump button (right) for phones and tablets. */
export function TouchControls() {
  const t = useT();
  return (
    <>
      <Joystick
        joystickMaxRadius={55}
        joystickWrapperStyle={joystickWrapper}
        joystickBaseStyle={joystickBase}
        joystickKnobStyle={joystickKnob}
      />
      <VirtualButton id="jump" label={t("jump")} buttonWrapperStyle={buttonWrapper} buttonCapStyle={buttonCap} />
    </>
  );
}
