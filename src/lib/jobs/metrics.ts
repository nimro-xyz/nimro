import { KIND_IDS, describeSpec, resultHash, specHash, type JobKind, type JobSpec } from "./kinds";
import type { Job } from "./scheduler";

/*
 * Run history and the numbers the Cloud Dashboard shows. Everything here is measured on this device by this
 * browser; nothing is estimated or fetched from elsewhere.
 */

export type RunRecord = {
  id: string;
  kind: JobKind;
  label: string;
  state: "done" | "failed" | "cancelled";
  attempts: number;
  queuedMs: number;
  wallMs: number | null;
  busyMs: number | null;
  units: number | null;
  finishedAt: number;
  specHash: `0x${string}`;
  resultHash: `0x${string}` | null;
  error: string | null;
  /** Kept so the run can be repeated or verified (JSON input and file names included; never file bytes). */
  spec: JobSpec;
  /** Result summary as produced (small; large outputs are not kept). */
  result: unknown;
  /** On-chain record once sent: tx hash, or "practice:<signature>" for a practice proof. */
  proof?: { tx?: string; runId?: number; practice?: string; at: number };
};

export const HISTORY_CAP = 200;

export function toRecord(job: Job, now = Date.now()): RunRecord {
  const state = job.state === "done" || job.state === "failed" ? job.state : "cancelled";
  const res = state === "done" ? resultHash(job.spec.kind, job.result) : null;
  const small = state === "done" ? compactResult(job.result) : null;
  return {
    id: `${now.toString(36)}-${job.id}`,
    kind: job.spec.kind,
    label: describeSpec(job.spec),
    state,
    attempts: job.attempts,
    queuedMs: job.startedAt === null ? 0 : Math.max(0, job.startedAt - job.queuedAt),
    wallMs: job.wallMs === null ? null : Math.round(job.wallMs * 10) / 10,
    busyMs: job.busyMs === null ? null : Math.round(job.busyMs * 10) / 10,
    units: job.units,
    finishedAt: now,
    specHash: specHash(job.spec),
    resultHash: res,
    error: job.error,
    spec: job.spec,
    result: small,
  };
}

/** Keeps result summaries small enough for browser storage (a JSON transform can return a lot). */
export function compactResult(result: unknown): unknown {
  const text = JSON.stringify(result ?? null);
  if (text.length <= 4_000) return result;
  return { truncated: true, chars: text.length, preview: text.slice(0, 600) };
}

export function pushHistory(list: RunRecord[], rec: RunRecord): RunRecord[] {
  return [rec, ...list].slice(0, HISTORY_CAP);
}

export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

export type KindStats = { kind: JobKind; done: number; failed: number; avgMs: number | null; p95Ms: number | null; unitsPerSec: number | null };
export type Summary = {
  total: number;
  done: number;
  failed: number;
  cancelled: number;
  retried: number;
  avgWallMs: number | null;
  p95WallMs: number | null;
  busyMsTotal: number;
  /** busy time / wall time across successful runs: how much of a run was spent computing. */
  busyShare: number | null;
  avgQueueMs: number | null;
  proofs: number;
  byKind: KindStats[];
};

export function summarize(list: RunRecord[]): Summary {
  const done = list.filter((r) => r.state === "done");
  const walls = done.map((r) => r.wallMs).filter((v): v is number => v !== null);
  const busy = done.map((r) => r.busyMs ?? 0);
  const busyTotal = busy.reduce((a, b) => a + b, 0);
  const wallTotal = walls.reduce((a, b) => a + b, 0);
  const byKind = (Object.keys(KIND_IDS) as JobKind[]).map((kind) => {
    const ok = done.filter((r) => r.kind === kind);
    const w = ok.map((r) => r.wallMs).filter((v): v is number => v !== null);
    const units = ok.reduce((a, r) => a + (r.units ?? 0), 0);
    const b = ok.reduce((a, r) => a + (r.busyMs ?? 0), 0);
    return {
      kind,
      done: ok.length,
      failed: list.filter((r) => r.kind === kind && r.state === "failed").length,
      avgMs: w.length ? w.reduce((a, c) => a + c, 0) / w.length : null,
      p95Ms: percentile(w, 95),
      unitsPerSec: b > 0 ? units / (b / 1000) : null,
    };
  });
  const queues = list.filter((r) => r.state !== "cancelled" || r.attempts > 0).map((r) => r.queuedMs);
  return {
    total: list.length,
    done: done.length,
    failed: list.filter((r) => r.state === "failed").length,
    cancelled: list.filter((r) => r.state === "cancelled").length,
    retried: list.filter((r) => r.attempts > 1).length,
    avgWallMs: walls.length ? wallTotal / walls.length : null,
    p95WallMs: percentile(walls, 95),
    busyMsTotal: busyTotal,
    busyShare: wallTotal > 0 ? Math.min(1, busyTotal / wallTotal) : null,
    avgQueueMs: queues.length ? queues.reduce((a, b) => a + b, 0) / queues.length : null,
    proofs: list.filter((r) => r.proof).length,
    byKind,
  };
}

export function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return "—";
  if (ms < 1) return "<1 ms";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
  return `${Math.floor(ms / 60_000)} m ${Math.round((ms % 60_000) / 1000)} s`;
}

export function formatRate(perSec: number | null | undefined, unit: string): string {
  if (perSec === null || perSec === undefined || !Number.isFinite(perSec)) return "—";
  if (unit === "bytes") {
    const mb = perSec / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(mb >= 100 ? 0 : 1)} MiB/s` : `${(perSec / 1024).toFixed(0)} KiB/s`;
  }
  const abbreviate = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : n.toFixed(0));
  return `${abbreviate(perSec)} ${unit}/s`;
}
