// Worker for copanquest.todosenlaweb.com. Everything is static assets except /audio/* and
// /video/*, which this Worker serves from the R2 bucket "copanquest-assets": the music and sound
// effects are licensed (Ovani Sound) for use in the game but may not be redistributed as loose
// files, so they are not in the public Git repo; the "Acerca de" videos are kept out of Git for
// their size (AboutVideo.tsx). Requests for /audio/* and /video/* run this Worker first
// (assets.runWorkerFirst in cloudflare.config.ts); anything not in the bucket falls back to the
// built assets, so local dev and preview keep using the files in public/audio and public/video
// (git-ignored).
//
// Edge cache: each audio file is kept in the Cloudflare data center's cache (Cache API) after
// its first read, so later players nearby get it without an R2 read (faster, and fewer billed
// R2 operations). The cache only works on the custom domain; on workers.dev / preview URLs and
// in local dev it does nothing and every request reads R2 as before.

interface R2Range {
  offset?: number;
  length?: number;
  suffix?: number;
}
interface R2ObjectBody {
  body: ReadableStream;
  size: number;
  httpEtag: string;
  range?: R2Range;
  writeHttpMetadata(headers: Headers): void;
}
interface R2Bucket {
  get(key: string, options?: { range?: Headers }): Promise<R2ObjectBody | null>;
}
interface Env {
  AUDIO: R2Bucket;
  ASSETS: { fetch(request: Request): Promise<Response> };
}
interface Ctx {
  waitUntil(promise: Promise<unknown>): void;
}
interface EdgeCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

const edgeCache = (): EdgeCache | null => (globalThis as unknown as { caches?: { default?: EdgeCache } }).caches?.default ?? null;

function audioHeaders(obj: R2ObjectBody, key: string): Headers {
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  if (!headers.has("content-type")) headers.set("content-type", key.endsWith(".mp4") ? "video/mp4" : "audio/mpeg");
  headers.set("etag", obj.httpEtag);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return headers;
}

/** Whole file from R2 as a 200 response. */
function fullResponse(obj: R2ObjectBody, key: string, head: boolean): Response {
  const headers = audioHeaders(obj, key);
  headers.set("content-length", String(obj.size));
  return new Response(head ? null : obj.body, { headers });
}

export default {
  async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/audio/") && !url.pathname.startsWith("/video/")) return env.ASSETS.fetch(request);
    if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405 });

    const head = request.method === "HEAD";
    const ranged = request.headers.has("range");
    const cache = edgeCache();
    // Cache key: the URL alone (no Range, no cookies), always as a GET.
    const cacheKey = new Request(url.toString(), { method: "GET" });

    // Cached copy. The cache answers a Range request itself (206) from the stored whole file;
    // if it ever hands back the whole file instead, read the range from R2 as before.
    if (cache && !head) {
      try {
        const hit = await cache.match(ranged ? new Request(url.toString(), { headers: { range: request.headers.get("range")! } }) : cacheKey);
        if (hit && (!ranged || hit.status === 206)) return hit;
      } catch {
        /* cache unavailable: fall through to R2 */
      }
    }

    const key = decodeURIComponent(url.pathname.slice(1)); // "audio/music/tiki-party.mp3"
    const obj = await env.AUDIO.get(key, ranged ? { range: request.headers } : undefined);
    if (!obj) return env.ASSETS.fetch(request);

    // Byte ranges: <audio> streams the music in pieces. Fill the cache with the whole file in the
    // background so the next pieces (and other players) come from the cache.
    if (ranged && obj.range) {
      if (cache && !head) {
        ctx.waitUntil(
          env.AUDIO.get(key)
            .then((whole) => (whole ? cache.put(cacheKey, fullResponse(whole, key, false)) : undefined))
            .catch(() => undefined),
        );
      }
      const r = obj.range;
      const start = r.suffix !== undefined ? obj.size - r.suffix : (r.offset ?? 0);
      const length = r.suffix !== undefined ? r.suffix : (r.length ?? obj.size - start);
      const headers = audioHeaders(obj, key);
      headers.set("content-range", `bytes ${start}-${start + length - 1}/${obj.size}`);
      headers.set("content-length", String(length));
      return new Response(head ? null : obj.body, { status: 206, headers });
    }

    const response = fullResponse(obj, key, head);
    if (cache && !head) ctx.waitUntil(cache.put(cacheKey, response.clone()).catch(() => undefined));
    return response;
  },
};
