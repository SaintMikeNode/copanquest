// macOS writes "._*" AppleDouble metadata files when the repo lives on an exFAT drive. In the
// build output the local Workers runtime would load "._index.js" as code and fail to start, so
// remove them after a local build (Cloudflare's Linux builds never produce them).
import { readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

function clean(dir) {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name.startsWith("._")) {
      rmSync(p, { force: true });
      n++;
    } else if (statSync(p).isDirectory()) n += clean(p);
  }
  return n;
}
try {
  const n = clean(".cloudflare/output");
  if (n) console.log(`removed ${n} AppleDouble files from .cloudflare/output`);
} catch {
  /* no output yet */
}
