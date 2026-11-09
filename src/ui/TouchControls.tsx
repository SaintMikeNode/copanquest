import { Joystick, VirtualButton } from "ecctrl/input";
import { useT } from "../i18n";

// ecctrl's controls are position: fixed with no offsets, so place them here.
const joystickWrapper = {
  left: "max(8px, env(safe-area-inset-left))",
  bottom: "max(16px, env(safe-area-inset-bottom))",
  width: "170px",
  height: "170px",
};
const joystickBase = { width: "120px", height: "120px", background: "rgba(0,0,0,0.18)" };
const joystickKnob = { width: "60px", height: "60px" };
const buttonWrapper = {
  right: "max(24px, env(safe-area-inset-right))",
  bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 45px)",
  width: "84px",
  height: "84px",
  background: "rgba(0,0,0,0.18)",
};
const buttonCap = { width: "66px", height: "66px", fontSize: "14px", fontWeight: 700, color: "#8c2f1e" };

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
