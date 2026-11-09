// Worker for copanquest.todosenlaweb.com. Everything is static assets except /audio/*, which
// this Worker serves from the R2 bucket "copanquest-assets": the music and sound effects are
// licensed (Ovani Sound) for use in the game but may not be redistributed as loose files, so
// they are not in the public Git repo. Requests for /audio/* run this Worker first
// (assets.runWorkerFirst in cloudflare.config.ts); anything not in the bucket falls back to the
// built assets, so local dev and preview keep using the files in public/audio (git-ignored).

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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/audio/")) return env.ASSETS.fetch(request);
    if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405 });

    const key = decodeURIComponent(url.pathname.slice(1)); // "audio/music/tiki-party.mp3"
    const ranged = request.headers.has("range");
    const obj = await env.AUDIO.get(key, ranged ? { range: request.headers } : undefined);
    if (!obj) return env.ASSETS.fetch(request);

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    if (!headers.has("content-type")) headers.set("content-type", "audio/mpeg");
    headers.set("etag", obj.httpEtag);
    headers.set("accept-ranges", "bytes");
    headers.set("cache-control", "public, max-age=31536000, immutable");

    // Byte ranges: <audio> streams the music in pieces.
    if (ranged && obj.range) {
      const r = obj.range;
      const start = r.suffix !== undefined ? obj.size - r.suffix : (r.offset ?? 0);
      const length = r.suffix !== undefined ? r.suffix : (r.length ?? obj.size - start);
      headers.set("content-range", `bytes ${start}-${start + length - 1}/${obj.size}`);
      headers.set("content-length", String(length));
      return new Response(request.method === "HEAD" ? null : obj.body, { status: 206, headers });
    }
    headers.set("content-length", String(obj.size));
    return new Response(request.method === "HEAD" ? null : obj.body, { headers });
  },
};
