import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMs, formatRate, percentile, pushHistory, summarize, toRecord, compactResult, HISTORY_CAP, type RunRecord } from "./metrics";
import { DEFAULT_SPECS } from "./kinds";
import type { Job } from "./scheduler";

const job = (over: Partial<Job>): Job => ({
  id: 1, spec: DEFAULT_SPECS.primes, state: "done", attempts: 1, maxAttempts: 3, timeoutMs: 60000, drill: false, progress: 1,
  queuedAt: 100, startedAt: 150, finishedAt: 400, wallMs: 250, busyMs: 200, units: 5_000_000, result: { count: 3 }, error: null, errors: [], output: null, ...over,
});

test("records carry hashes only for finished work", () => {
  const ok = toRecord(job({}));
  assert.match(ok.resultHash!, /^0x[0-9a-f]{64}$/);
  assert.equal(ok.queuedMs, 50);
  const bad = toRecord(job({ state: "failed", error: "x" }));
  assert.equal(bad.resultHash, null);
});

test("summary math", () => {
  let list: RunRecord[] = [];
  list = pushHistory(list, toRecord(job({ wallMs: 100, busyMs: 80 })));
  list = pushHistory(list, toRecord(job({ wallMs: 300, busyMs: 120, attempts: 2 })));
  list = pushHistory(list, toRecord(job({ state: "failed", wallMs: 10 })));
  const s = summarize(list);
  assert.equal(s.done, 2);
  assert.equal(s.failed, 1);
  assert.equal(s.retried, 1);
  assert.equal(s.avgWallMs, 200);
  assert.equal(s.p95WallMs, 300);
  assert.equal(s.busyShare, 0.5);
  const primes = s.byKind.find((k) => k.kind === "primes")!;
  assert.equal(primes.unitsPerSec, 10_000_000 / 0.2);
});

test("history is capped and results compacted", () => {
  let list: RunRecord[] = [];
  for (let i = 0; i < HISTORY_CAP + 5; i++) list = pushHistory(list, toRecord(job({ id: i })));
  assert.equal(list.length, HISTORY_CAP);
  const big = compactResult({ s: "x".repeat(10_000) }) as { truncated: boolean };
  assert.equal(big.truncated, true);
});

test("formatting", () => {
  assert.equal(percentile([], 95), null);
  assert.equal(percentile([1, 2, 3, 4], 50), 2);
  assert.equal(formatMs(null), "—");
  assert.equal(formatMs(1500), "1.50 s");
  assert.equal(formatRate(2 * 1024 * 1024, "bytes"), "2.0 MiB/s");
  assert.equal(formatRate(1500, "numbers"), "1.5K numbers/s");
});
