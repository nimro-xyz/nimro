"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useJobs } from "@/components/jobs/JobsProvider";
import { useChain } from "@/components/providers/ChainProvider";
import { useWallet } from "@/components/wallet/WalletProvider";
import { ArrowUpRight } from "@/components/site/Icons";
import { CHAIN, explorerAddress, shortAddress } from "@/config/brand";
import { CONTRACTS, ledgerLive } from "@/config/contracts";
import { KIND_INFO } from "@/lib/jobs/kinds";
import { formatMs, formatRate, summarize, type RunRecord } from "@/lib/jobs/metrics";
import { latestRuns, runsByRunner, type LedgerRun } from "@/lib/ledger";
import { ago, usd } from "@/lib/format";

function Tile({ label, value, sub, testid }: { label: string; value: string; sub?: string; testid?: string }) {
  return (
    <div className="min-w-0 border-t border-line pt-4">
      <p className="nm-label">{label}</p>
      <p className="mt-2 truncate text-[26px] leading-8 font-medium tracking-tight" data-testid={testid}>
        {value}
      </p>
      {sub ? <p className="nm-small mt-1">{sub}</p> : null}
    </div>
  );
}

/** Wall time of the newest runs, oldest on the left. One series; failed runs drawn as a short outline mark. */
function Timeline({ runs }: { runs: RunRecord[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const list = runs.slice(0, 40).reverse();
  if (!list.length) return <p className="nm-body py-6">No runs in this browser yet.</p>;
  const max = Math.max(...list.map((r) => r.wallMs ?? 0), 1);
  const W = 720;
  const H = 160;
  const gap = 2;
  const bw = Math.max(9, (W - gap * (list.length - 1)) / list.length);
  const cur = hover === null ? null : list[hover];
  return (
    <figure className="m-0" data-testid="timeline">
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-[160px] w-full" role="img" aria-label={`Wall time of the last ${list.length} runs, longest ${formatMs(max)}`} preserveAspectRatio="none" onMouseLeave={() => setHover(null)}>
          <line x1="0" x2={W} y1={H - 0.5} y2={H - 0.5} stroke="#2e2e2e" strokeWidth="1" />
          <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="#1c1c1c" strokeWidth="1" strokeDasharray="3 4" />
          {list.map((r, i) => {
            const x = i * (bw + gap);
            const ok = r.state === "done";
            const h = ok ? Math.max(8, ((r.wallMs ?? 0) / max) * (H - 8)) : 10;
            return (
              <g key={r.id} onMouseEnter={() => setHover(i)}>
                <rect x={x} y={0} width={bw + gap} height={H} fill="transparent" />
                {ok ? (
                  <path d={`M${x},${H} v${-(h - 4)} q0,-4 4,-4 h${bw - 8} q4,0 4,4 v${h - 4} z`} fill={hover === i ? "#ffffff" : "#bdbdbd"} />
                ) : (
                  <rect x={x + 0.5} y={H - h + 0.5} width={bw - 1} height={h - 1} rx="2" fill="none" stroke="#f87171" strokeWidth="1" />
                )}
              </g>
            );
          })}
        </svg>
        <div className="pointer-events-none absolute top-0 right-0 rounded-md border border-line bg-[#0f0f0f] px-2.5 py-1.5 text-[12px]" aria-live="polite">
          {cur ? (
            <>
              <span className="text-fg">{KIND_INFO[cur.kind].name}</span> <span className="text-muted">· {cur.state === "done" ? formatMs(cur.wallMs) : cur.state}</span>
            </>
          ) : (
            <span className="text-muted">Longest {formatMs(max)} · hover a bar</span>
          )}
        </div>
      </div>
      <figcaption className="nm-small mt-2">Wall time per run, newest on the right. Outlined marks are failed or cancelled runs (no duration).</figcaption>
    </figure>
  );
}

export function Dashboard() {
  const { history, jobs, settings, cores, memoryGb, clearHistory, ready } = useJobs();
  const { facts, failed } = useChain();
  const { address } = useWallet();
  const s = useMemo(() => summarize(history), [history]);
  const live = ledgerLive();
  const [mine, setMine] = useState<{ total: number; runs: LedgerRun[] } | null>(null);
  const [latest, setLatest] = useState<{ total: number; runs: LedgerRun[] } | null>(null);
  const [now, setNow] = useState(() => Date.now() / 1000);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    if (!live) return;
    latestRuns(8).then(setLatest).catch(() => setLatest(null));
  }, [live, facts?.ledger?.runs]);
  useEffect(() => {
    if (!live || !address) return;
    runsByRunner(address, 10).then(setMine).catch(() => setMine(null));
  }, [live, address, facts?.ledger?.runs]);

  const runningNow = jobs.filter((j) => j.state === "running").length;
  const waiting = jobs.filter((j) => j.state === "queued" || j.state === "waiting").length;

  return (
    <div className="flex flex-col gap-14">
      <section aria-labelledby="usage-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="usage-h" className="text-[20px] leading-7 font-medium">
            Workload metrics
          </h2>
          <span className="inline-flex items-center gap-2 text-[12px] text-muted" data-testid="live-queue">
            <span className={`nm-dot ${runningNow ? "pulse" : "idle"}`} /> {runningNow} running · {waiting} waiting · {settings.concurrency} at once
          </span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-8 md:grid-cols-4">
          <Tile label="Runs finished" value={ready ? String(s.done) : "—"} sub={`${s.failed} failed · ${s.cancelled} cancelled`} testid="tile-done" />
          <Tile label="Retried runs" value={ready ? String(s.retried) : "—"} sub="needed more than one attempt" />
          <Tile label="Average wall time" value={formatMs(s.avgWallMs)} sub={`p95 ${formatMs(s.p95WallMs)}`} testid="tile-avg" />
          <Tile label="Worker busy share" value={s.busyShare === null ? "—" : `${Math.round(s.busyShare * 100)}%`} sub={`${formatMs(s.busyMsTotal)} computing in total`} />
          <Tile label="Average queue wait" value={formatMs(s.avgQueueMs)} sub="from queued to first start" />
          <Tile label="Proofs" value={ready ? String(s.proofs) : "—"} sub={live ? "recorded or signed from this browser" : "practice signatures (ledger not deployed)"} />
          <Tile label="Logical cores" value={cores === null ? "—" : String(cores)} sub="reported by this browser" />
          <Tile label="Device memory" value={memoryGb === null ? "—" : `${memoryGb} GB`} sub={memoryGb === null ? "not reported by this browser" : "rounded hint from the browser"} />
        </div>
      </section>

      <section aria-labelledby="timeline-h">
        <h2 id="timeline-h" className="mb-4 text-[20px] leading-7 font-medium">
          Recent runs
        </h2>
        <Timeline runs={history} />
      </section>

      <section aria-labelledby="kinds-h">
        <h2 id="kinds-h" className="mb-4 text-[20px] leading-7 font-medium">
          By workload
        </h2>
        <div className="overflow-x-auto">
          <table className="nm-table min-w-[560px]" data-testid="kind-table">
            <thead>
              <tr>
                <th>Workload</th>
                <th className="r">Done</th>
                <th className="r">Failed</th>
                <th className="r">Average</th>
                <th className="r">p95</th>
                <th className="r">Throughput</th>
              </tr>
            </thead>
            <tbody>
              {s.byKind.map((k) => (
                <tr key={k.kind}>
                  <td>{KIND_INFO[k.kind].name}</td>
                  <td className="r">{k.done}</td>
                  <td className="r">{k.failed}</td>
                  <td className="r">{formatMs(k.avgMs)}</td>
                  <td className="r">{formatMs(k.p95Ms)}</td>
                  <td className="r">{formatRate(k.unitsPerSec, KIND_INFO[k.kind].unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="nm-small mt-3">Throughput is units processed per second of worker busy time. All of it is measured on this device; nothing is estimated.</p>
      </section>

      <section className="grid gap-10 md:grid-cols-2" aria-label="Robinhood Chain">
        <div>
          <h2 className="text-[20px] leading-7 font-medium">{CHAIN.name}, live</h2>
          <div className="mt-4" data-testid="chain-panel">
            <div className="nm-kv">
              <span>Latest block</span>
              <span data-testid="chain-block">{facts?.block ? `#${facts.block.toLocaleString("en-US")}` : failed ? "unreachable" : "…"}</span>
            </div>
            <div className="nm-kv">
              <span>Block time</span>
              <span>{facts?.blockTime ? ago(facts.blockTime, now) : "—"}</span>
            </div>
            <div className="nm-kv">
              <span>Average block interval</span>
              <span>{facts?.blockPace ? `${facts.blockPace.toFixed(2)} s` : "—"}</span>
            </div>
            <div className="nm-kv">
              <span>Gas price</span>
              <span>{facts?.gasGwei ? `${facts.gasGwei.toFixed(4)} gwei` : "—"}</span>
            </div>
            <div className="nm-kv">
              <span>ETH / USD (Chainlink)</span>
              <span>{facts?.ethUsd ? usd(facts.ethUsd) : "—"}</span>
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-[20px] leading-7 font-medium">Job ledger</h2>
          <div className="mt-4">
            <div className="nm-kv">
              <span>NimroJobLedger</span>
              <span>
                {live ? (
                  <a href={explorerAddress(CONTRACTS.ledger)} target="_blank" rel="noreferrer" className="nm-link font-mono">
                    {shortAddress(CONTRACTS.ledger)}
                  </a>
                ) : (
                  "not deployed yet"
                )}
              </span>
            </div>
            <div className="nm-kv">
              <span>Runs recorded by anyone</span>
              <span data-testid="ledger-count">{live ? (facts?.ledger?.runs ?? "…") : "—"}</span>
            </div>
            <div className="nm-kv">
              <span>Recorded by your wallet</span>
              <span>{!live ? "—" : address ? (mine ? mine.total : "…") : "connect a wallet"}</span>
            </div>
          </div>
          {live && latest && latest.runs.length ? (
            <ul className="mt-4 flex flex-col gap-2 text-[12.5px]" data-testid="ledger-latest">
              {latest.runs.map((r) => (
                <li key={r.id} className="flex flex-wrap justify-between gap-2 border-b border-line pb-2">
                  <span>
                    #{r.id} · {Object.values(KIND_INFO)[r.kind - 1]?.name ?? `kind ${r.kind}`}
                  </span>
                  <span className="text-muted">
                    {shortAddress(r.runner)} · {formatMs(r.durationMs)} self-reported · block {r.recordedBlock.toLocaleString("en-US")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="nm-small mt-4">{live ? "No run has been recorded yet." : "Until the contract is deployed, the runner offers practice proofs: a wallet signature kept in this browser, nothing sent."}</p>
          )}
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
        <p className="nm-body max-w-[620px]">History lives in this browser only (newest 200 runs). Hosted nodes, shared team dashboards and alerts are planned.</p>
        <div className="flex gap-2">
          <Link href="/run" className="nm-btn">
            Open the runner <ArrowUpRight />
          </Link>
          <button
            type="button"
            className="nm-btn"
            disabled={!history.length}
            onClick={() => {
              if (window.confirm("Clear the run history kept in this browser? Recorded proofs on chain are not affected.")) clearHistory();
            }}
          >
            Clear history
          </button>
        </div>
      </section>
    </div>
  );
}
