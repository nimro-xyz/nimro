import { fingerprint } from "./canonical";

/*
 * The four workload kinds Nimro runs today. A job specification is plain data: it fully decides the result, so
 * anyone holding the same specification (and, for an uploaded image, the same file) can rerun it and compare.
 */

export const KIND_IDS = { hash: 1, primes: 2, image: 3, json: 4 } as const;
export type JobKind = keyof typeof KIND_IDS;
export const KINDS = Object.keys(KIND_IDS) as JobKind[];

export type HashSpec = { v: 1; kind: "hash"; sizeKiB: number; rounds: number; seed: number };
export type PrimesSpec = { v: 1; kind: "primes"; limit: number };
export type ImageSource = { type: "sample"; seed: number; width: number; height: number } | { type: "file"; sha256: string; width: number; height: number; name: string };
export type ImageSpec = { v: 1; kind: "image"; source: ImageSource; width: number; height: number; format: "webp" | "jpeg"; quality: number };
export type JsonOp =
  | { op: "filter"; path: string; cmp: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "contains"; value: string | number | boolean | null }
  | { op: "pick"; fields: string[] }
  | { op: "sort"; path: string; dir: "asc" | "desc" }
  | { op: "limit"; n: number }
  | { op: "group"; path: string }
  | { op: "sum"; path: string };
export type JsonSpec = { v: 1; kind: "json"; input: string; ops: JsonOp[] };
export type JobSpec = HashSpec | PrimesSpec | ImageSpec | JsonSpec;

export const LIMITS = {
  hashKiB: { min: 1, max: 65_536 },
  hashRounds: { min: 1, max: 64 },
  primes: { min: 1_000, max: 20_000_000 },
  imageSide: { min: 8, max: 4_096 },
  imageSource: { max: 4_096 },
  jsonInput: 65_536,
  jsonOps: 12,
};

export type KindInfo = { kind: JobKind; name: string; summary: string; unit: string; detail: string };

export const KIND_INFO: Record<JobKind, KindInfo> = {
  hash: {
    kind: "hash",
    name: "SHA-256 hashing",
    summary: "Seeded data block, chained SHA-256 rounds",
    unit: "bytes",
    detail: "Generates a data block from a seed, then hashes it round after round, each round feeding the last digest back in. Pure CPU and memory bandwidth.",
  },
  primes: {
    kind: "primes",
    name: "Prime sieve",
    summary: "Sieve of Eratosthenes up to a limit",
    unit: "numbers",
    detail: "Marks every composite number up to the limit and reports how many primes remain, the largest one and a checksum of all of them.",
  },
  image: {
    kind: "image",
    name: "Image resize and compress",
    summary: "Bilinear resize, then WebP or JPEG encode",
    unit: "pixels",
    detail: "Resizes a generated sample or a picture you choose with a bilinear filter written in plain code, then compresses the result in the browser. The proof covers the resized pixels.",
  },
  json: {
    kind: "json",
    name: "JSON transform",
    summary: "Filter, pick, sort, group and sum records",
    unit: "records",
    detail: "Parses a JSON array and runs a short pipeline of operations over it. Nothing is evaluated as code: each step is one of six fixed operations.",
  },
};

const int = (v: unknown) => typeof v === "number" && Number.isInteger(v);
const inRange = (v: unknown, r: { min: number; max: number }) => int(v) && (v as number) >= r.min && (v as number) <= r.max;
const PATH = /^[A-Za-z0-9_$-]{1,40}(\.[A-Za-z0-9_$-]{1,40}){0,4}$/;

/** Returns the reason a specification cannot run, or null when it is valid. */
export function validateSpec(spec: JobSpec): string | null {
  if (!spec || spec.v !== 1) return "Unknown specification version.";
  switch (spec.kind) {
    case "hash":
      if (!inRange(spec.sizeKiB, LIMITS.hashKiB)) return `Block size must be ${LIMITS.hashKiB.min} to ${LIMITS.hashKiB.max} KiB.`;
      if (!inRange(spec.rounds, LIMITS.hashRounds)) return `Rounds must be ${LIMITS.hashRounds.min} to ${LIMITS.hashRounds.max}.`;
      if (!int(spec.seed) || spec.seed < 0 || spec.seed > 0xffffffff) return "Seed must be a whole number from 0 to 4294967295.";
      return null;
    case "primes":
      if (!inRange(spec.limit, LIMITS.primes)) return `Limit must be ${LIMITS.primes.min.toLocaleString("en-US")} to ${LIMITS.primes.max.toLocaleString("en-US")}.`;
      return null;
    case "image": {
      const s = spec.source;
      if (!s || (s.type !== "sample" && s.type !== "file")) return "Choose a sample or a file.";
      if (!inRange(s.width, { min: 1, max: LIMITS.imageSource.max }) || !inRange(s.height, { min: 1, max: LIMITS.imageSource.max })) return `The source image may be at most ${LIMITS.imageSource.max} px on each side.`;
      if (s.type === "sample" && (!int(s.seed) || s.seed < 0 || s.seed > 0xffffffff)) return "Sample seed must be a whole number from 0 to 4294967295.";
      if (s.type === "file" && !/^[0-9a-f]{64}$/.test(s.sha256)) return "The file fingerprint is missing.";
      if (!inRange(spec.width, LIMITS.imageSide) || !inRange(spec.height, LIMITS.imageSide)) return `Output must be ${LIMITS.imageSide.min} to ${LIMITS.imageSide.max} px on each side.`;
      if (spec.format !== "webp" && spec.format !== "jpeg") return "Format must be WebP or JPEG.";
      if (typeof spec.quality !== "number" || spec.quality < 0.1 || spec.quality > 1) return "Quality must be between 0.1 and 1.";
      return null;
    }
    case "json": {
      if (typeof spec.input !== "string" || spec.input.length === 0) return "Paste a JSON array.";
      if (spec.input.length > LIMITS.jsonInput) return `Input is limited to ${LIMITS.jsonInput.toLocaleString("en-US")} characters.`;
      if (!Array.isArray(spec.ops) || spec.ops.length > LIMITS.jsonOps) return `Use up to ${LIMITS.jsonOps} operations.`;
      for (const o of spec.ops) {
        if (o.op === "filter" || o.op === "sort" || o.op === "group" || o.op === "sum") {
          if (typeof o.path !== "string" || !PATH.test(o.path)) return `"${String((o as { path?: unknown }).path).slice(0, 40)}" is not a field path (letters, digits, dots).`;
        }
        if (o.op === "pick" && (!Array.isArray(o.fields) || o.fields.length === 0 || o.fields.length > 20 || !o.fields.every((f) => typeof f === "string" && PATH.test(f)))) return "Pick needs 1 to 20 field paths.";
        if (o.op === "limit" && (!int(o.n) || o.n < 1 || o.n > 10_000)) return "Limit must be 1 to 10,000.";
        if (o.op === "filter" && !["eq", "ne", "gt", "gte", "lt", "lte", "contains"].includes(o.cmp)) return "Unknown comparison.";
        if (o.op === "sort" && o.dir !== "asc" && o.dir !== "desc") return "Sort direction must be asc or desc.";
        if (!["filter", "pick", "sort", "limit", "group", "sum"].includes(o.op)) return "Unknown operation.";
      }
      return null;
    }
    default:
      return "Unknown job kind.";
  }
}

export const specHash = (spec: JobSpec) => fingerprint(spec);
export const resultHash = (kind: JobKind, result: unknown) => fingerprint({ v: 1, kind, result });

/** Default specifications, sized to finish in about a second on a recent laptop. */
export const DEFAULT_SPECS: Record<JobKind, JobSpec> = {
  hash: { v: 1, kind: "hash", sizeKiB: 4_096, rounds: 8, seed: 20261024 },
  primes: { v: 1, kind: "primes", limit: 5_000_000 },
  image: { v: 1, kind: "image", source: { type: "sample", seed: 7, width: 2_400, height: 1_600 }, width: 640, height: 427, format: "webp", quality: 0.8 },
  json: {
    v: 1,
    kind: "json",
    input: JSON.stringify(
      [
        { id: 1, region: "east", status: "done", ms: 412 },
        { id: 2, region: "west", status: "failed", ms: 95 },
        { id: 3, region: "east", status: "done", ms: 233 },
        { id: 4, region: "north", status: "done", ms: 780 },
        { id: 5, region: "west", status: "done", ms: 151 },
        { id: 6, region: "east", status: "queued", ms: 0 },
      ],
      null,
      1,
    ),
    ops: [
      { op: "filter", path: "status", cmp: "eq", value: "done" },
      { op: "sort", path: "ms", dir: "desc" },
      { op: "pick", fields: ["id", "region", "ms"] },
    ],
  },
};

/** One short line describing a specification, for tables and logs. */
export function describeSpec(spec: JobSpec): string {
  switch (spec.kind) {
    case "hash":
      return `${spec.sizeKiB.toLocaleString("en-US")} KiB × ${spec.rounds} rounds · seed ${spec.seed}`;
    case "primes":
      return `primes up to ${spec.limit.toLocaleString("en-US")}`;
    case "image":
      return `${spec.source.type === "sample" ? `sample ${spec.source.width}×${spec.source.height}` : `${spec.source.name.slice(0, 24)} ${spec.source.width}×${spec.source.height}`} → ${spec.width}×${spec.height} ${spec.format.toUpperCase()} q${Math.round(spec.quality * 100)}`;
    case "json":
      return `${spec.input.length.toLocaleString("en-US")} chars · ${spec.ops.length} step${spec.ops.length === 1 ? "" : "s"}`;
  }
}
