// Streams the voxel world from the worker (or the IndexedDB cache) to React.
import type { MeshData } from "./mesher";
import type { VoxelBase, VoxelMessage, VoxelRequest } from "./voxel.worker";
import { terrainPromise } from "../world/Terrain";
import { IS_TOUCH } from "../config";
import { BLOCKS, MONUMENTS, MOUNDS, PATHS, PLAYER_SPAWN } from "../world/siteData";
import { FIELDS, HOUSEHOLDS, LADDERS, STALLS } from "../world/villageData";

/** Bump when meshing/decoration code changes in a way the data hash can't see. */
const VOXEL_CODE_VERSION = 15;

export const voxelStats = { ms: 0, triangles: 0, nearTriangles: 0, plants: 0, cached: false };

const regions: MeshData[] = [];

/** Loading progress (0..1) and whether the area around the player is built. */
export const loadState = { progress: 0, ready: false };
const loadListeners = new Set<() => void>();
function setLoad(progress: number, ready = loadState.ready) {
  loadState.progress = progress;
  loadState.ready = ready;
  loadListeners.forEach((fn) => fn());
}
export const loadStore = {
  subscribe(fn: () => void) {
    loadListeners.add(fn);
    return () => void loadListeners.delete(fn);
  },
  getProgress: () => loadState.progress,
  getReady: () => loadState.ready,
};
const listeners = new Set<() => void>();
let resolveBase!: (b: VoxelBase) => void;
export const voxelPromise = new Promise<VoxelBase>((r) => (resolveBase = r));

export const regionStore = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => void listeners.delete(fn);
  },
  getSnapshot: () => regions.length,
  get: () => regions,
};

function addRegion(m: MeshData) {
  regions.push(m);
  listeners.forEach((fn) => fn());
}

function fnv(str: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

// ------------------------------------------------------------ IndexedDB cache (production)

const DB = "copanquest";
const STORE = "voxels";
function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function cacheGet<T>(key: string): Promise<T | undefined> {
  const db = await idb();
  return new Promise((res) => {
    const q = db.transaction(STORE).objectStore(STORE).get(key);
    q.onsuccess = () => res(q.result as T);
    q.onerror = () => res(undefined);
  });
}
async function cachePut(key: string, value: unknown) {
  const db = await idb();
  const tx = db.transaction(STORE, "readwrite");
  const st = tx.objectStore(STORE);
  st.clear(); // keep only the current world
  st.put(value, key);
}

interface Cached {
  base: VoxelBase;
  regions: MeshData[];
  stats: typeof voxelStats;
}

async function start() {
  setLoad(0.05);
  const grid = await terrainPromise;
  setLoad(0.1);
  const farExtent = IS_TOUCH ? 800 : 1000;
  const key =
    `v${VOXEL_CODE_VERSION}-` +
    fnv(JSON.stringify({ MOUNDS, BLOCKS, MONUMENTS, PATHS, HOUSEHOLDS, FIELDS, STALLS, LADDERS, farExtent, n: grid.heights.length, s: grid.heights[1234] }));
  const useCache = import.meta.env.PROD && typeof indexedDB !== "undefined";

  if (useCache) {
    try {
      const hit = await cacheGet<Cached>(key);
      if (hit) {
        Object.assign(voxelStats, hit.stats, { cached: true });
        resolveBase(hit.base);
        for (const m of hit.regions) addRegion(m);
        setLoad(1, true);
        return;
      }
    } catch {
      /* no cache — build */
    }
  }

  const worker = new Worker(new URL("./voxel.worker.ts", import.meta.url), { type: "module" });
  let base: VoxelBase | null = null;
  worker.onmessage = (e: MessageEvent<VoxelMessage>) => {
    const msg = e.data;
    if (msg.type === "base") {
      base = msg.base;
      voxelStats.plants = base.plants.reduce((n, p) => n + p.data.length / 4, 0);
      resolveBase(base);
      setLoad(0.3);
    } else if (msg.type === "region") addRegion(msg.mesh);
    else if (msg.type === "progress") {
      if (!loadState.ready) setLoad(Math.min(0.95, Math.max(loadState.progress, 0.3 + (msg.done / msg.total) * 2.2)));
    } else if (msg.type === "ready") setLoad(1, true);
    else {
      Object.assign(voxelStats, msg.stats);
      worker.terminate();
      if (useCache && base) cachePut(key, { base, regions, stats: { ...voxelStats } } satisfies Cached).catch(() => {});
    }
  };
  const req: VoxelRequest = {
    grid: { size: grid.size, spacing: grid.spacing, heights: grid.heights.slice() },
    farExtent,
    origin: [PLAYER_SPAWN[0], PLAYER_SPAWN[2]],
  };
  worker.postMessage(req);
}

void start();
