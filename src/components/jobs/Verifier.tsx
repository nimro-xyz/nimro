"use client";

import { useEffect, useState } from "react";
import { explorerAddress, shortAddress } from "@/config/brand";
import { ledgerLive } from "@/config/contracts";
import { canonicalJson } from "@/lib/jobs/canonical";
import { decodePicture, makeWorkerRunner, rememberPicture } from "@/lib/jobs/browser";
import { KIND_INFO, describeSpec, resultHash, specHash, type JobSpec } from "@/lib/jobs/kinds";
import { formatMs } from "@/lib/jobs/metrics";
import { decodeSpec, parseSpec } from "@/lib/jobs/share";
import { runsForSpec, type LedgerRun } from "@/lib/ledger";

type Outcome = { spec: `0x${string}`; result: `0x${string}`; ms: number; summary: string };

/**
 * Reruns a job specification on this device and compares the result fingerprint with every run recorded for the
 * same specification on NimroJobLedger (or with a hash the visitor pastes).
 */
export function Verifier({ initial }: { initial: string | null }) {
  const [text, setText] = useState("");
  const [expected, setExpected] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [out, setOut] = useState<Outcome | null>(null);
  const [onchain, setOnchain] = useState<{ total: number; runs: LedgerRun[] } | null>(null);
  const [fileOk, setFileOk] = useState<string | null>(null);
  const live = ledgerLive();

  useEffect(() => {
    if (!initial) return;
    const s = decodeSpec(initial);
    // The link's specification fills the box once, on arrival.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (s) setText(JSON.stringify(s, null, 1));
  }, [initial]);

  const spec: JobSpec | null = parseSpec(text);
  const needsFile = spec?.kind === "image" && spec.source.type === "file";

  async function pick(file: File | undefined) {
    if (!file || !spec || spec.kind !== "image" || spec.source.type !== "file") return;
    setErr(null);
    try {
      const p = await decodePicture(file);
      if (p.sha256 !== spec.source.sha256) {
        setFileOk(null);
        setErr("That file is not the one this specification was made from (its fingerprint differs).");
        return;
      }
      rememberPicture(p);
      setFileOk(p.name);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function run() {
    if (!spec) return;
    setBusy(true);
    setErr(null);
    setOut(null);
    setOnchain(null);
    const runner = makeWorkerRunner();
    try {
      const reply = await runner.run(spec, () => {});
      if (!reply.ok) throw new Error(reply.error ?? "The job failed.");
      const r = resultHash(spec.kind, reply.result);
      const sh = specHash(spec);
      setOut({ spec: sh, result: r, ms: reply.busyMs ?? 0, summary: JSON.stringify(reply.result).slice(0, 300) });
      if (live) setOnchain(await runsForSpec(sh, 20));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      runner.terminate();
      setBusy(false);
    }
  }

  const exp = expected.trim().toLowerCase();
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
      <div className="min-w-0">
        <label className="nm-flabel" htmlFor="v-spec">
          Job specification (JSON)
        </label>
        <textarea id="v-spec" className="nm-field !min-h-[220px]" value={text} onChange={(e) => setText(e.target.value)} placeholder='{"v":1,"kind":"primes","limit":5000000}' spellCheck={false} data-testid="verify-spec" />
        <p className="nm-small mt-2">{spec ? `${KIND_INFO[spec.kind].name} · ${describeSpec(spec)}` : text ? "Not a valid specification yet." : "Paste a specification, or open a Verify link from the runner."}</p>
        {needsFile ? (
          <div className="mt-4">
            <label className="nm-btn cursor-pointer">
              Choose the same picture
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
            <span className="nm-small ml-3">{fileOk ? `${fileOk} matches` : "Needed: the picture stays in this tab."}</span>
          </div>
        ) : null}
        <label className="nm-flabel mt-6" htmlFor="v-exp">
          Expected result hash (optional)
        </label>
        <input id="v-exp" className="nm-field font-mono" value={expected} onChange={(e) => setExpected(e.target.value)} placeholder="0x…" />
        <button type="button" className="nm-btn primary lg mt-6" onClick={run} disabled={!spec || busy || (needsFile && !fileOk)} data-testid="verify-run">
          {busy ? "Running…" : "Rerun and compare"}
        </button>
        {err ? <p className="mt-3 text-[13px] text-bad">{err}</p> : null}
      </div>
      <div className="min-w-0" data-testid="verify-out">
        {!out ? (
          <div className="nm-note">
            Verification reruns the job on this device. Because every workload is deterministic, the same specification must give the same result fingerprint on any
            machine. {live ? "Every run recorded on chain for that specification is then listed with a match or a mismatch." : "The job ledger is not deployed yet, so compare against a hash someone shared with you."}
          </div>
        ) : (
          <>
            <div className="nm-kv">
              <span>Specification</span>
              <span className="font-mono text-[12px]">{out.spec}</span>
            </div>
            <div className="nm-kv">
              <span>Result here</span>
              <span className="font-mono text-[12px]" data-testid="verify-result">
                {out.result}
              </span>
            </div>
            <div className="nm-kv">
              <span>Rerun computing time</span>
              <span>{formatMs(out.ms)}</span>
            </div>
            {exp ? (
              <p className={`mt-4 nm-tag ${exp === out.result ? "ok" : "bad"}`} data-testid="verify-expected">
                {exp === out.result ? "Matches the expected hash" : "Differs from the expected hash"}
              </p>
            ) : null}
            <p className="mt-4 rounded-md bg-[#111] px-3 py-2 font-mono text-[12px] break-all">{out.summary}</p>
            {live && onchain ? (
              <div className="mt-6">
                <p className="text-[15px] font-medium">On chain: {onchain.total} run{onchain.total === 1 ? "" : "s"} for this specification</p>
                <ul className="mt-3 flex flex-col gap-2" data-testid="verify-onchain">
                  {onchain.runs.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2 text-[12.5px]">
                      <span>
                        Run #{r.id} by{" "}
                        <a className="nm-link font-mono" href={explorerAddress(r.runner)} target="_blank" rel="noreferrer">
                          {shortAddress(r.runner)}
                        </a>{" "}
                        · {formatMs(r.durationMs)} self-reported
                      </span>
                      <span className={`nm-tag ${r.resultHash.toLowerCase() === out.result ? "ok" : "bad"}`}>{r.resultHash.toLowerCase() === out.result ? "Result matches" : "Result differs"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="nm-small mt-4">Canonical text hashed for the specification: {spec ? canonicalJson(spec).length.toLocaleString("en-US") : "—"} characters.</p>
          </>
        )}
      </div>
    </div>
  );
}
