import { test } from "node:test";
import assert from "node:assert/strict";
import { JobScheduler, clampConcurrency, type Runner, type WorkerReply } from "./scheduler";
import { DEFAULT_SPECS } from "./kinds";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Runner whose behaviour each test scripts. */
function fakeRunners(script: (n: number) => Promise<WorkerReply>) {
  let made = 0;
  const terminated: number[] = [];
  const make = (): Runner => {
    const n = ++made;
    return { run: () => script(n), terminate: () => terminated.push(n) };
  };
  return { make, terminated, made: () => made };
}

test("respects the concurrency limit", async () => {
  let live = 0;
  let peak = 0;
  const f = fakeRunners(async () => {
    live++;
    peak = Math.max(peak, live);
    await wait(20);
    live--;
    return { ok: true, result: 1, busyMs: 5, units: 10 };
  });
  const s = new JobScheduler(f.make, { concurrency: 2 });
  for (let i = 0; i < 6; i++) s.submit(DEFAULT_SPECS.primes);
  await wait(200);
  assert.equal(peak, 2);
  assert.ok(s.list().every((j) => j.state === "done"));
});

test("retries a failing attempt, then succeeds", async () => {
  const f = fakeRunners(async (n) => (n === 1 ? { ok: false, error: "boom" } : { ok: true, result: "x" }));
  const s = new JobScheduler(f.make, { concurrency: 1 });
  const id = s.submit(DEFAULT_SPECS.primes, { maxAttempts: 3 });
  await wait(600);
  const j = s.list().find((x) => x.id === id)!;
  assert.equal(j.state, "done");
  assert.equal(j.attempts, 2);
  assert.deepEqual(j.errors, ["boom"]);
});

test("gives up after maxAttempts and never retries a fatal error", async () => {
  const f = fakeRunners(async () => ({ ok: false, error: "nope" }));
  const s = new JobScheduler(f.make, { concurrency: 1 });
  const id = s.submit(DEFAULT_SPECS.primes, { maxAttempts: 2 });
  await wait(600);
  assert.equal(s.list().find((x) => x.id === id)!.state, "failed");
  assert.equal(s.list().find((x) => x.id === id)!.attempts, 2);
  const g = fakeRunners(async () => ({ ok: false, error: "bad spec", fatal: true }));
  const t = new JobScheduler(g.make);
  const id2 = t.submit(DEFAULT_SPECS.primes, { maxAttempts: 5 });
  await wait(50);
  assert.equal(t.list().find((x) => x.id === id2)!.attempts, 1);
  assert.equal(t.list().find((x) => x.id === id2)!.state, "failed");
});

test("cancel terminates a running job and drops a queued one", async () => {
  const f = fakeRunners(() => new Promise(() => {}));
  const s = new JobScheduler(f.make, { concurrency: 1 });
  const a = s.submit(DEFAULT_SPECS.primes);
  const b = s.submit(DEFAULT_SPECS.primes);
  await wait(10);
  assert.equal(s.list().find((x) => x.id === a)!.state, "running");
  assert.ok(s.cancel(b));
  assert.ok(s.cancel(a));
  assert.deepEqual(f.terminated, [1]);
  assert.ok(s.list().every((j) => j.state === "cancelled"));
  assert.equal(s.cancel(a), false);
});

test("a timed-out attempt is terminated and retried", async () => {
  const f = fakeRunners((n) => (n === 1 ? new Promise(() => {}) : Promise.resolve({ ok: true, result: 2 })));
  const s = new JobScheduler(f.make, { concurrency: 1 });
  const id = s.submit(DEFAULT_SPECS.primes, { timeoutMs: 1_000, maxAttempts: 2 });
  await wait(1_500);
  const j = s.list().find((x) => x.id === id)!;
  assert.equal(j.state, "done");
  assert.deepEqual(f.terminated.includes(1), true);
});

test("fault drill fails attempt one only", async () => {
  const f = fakeRunners(async () => ({ ok: true, result: 1 }));
  const s = new JobScheduler(f.make, { concurrency: 1 });
  const finished: string[] = [];
  s.onFinished((j) => finished.push(j.state));
  s.submit(DEFAULT_SPECS.primes, { drill: true });
  await wait(500);
  const j = s.list()[0];
  assert.equal(j.state, "done");
  assert.equal(j.attempts, 2);
  assert.deepEqual(finished, ["done"]);
});

test("concurrency is clamped", () => {
  assert.equal(clampConcurrency(0), 1);
  assert.equal(clampConcurrency(99), 16);
  assert.equal(clampConcurrency(Number.NaN), 1);
});
