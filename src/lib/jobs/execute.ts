import { toHex } from "./canonical";
import { fillBytes, mulberry32 } from "./prng";
import type { HashSpec, ImageSpec, JobSpec, JsonOp, JsonSpec, PrimesSpec } from "./kinds";
import { validateSpec } from "./kinds";

/*
 * The work itself, free of browser APIs except WebCrypto (present in workers and in Node), so it runs the same in
 * a Web Worker, on the verify page and in unit tests. Every function is deterministic: integer arithmetic only,
 * no Math.sin/exp (those may round differently between engines), no locale-dependent comparisons.
 */

export type Progress = (fraction: number) => void;
export type Outcome = { result: unknown; units: number; extra?: { pixels?: Uint8ClampedArray; width?: number; height?: number } };

/** Thrown for a specification that can never succeed (not retried by the scheduler). */
export class SpecError extends Error {
  readonly fatal = true;
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", data as unknown as ArrayBuffer));
}

export async function runHash(spec: HashSpec, progress: Progress = () => {}): Promise<Outcome> {
  const data = fillBytes(new Uint8Array(spec.sizeKiB * 1024), spec.seed);
  const buf = new Uint8Array(32 + data.length);
  buf.set(data, 32);
  let digest = new Uint8Array(32);
  for (let r = 0; r < spec.rounds; r++) {
    buf.set(digest, 0);
    digest = new Uint8Array(await sha256(buf));
    progress((r + 1) / spec.rounds);
  }
  return { result: { digest: toHex(digest), bytes: data.length, rounds: spec.rounds }, units: buf.length * spec.rounds };
}

export function runPrimes(spec: PrimesSpec, progress: Progress = () => {}): Outcome {
  const n = spec.limit;
  const composite = new Uint8Array(n + 1);
  composite[0] = 1;
  composite[1] = 1;
  const root = Math.floor(Math.sqrt(n));
  let nextReport = 0;
  for (let i = 2; i <= root; i++) {
    if (composite[i]) continue;
    for (let j = i * i; j <= n; j += i) composite[j] = 1;
    if (i >= nextReport) {
      progress((0.8 * i) / root);
      nextReport = i + Math.max(1, root >> 4);
    }
  }
  let count = 0;
  let largest = 0;
  let checksum = 0;
  for (let i = 2; i <= n; i++) {
    if (composite[i]) continue;
    count++;
    largest = i;
    checksum = (Math.imul(checksum, 31) + i) >>> 0;
  }
  progress(1);
  return { result: { limit: n, count, largest, checksum }, units: n };
}

/** A generated test picture: bands, a checker and rings, from integer arithmetic only. */
export function samplePixels(seed: number, width: number, height: number): Uint8ClampedArray {
  const rnd = mulberry32(seed);
  const px = new Uint8ClampedArray(width * height * 4);
  const base = [rnd() & 255, rnd() & 255, rnd() & 255];
  const cx = rnd() % width;
  const cy = rnd() % height;
  const cell = 16 + (rnd() % 48);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const ring = ((dx * dx + dy * dy) >> 9) & 63;
      const check = ((Math.floor(x / cell) + Math.floor(y / cell)) & 1) * 40;
      px[i] = (base[0] + ((x * 255) / width) * 0.6 + ring) & 255;
      px[i + 1] = (base[1] + ((y * 255) / height) * 0.6 + check) & 255;
      px[i + 2] = (base[2] + ring * 2 + check) & 255;
      px[i + 3] = 255;
    }
  }
  return px;
}

/** Bilinear resize in 16.16 fixed point, so every engine produces the same bytes. */
export function resizeBilinear(src: Uint8ClampedArray, sw: number, sh: number, dw: number, dh: number, progress: Progress = () => {}): Uint8ClampedArray {
  const out = new Uint8ClampedArray(dw * dh * 4);
  const xRatio = sw > 1 && dw > 1 ? Math.floor(((sw - 1) * 65536) / (dw - 1)) : 0;
  const yRatio = sh > 1 && dh > 1 ? Math.floor(((sh - 1) * 65536) / (dh - 1)) : 0;
  for (let y = 0; y < dh; y++) {
    const fy = y * yRatio;
    const y0 = Math.min(sh - 1, fy >>> 16);
    const y1 = Math.min(sh - 1, y0 + 1);
    const wy = fy & 0xffff;
    for (let x = 0; x < dw; x++) {
      const fx = x * xRatio;
      const x0 = Math.min(sw - 1, fx >>> 16);
      const x1 = Math.min(sw - 1, x0 + 1);
      const wx = fx & 0xffff;
      const a = (y0 * sw + x0) * 4;
      const b = (y0 * sw + x1) * 4;
      const c = (y1 * sw + x0) * 4;
      const d = (y1 * sw + x1) * 4;
      const o = (y * dw + x) * 4;
      for (let k = 0; k < 4; k++) {
        const top = src[a + k] * (65536 - wx) + src[b + k] * wx;
        const bottom = src[c + k] * (65536 - wx) + src[d + k] * wx;
        // top/bottom < 2^24; scale down before the second blend to stay inside exact double range.
        const t = Math.floor(top / 256);
        const bt = Math.floor(bottom / 256);
        out[o + k] = Math.floor((t * (65536 - wy) + bt * wy) / 16777216 + 0.5);
      }
    }
    if ((y & 31) === 0) progress(0.1 + (0.8 * y) / dh);
  }
  return out;
}

export async function runImage(spec: ImageSpec, source: Uint8ClampedArray | null, progress: Progress = () => {}): Promise<Outcome> {
  const s = spec.source;
  let pixels: Uint8ClampedArray;
  if (s.type === "sample") pixels = samplePixels(s.seed, s.width, s.height);
  else {
    if (!source || source.length !== s.width * s.height * 4) throw new SpecError("The chosen picture is not available. Choose the same file again.");
    pixels = source;
  }
  progress(0.1);
  const out = resizeBilinear(pixels, s.width, s.height, spec.width, spec.height, progress);
  const digest = toHex(await sha256(new Uint8Array(out.buffer, out.byteOffset, out.byteLength)));
  progress(1);
  return { result: { width: spec.width, height: spec.height, pixels: digest }, units: s.width * s.height, extra: { pixels: out, width: spec.width, height: spec.height } };
}

/* ---------- JSON transform ---------- */

function get(value: unknown, path: string): unknown {
  let cur: unknown = value;
  for (const part of path.split(".")) {
    if (cur === null || typeof cur !== "object" || !Object.hasOwn(cur as object, part)) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

const TYPE_ORDER = ["undefined", "object", "boolean", "number", "string"];
function compare(a: unknown, b: unknown): number {
  const ta = a === null ? "object" : typeof a;
  const tb = b === null ? "object" : typeof b;
  if (ta !== tb) return TYPE_ORDER.indexOf(ta) - TYPE_ORDER.indexOf(tb);
  if (ta === "number" || ta === "string" || ta === "boolean") return (a as number) < (b as number) ? -1 : (a as number) > (b as number) ? 1 : 0;
  return 0;
}

function test(v: unknown, cmp: Extract<JsonOp, { op: "filter" }>["cmp"], want: unknown): boolean {
  switch (cmp) {
    case "eq":
      return v === want;
    case "ne":
      return v !== want;
    case "gt":
      return typeof v === typeof want && compare(v, want) > 0;
    case "gte":
      return typeof v === typeof want && compare(v, want) >= 0;
    case "lt":
      return typeof v === typeof want && compare(v, want) < 0;
    case "lte":
      return typeof v === typeof want && compare(v, want) <= 0;
    case "contains":
      if (typeof v === "string") return typeof want === "string" && v.includes(want);
      if (Array.isArray(v)) return v.includes(want);
      return false;
  }
}

function setPath(target: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split(".");
  let cur = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = cur[parts[i]];
    if (next === null || typeof next !== "object" || Array.isArray(next)) cur[parts[i]] = {};
    cur = cur[parts[i]] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

export function runJson(spec: JsonSpec, progress: Progress = () => {}): Outcome {
  let data: unknown;
  try {
    data = JSON.parse(spec.input);
  } catch (e) {
    throw new SpecError(`The input is not valid JSON: ${(e as Error).message.slice(0, 120)}`);
  }
  if (!Array.isArray(data)) throw new SpecError("The input must be a JSON array of records.");
  const units = data.length;
  let cur: unknown = data;
  spec.ops.forEach((o, i) => {
    if (!Array.isArray(cur)) throw new SpecError(`Step ${i + 1} (${o.op}) needs a list, but the previous step produced a single value.`);
    const list = cur as unknown[];
    switch (o.op) {
      case "filter":
        cur = list.filter((r) => test(get(r, o.path), o.cmp, o.value));
        break;
      case "pick":
        cur = list.map((r) => {
          const out: Record<string, unknown> = {};
          for (const f of o.fields) {
            const v = get(r, f);
            if (v !== undefined) setPath(out, f, v);
          }
          return out;
        });
        break;
      case "sort":
        cur = list
          .map((r, idx) => ({ r, idx, k: get(r, o.path) }))
          .sort((a, b) => (o.dir === "asc" ? compare(a.k, b.k) : compare(b.k, a.k)) || a.idx - b.idx)
          .map((x) => x.r);
        break;
      case "limit":
        cur = list.slice(0, o.n);
        break;
      case "group": {
        const counts = new Map<string, number>();
        for (const r of list) {
          const v = get(r, o.path);
          const key = v === undefined ? "(missing)" : typeof v === "string" ? v : JSON.stringify(v);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        cur = [...counts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
        break;
      }
      case "sum": {
        let sum = 0;
        let counted = 0;
        for (const r of list) {
          const v = get(r, o.path);
          if (typeof v === "number" && Number.isFinite(v)) {
            sum += v;
            counted++;
          }
        }
        cur = { field: o.path, sum, counted, of: list.length };
        break;
      }
    }
    progress((i + 1) / Math.max(1, spec.ops.length));
  });
  return { result: cur, units };
}

/** Runs any job specification. `imageSource` carries the decoded pixels of an uploaded picture. */
export async function execute(spec: JobSpec, progress: Progress = () => {}, imageSource: Uint8ClampedArray | null = null): Promise<Outcome> {
  const bad = validateSpec(spec);
  if (bad) throw new SpecError(bad);
  switch (spec.kind) {
    case "hash":
      return runHash(spec, progress);
    case "primes":
      return runPrimes(spec, progress);
    case "image":
      return runImage(spec, imageSource, progress);
    case "json":
      return runJson(spec, progress);
  }
}
