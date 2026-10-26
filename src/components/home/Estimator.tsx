"use client";

import { useMemo, useState } from "react";
import { useChain } from "@/components/providers/ChainProvider";
import { useJobs } from "@/components/jobs/JobsProvider";
import { RECORD_GAS_ESTIMATE } from "@/config/contracts";
import { KINDS, KIND_INFO, type JobKind } from "@/lib/jobs/kinds";
import { formatMs } from "@/lib/jobs/metrics";

/**
 * Batch planner: how long N runs of a workload should take on this device (from this browser's own past runs and
 * the current concurrency), and what recording proofs would cost at the live Robinhood Chain gas price.
 */
export function Estimator({ id = "plan" }: { id?: string }) {
  const { facts } = useChain();
  const { history, settings } = useJobs();
  const [kind, setKind] = useState<JobKind>("hash");
  const [count, setCount] = useState(1);
  const n = Math.max(1, Math.min(500, Math.floor(count) || 1));

  const avg = useMemo(() => {
    const done = history.filter((r) => r.kind === kind && r.state === "done" && r.wallMs !== null);
    return done.length ? done.reduce((a, r) => a + (r.wallMs ?? 0), 0) / done.length : null;
  }, [history, kind]);
  const time = avg === null ? null : (avg * Math.ceil(n / settings.concurrency));
  const gasEth = facts?.gasGwei ? (RECORD_GAS_ESTIMATE * facts.gasGwei * n) / 1e9 : null;
  const gasUsd = gasEth !== null && facts?.ethUsd ? gasEth * facts.ethUsd : null;
  const total = history.length;

  return (
    <div className="nm-split" id={id}>
      <div>
        <h3 className="nm-h3 lg">Plan your batch.</h3>
        <p className="nm-body mt-3 max-w-[370px]">Pick a workload and a count. Time comes from your own past runs on this device; proof cost comes from the live gas price.</p>
        <p className="nm-small mt-4">
          {KINDS.length} workloads live · {total} run{total === 1 ? "" : "s"} in this browser
        </p>
      </div>
      <div>
        <div className="grid grid-cols-[minmax(0,1fr)_90px] gap-4">
          <div>
            <label className="nm-flabel" htmlFor={`${id}-kind`}>
              Workload
            </label>
            <select id={`${id}-kind`} className="nm-field" value={kind} onChange={(e) => setKind(e.target.value as JobKind)}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_INFO[k].name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="nm-flabel" htmlFor={`${id}-count`}>
              Runs
            </label>
            <input id={`${id}-count`} className="nm-field" type="number" min={1} max={500} value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </div>
        </div>
        <div className="mt-4 border-t border-line pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="text-[14px] text-muted">Estimated time</span>
            <output className="text-[20px] leading-7 font-medium" data-testid="estimate-time">
              {time === null ? "—" : formatMs(time)}
            </output>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
            <span className="text-[14px] text-muted">Proof cost if recorded</span>
            <output className="text-[15px]" data-testid="estimate-gas">
              {gasEth === null ? "—" : `${gasEth < 0.000001 ? gasEth.toExponential(2) : gasEth.toFixed(7)} ETH${gasUsd !== null ? ` ≈ $${gasUsd < 0.01 ? gasUsd.toFixed(4) : gasUsd.toFixed(2)}` : ""}`}
            </output>
          </div>
          <p className="nm-small mt-4">
            {avg === null ? "No finished run of this workload in this browser yet, so there is nothing to time against. Run it once and the estimate fills in." : `Based on an average of ${formatMs(avg)} per run at ${settings.concurrency} at a time.`} Gas uses about{" "}
            {RECORD_GAS_ESTIMATE.toLocaleString("en-US")} units per proof at {facts?.gasGwei ? `${facts.gasGwei.toFixed(4)} gwei` : "the current price"}. An estimate, not a quote.
          </p>
        </div>
      </div>
    </div>
  );
}
