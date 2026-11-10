// "CopánQuest" for headings. Pixelify Sans draws the capital C almost closed, so it reads as an
// O: the first letter gets a notch cut on its right side (.title-c in styles.css; the CRT title
// screen does the same in room/Crt.tsx).
import { useT } from "../i18n";

export function GameTitle() {
  const t = useT();
  const title = t("title");
  if (!title.startsWith("C")) return <>{title}</>;
  return (
    <>
      <span className="title-c">C</span>
      {title.slice(1)}
    </>
  );
}
