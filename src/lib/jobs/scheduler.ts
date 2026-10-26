import type { JobSpec } from "./kinds";

/*
 * Job scheduler: a queue, a concurrency limit, retries with backoff, per-attempt timeouts and cancel.
 * It does not know how work runs; a Runner (a Web Worker in the browser, a plain function in tests) does that.
 * Cancelling a running job terminates its runner, so the work really stops.
 */

export type WorkerReply = {
  ok: boolean;
  result?: unknown;
  /** Time the worker spent computing, measured inside the worker. */
  busyMs?: number;
  units?: number;
  error?: string;
  /** A specification error: retrying cannot help. */
  fatal?: boolean;
  output?: { blob?: Blob; bytes?: number; type?: string; preview?: string };
};

export type Runner = {
  run(spec: JobSpec, onProgress: (f: number) => void): Promise<WorkerReply>;
  terminate(): void;
};

export type JobState = "queued" | "running" | "waiting" | "done" | "failed" | "cancelled";

export type Job = {
  id: number;
  spec: JobSpec;
  state: JobState;
  attempts: number;
  maxAttempts: number;
  timeoutMs: number;
  /** Fault drill: the first attempt fails on purpose, to show a retry. */
  drill: boolean;
  progress: number;
  queuedAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  /** Wall time of the successful (or last) attempt. */
  wallMs: number | null;
  busyMs: number | null;
  units: number | null;
  result: unknown;
  error: string | null;
  errors: string[];
  output: WorkerReply["output"] | null;
};

export type SubmitOptions = { maxAttempts?: number; timeoutMs?: number; drill?: boolean };

type Clock = { now(): number; setTimeout(fn: () => void, ms: number): unknown; clearTimeout(t: unknown): void };
const realClock: Clock = {
  now: () => (typeof performance !== "undefined" ? performance.timeOrigin + performance.now() : Date.now()),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (t) => clearTimeout(t as ReturnType<typeof setTimeout>),
};

export const BACKOFF_MS = 250;
export const MAX_CONCURRENCY = 16;

export class JobScheduler {
  private jobs: Job[] = [];
  private nextId = 1;
  private concurrency: number;
  private running = new Map<number, { runner: Runner; timer: unknown; attempt: number }>();
  private waits = new Map<number, unknown>();
  private listeners = new Set<(jobs: Job[]) => void>();
  private finished = new Set<(job: Job) => void>();

  constructor(
    private readonly makeRunner: () => Runner,
    opts: { concurrency?: number; clock?: Clock } = {},
  ) {
    this.concurrency = clampConcurrency(opts.concurrency ?? 2);
    this.clock = opts.clock ?? realClock;
  }
  private clock: Clock;

  get limit() {
    return this.concurrency;
  }

  setConcurrency(n: number) {
    this.concurrency = clampConcurrency(n);
    this.pump();
    this.emit();
  }

  list(): Job[] {
    return this.jobs.map((j) => ({ ...j }));
  }

  subscribe(fn: (jobs: Job[]) => void) {
    this.listeners.add(fn);
    fn(this.list());
    return () => void this.listeners.delete(fn);
  }

  /** Called once for every job that ends (done, failed or cancelled). */
  onFinished(fn: (job: Job) => void) {
    this.finished.add(fn);
    return () => void this.finished.delete(fn);
  }

  submit(spec: JobSpec, opts: SubmitOptions = {}): number {
    const job: Job = {
      id: this.nextId++,
      spec,
      state: "queued",
      attempts: 0,
      maxAttempts: Math.max(1, Math.min(5, Math.floor(opts.maxAttempts ?? 3))),
      timeoutMs: Math.max(1_000, Math.min(300_000, Math.floor(opts.timeoutMs ?? 60_000))),
      drill: Boolean(opts.drill),
      progress: 0,
      queuedAt: this.clock.now(),
      startedAt: null,
      finishedAt: null,
      wallMs: null,
      busyMs: null,
      units: null,
      result: null,
      error: null,
      errors: [],
      output: null,
    };
    this.jobs.push(job);
    this.pump();
    this.emit();
    return job.id;
  }

  cancel(id: number) {
    const job = this.jobs.find((j) => j.id === id);
    if (!job || job.state === "done" || job.state === "failed" || job.state === "cancelled") return false;
    const r = this.running.get(id);
    if (r) {
      this.clock.clearTimeout(r.timer);
      r.runner.terminate();
      this.running.delete(id);
    }
    const w = this.waits.get(id);
    if (w !== undefined) {
      this.clock.clearTimeout(w);
      this.waits.delete(id);
    }
    this.finish(job, "cancelled", "Cancelled.");
    this.pump();
    return true;
  }

  cancelAll() {
    for (const j of this.jobs) if (j.state === "queued" || j.state === "running" || j.state === "waiting") this.cancel(j.id);
  }

  /** Drops finished jobs from the live list (history keeps them). */
  clearFinished() {
    this.jobs = this.jobs.filter((j) => j.state === "queued" || j.state === "running" || j.state === "waiting");
    this.emit();
  }

  private pump() {
    while (this.running.size < this.concurrency) {
      const next = this.jobs.find((j) => j.state === "queued");
      if (!next) break;
      this.start(next);
    }
  }

  private start(job: Job) {
    job.state = "running";
    job.attempts += 1;
    job.progress = 0;
    const attempt = job.attempts;
    const started = this.clock.now();
    if (job.startedAt === null) job.startedAt = started;
    const runner = this.makeRunner();
    const timer = this.clock.setTimeout(() => {
      if (this.running.get(job.id)?.attempt !== attempt) return;
      runner.terminate();
      this.running.delete(job.id);
      this.failAttempt(job, `Attempt ${attempt} timed out after ${Math.round(job.timeoutMs / 1000)} s.`, false);
    }, job.timeoutMs);
    this.running.set(job.id, { runner, timer, attempt });
    const drill = job.drill && attempt === 1;
    const work: Promise<WorkerReply> = drill
      ? Promise.resolve({ ok: false, error: "Fault drill: attempt 1 failed on purpose." })
      : runner.run(job.spec, (f) => {
          if (this.running.get(job.id)?.attempt !== attempt) return;
          job.progress = Math.max(job.progress, Math.min(1, f));
          this.emit();
        });
    work
      .catch((e: unknown) => ({ ok: false, error: e instanceof Error ? e.message : String(e) }) as WorkerReply)
      .then((reply) => {
        const live = this.running.get(job.id);
        if (!live || live.attempt !== attempt) return; // cancelled or timed out meanwhile
        this.clock.clearTimeout(live.timer);
        this.running.delete(job.id);
        if (drill) runner.terminate();
        if (reply.ok) {
          job.wallMs = this.clock.now() - started;
          job.busyMs = reply.busyMs ?? null;
          job.units = reply.units ?? null;
          job.result = reply.result ?? null;
          job.output = reply.output ?? null;
          job.progress = 1;
          this.finish(job, "done", null);
        } else {
          job.wallMs = this.clock.now() - started;
          this.failAttempt(job, reply.error ?? "The job failed.", Boolean(reply.fatal));
        }
        this.pump();
      });
    this.emit();
  }

  private failAttempt(job: Job, message: string, fatal: boolean) {
    job.errors.push(message);
    if (!fatal && job.attempts < job.maxAttempts) {
      job.state = "waiting";
      job.error = message;
      const delay = BACKOFF_MS * 2 ** (job.attempts - 1);
      const t = this.clock.setTimeout(() => {
        this.waits.delete(job.id);
        if (job.state !== "waiting") return;
        job.state = "queued";
        this.pump();
        this.emit();
      }, delay);
      this.waits.set(job.id, t);
      this.emit();
      this.pump();
      return;
    }
    this.finish(job, "failed", message);
    this.pump();
  }

  private finish(job: Job, state: "done" | "failed" | "cancelled", error: string | null) {
    job.state = state;
    job.error = error;
    job.finishedAt = this.clock.now();
    const copy = { ...job };
    for (const fn of this.finished) fn(copy);
    this.emit();
  }

  private emit() {
    const snapshot = this.list();
    for (const fn of this.listeners) fn(snapshot);
  }
}

export function clampConcurrency(n: number) {
  return Math.max(1, Math.min(MAX_CONCURRENCY, Math.floor(Number.isFinite(n) ? n : 1)));
}
