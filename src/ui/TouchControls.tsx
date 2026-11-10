import { useEffect, useState } from "react";
import { Joystick, VirtualButton } from "ecctrl/input";
import { useT } from "../i18n";

/** A phone held sideways: short and wide (matches the landscape block at the end of styles.css). */
export const LANDSCAPE_PHONE = "(orientation: landscape) and (max-height: 540px)";

function useMedia(query: string) {
  const [on, setOn] = useState(() => typeof matchMedia === "function" && matchMedia(query).matches);
  useEffect(() => {
    const m = matchMedia(query);
    const update = () => setOn(m.matches);
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, [query]);
  return on;
}

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

// Sideways phones: smaller and lower, so the text boxes and the button row up top have room.
const joystickWrapperLandscape = { ...joystickWrapper, bottom: "max(8px, env(safe-area-inset-bottom))", width: "150px", height: "150px" };
const joystickBaseLandscape = { ...joystickBase, width: "104px", height: "104px" };
const joystickKnobLandscape = { ...joystickKnob, width: "52px", height: "52px" };
const buttonWrapperLandscape = { ...buttonWrapper, bottom: "max(12px, env(safe-area-inset-bottom))", width: "70px", height: "70px" };
const buttonCapLandscape = { ...buttonCap, width: "64px", height: "64px", fontSize: "14px" };

/** On-screen joystick (left) and jump button (right) for phones and tablets. */
export function TouchControls() {
  const t = useT();
  const land = useMedia(LANDSCAPE_PHONE);
  return (
    <>
      <Joystick
        // Remount on rotation so ecctrl picks up the new sizes.
        key={land ? "l" : "p"}
        joystickMaxRadius={land ? 46 : 55}
        joystickWrapperStyle={land ? joystickWrapperLandscape : joystickWrapper}
        joystickBaseStyle={land ? joystickBaseLandscape : joystickBase}
        joystickKnobStyle={land ? joystickKnobLandscape : joystickKnob}
      />
      <VirtualButton
        key={land ? "jl" : "jp"}
        id="jump"
        label={t("jump")}
        buttonWrapperStyle={land ? buttonWrapperLandscape : buttonWrapper}
        buttonCapStyle={land ? buttonCapLandscape : buttonCap}
      />
    </>
  );
}
