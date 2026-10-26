"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useJobs } from "@/components/jobs/JobsProvider";
import { ProofButton } from "@/components/jobs/ProofButton";
import { SpecForm } from "@/components/jobs/SpecForm";
import { ArrowUpRight, CheckIcon, CopyIcon, PlayIcon, StopIcon } from "@/components/site/Icons";
import { ledgerLive } from "@/config/contracts";
import { canonicalJson } from "@/lib/jobs/canonical";
import { DEFAULT_SPECS, KINDS, KIND_INFO, describeSpec, validateSpec, type JobKind, type JobSpec } from "@/lib/jobs/kinds";
import { formatMs, formatRate, type RunRecord } from "@/lib/jobs/metrics";
import type { Job, JobState } from "@/lib/jobs/scheduler";
import { decodeSpec, verifyLink } from "@/lib/jobs/share";

const STATE_LABEL: Record<JobState, string> = { queued: "Queued", running: "Running", waiting: "Retrying soon", done: "Done", failed: "Failed", cancelled: "Cancelled" };
const stateTag = (s: string) => (s === "done" ? "ok" : s === "failed" ? "bad" : s === "waiting" ? "warn" : "");

function useCopy() {
  const [done, setDone] = useState<string | null>(null);
  return {
    done,
    copy: async (key: string, text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setDone(key);
        setTimeout(() => setDone(null), 1500);
      } catch {
        // clipboard refused
      }
    },
  };
}

export function Runner({ initialKind, initialSpec }: { initialKind: JobKind | null; initialSpec: string | null }) {
  const { ready, jobs, history, settings, setSettings, submit, cancel, cancelAll, clearFinished, cores, outputs } = useJobs();
  const [specs, setSpecs] = useState<Record<JobKind, JobSpec>>(() => ({ ...DEFAULT_SPECS }));
  const [kind, setKind] = useState<JobKind>(initialKind ?? "hash");
  const [batch, setBatch] = useState(1);
  const [drill, setDrill] = useState(false);
  const { done: copied, copy } = useCopy();

  useEffect(() => {
    if (!initialSpec) return;
    const s = decodeSpec(initialSpec);
    if (!s) return;
    // A shared specification from the link replaces the defaults once, on arrival.
    /* eslint-disable react-hooks/set-state-in-effect */
    setSpecs((cur) => ({ ...cur, [s.kind]: s }));
    setKind(s.kind);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [initialSpec]);

  const spec = specs[kind];
  const problem = validateSpec(spec);
  const active = jobs.filter((j) => j.state === "queued" || j.state === "running" || j.state === "waiting");
  const running = jobs.filter((j) => j.state === "running").length;
  const recent = history.slice(0, 12);
  const maxConc = Math.max(4, Math.min(16, cores ?? 4));

  function queue() {
    if (problem) return;
    const n = Math.max(1, Math.min(20, Math.floor(batch) || 1));
    for (let i = 0; i < n; i++) submit(spec, { drill: drill && i === 0 });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
      <div className="min-w-0">
        <div role="tablist" aria-label="Workload" className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button key={k} type="button" role="tab" aria-selected={k === kind} className={`nm-btn h-9 ${k === kind ? "!border-[#8a8a8a] !bg-[#222]" : ""}`} onClick={() => setKind(k)} data-testid={`kind-${k}`}>
              {KIND_INFO[k].name}
            </button>
          ))}
        </div>
        <p className="nm-body mt-4 max-w-[640px]">{KIND_INFO[kind].detail}</p>

        <div className="mt-6 border-t border-line pt-6">
          <SpecForm spec={spec} onChange={(s) => setSpecs((cur) => ({ ...cur, [kind]: s }))} />
        </div>

        <div className="mt-6 grid gap-4 border-t border-line pt-6 sm:grid-cols-4">
          <div>
            <label className="nm-flabel" htmlFor="o-batch">
              Copies
            </label>
            <input id="o-batch" className="nm-field" type="number" min={1} max={20} value={batch} onChange={(e) => setBatch(Number(e.target.value))} />
          </div>
          <div>
            <label className="nm-flabel" htmlFor="o-att">
              Attempts
            </label>
            <select id="o-att" className="nm-field" value={settings.maxAttempts} onChange={(e) => setSettings({ maxAttempts: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="nm-flabel" htmlFor="o-to">
              Timeout
            </label>
            <select id="o-to" className="nm-field" value={settings.timeoutSec} onChange={(e) => setSettings({ timeoutSec: Number(e.target.value) })}>
              {[10, 30, 60, 120, 300].map((n) => (
                <option key={n} value={n}>
                  {n} s
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="nm-check pb-2">
              <input type="checkbox" checked={drill} onChange={(e) => setDrill(e.target.checked)} data-testid="drill" />
              Fault drill
            </label>
          </div>
        </div>
        <p className="nm-small mt-2">Fault drill makes the first attempt of the first copy fail on purpose, so you can watch a retry. It never changes the result.</p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" className="nm-btn primary lg" onClick={queue} disabled={Boolean(problem) || !ready} data-testid="queue">
            <PlayIcon /> Queue {Math.max(1, Math.min(20, Math.floor(batch) || 1)) > 1 ? `${Math.max(1, Math.min(20, Math.floor(batch) || 1))} jobs` : "job"}
          </button>
          <button type="button" className="nm-btn lg" onClick={() => copy("spec", canonicalJson(spec))} disabled={Boolean(problem)}>
            {copied === "spec" ? <CheckIcon /> : <CopyIcon />} {copied === "spec" ? "Copied" : "Copy specification"}
          </button>
          {problem ? (
            <span className="text-[13px] text-bad" data-testid="spec-problem">
              {problem}
            </span>
          ) : (
            <span className="nm-small">{describeSpec(spec)}</span>
          )}
        </div>

        <section className="mt-12" aria-labelledby="results-h">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
            <div>
              <h2 id="results-h" className="text-[20px] leading-7 font-medium">
                Recent runs
              </h2>
              <p className="nm-small mt-1">
                Kept in this browser. {ledgerLive() ? "Record a proof to put a run on Robinhood Chain." : "The job ledger is not deployed yet: proofs are practice signatures kept here."}
              </p>
            </div>
            <Link href="/dashboard" className="nm-btn">
              Cloud dashboard <ArrowUpRight />
            </Link>
          </div>
          {recent.length === 0 ? <p className="nm-body py-8">No runs yet. Queue a job and its result lands here.</p> : null}
          <ul data-testid="results">
            {recent.map((r) => (
              <ResultRow key={r.id} rec={r} blob={outputs.get(r.id) ?? null} copied={copied} copy={copy} />
            ))}
          </ul>
        </section>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start" aria-labelledby="queue-h">
        <div className="rounded-xl border border-line p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="queue-h" className="text-[16px] font-medium">
              Scheduler
            </h2>
            <span className="inline-flex items-center gap-2 text-[12px] text-muted">
              <span className={`nm-dot ${running ? "pulse" : "idle"}`} /> {running} running · {active.length - running} waiting
            </span>
          </div>
          <div className="mt-4">
            <label className="nm-flabel" htmlFor="o-conc">
              Run at once: {settings.concurrency}
            </label>
            <input id="o-conc" type="range" min={1} max={maxConc} value={Math.min(settings.concurrency, maxConc)} onChange={(e) => setSettings({ concurrency: Number(e.target.value) })} className="w-full accent-[#d4d4d4]" data-testid="concurrency" />
            <p className="nm-small mt-1">This device reports {cores ?? "an unknown number of"} logical cores.</p>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" className="nm-btn flex-1" onClick={cancelAll} disabled={active.length === 0} data-testid="cancel-all">
              <StopIcon /> Cancel all
            </button>
            <button type="button" className="nm-btn flex-1" onClick={clearFinished} disabled={jobs.length === active.length}>
              Clear finished
            </button>
          </div>
          <ul className="mt-4 flex max-h-[460px] flex-col gap-2 overflow-y-auto" data-testid="queue-list">
            {jobs.length === 0 ? <li className="nm-small py-2">The queue is empty.</li> : null}
            {[...jobs].reverse().map((j) => (
              <QueueItem key={j.id} job={j} onCancel={() => cancel(j.id)} />
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function QueueItem({ job, onCancel }: { job: Job; onCancel: () => void }) {
  const open = job.state === "queued" || job.state === "running" || job.state === "waiting";
  return (
    <li className="rounded-lg border border-line p-3" data-testid="queue-item" data-state={job.state}>
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[13px] font-medium">
          #{job.id} {KIND_INFO[job.spec.kind].name}
        </span>
        <span className={`nm-tag ${stateTag(job.state)}`}>{STATE_LABEL[job.state]}</span>
      </div>
      <div className="nm-bar mt-2">
        <span style={{ width: `${Math.round((job.state === "done" ? 1 : job.progress) * 100)}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[12px] text-muted">
        <span>
          attempt {job.attempts}/{job.maxAttempts}
          {job.wallMs !== null ? ` · ${formatMs(job.wallMs)}` : ""}
        </span>
        {open ? (
          <button type="button" className="text-[12px] text-fg underline underline-offset-2" onClick={onCancel} data-testid="cancel-job">
            Cancel
          </button>
        ) : null}
      </div>
      {job.errors.length ? <p className="mt-1 text-[11.5px] break-words text-warn">{job.errors[job.errors.length - 1]}</p> : null}
    </li>
  );
}

function ResultRow({ rec, blob, copied, copy }: { rec: RunRecord; blob: Blob | null; copied: string | null; copy: (k: string, t: string) => void }) {
  const unit = KIND_INFO[rec.kind].unit;
  const rate = rec.busyMs && rec.units ? (rec.units / rec.busyMs) * 1000 : null;
  const link = useMemo(() => (rec.state === "done" ? verifyLink(rec.spec) : null), [rec]);
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  return (
    <li className="border-b border-line py-5" data-testid="result-row" data-state={rec.state}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-medium">
            {KIND_INFO[rec.kind].name} <span className={`nm-tag ml-1 align-middle ${stateTag(rec.state)}`}>{STATE_LABEL[rec.state]}</span>
            {rec.attempts > 1 ? <span className="nm-tag warn ml-1 align-middle">{rec.attempts} attempts</span> : null}
          </p>
          <p className="nm-small mt-1">{rec.label}</p>
        </div>
        <div className="text-right text-[13px]">
          <p>{formatMs(rec.wallMs)} wall</p>
          <p className="text-muted">
            {formatMs(rec.busyMs)} busy · {formatRate(rate, unit)}
          </p>
        </div>
      </div>
      {rec.state === "done" ? (
        <>
          <ResultPreview rec={rec} />
          <dl className="mt-3 grid gap-1 font-mono text-[11.5px] text-muted">
            <div className="flex min-w-0 gap-2">
              <dt className="shrink-0">spec</dt>
              <dd className="m-0 min-w-0 truncate">{rec.specHash}</dd>
            </div>
            <div className="flex min-w-0 gap-2">
              <dt className="shrink-0">result</dt>
              <dd className="m-0 min-w-0 truncate" data-testid="result-hash">
                {rec.resultHash}
              </dd>
            </div>
          </dl>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ProofButton rec={rec} compact />
            {link ? (
              <Link href={link} className="nm-btn h-8 px-2.5 text-[13px]">
                Verify
              </Link>
            ) : null}
            <button type="button" className="nm-btn h-8 px-2.5 text-[13px]" onClick={() => copy(rec.id, canonicalJson(rec.spec))}>
              {copied === rec.id ? "Copied" : "Copy spec"}
            </button>
            {url ? (
              <a href={url} download={`nimro-${rec.kind}-${rec.id}.${blob?.type === "image/jpeg" ? "jpg" : "webp"}`} className="nm-btn h-8 px-2.5 text-[13px]" data-testid="download-output">
                Download {blob ? `(${Math.max(1, Math.round(blob.size / 1024))} KB)` : ""}
              </a>
            ) : null}
          </div>
        </>
      ) : rec.error ? (
        <p className="mt-2 text-[13px] text-bad">{rec.error}</p>
      ) : null}
    </li>
  );
}

function ResultPreview({ rec }: { rec: RunRecord }) {
  const r = rec.result as Record<string, unknown> | unknown[] | null;
  let text: string;
  if (rec.kind === "hash" && r && !Array.isArray(r)) text = `digest ${String(r.digest)}`;
  else if (rec.kind === "primes" && r && !Array.isArray(r)) text = `${Number(r.count).toLocaleString("en-US")} primes · largest ${Number(r.largest).toLocaleString("en-US")} · checksum ${String(r.checksum)}`;
  else if (rec.kind === "image" && r && !Array.isArray(r)) text = `${String(r.width)}×${String(r.height)} · pixels ${String(r.pixels).slice(0, 16)}…`;
  else text = JSON.stringify(r).slice(0, 260);
  return <p className="mt-2 rounded-md bg-[#111] px-3 py-2 font-mono text-[12px] break-all text-fg">{text}</p>;
}
