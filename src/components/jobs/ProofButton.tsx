"use client";

import { useState } from "react";
import { CHAIN, explorerTx } from "@/config/brand";
import { CONTRACTS, ledgerLive } from "@/config/contracts";
import { useWalletModal } from "@/components/wallet/WalletButton";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useJobs } from "@/components/jobs/JobsProvider";
import { ArrowUpRight } from "@/components/site/Icons";
import { explain, waitForReceipt } from "@/lib/client";
import { estimateRecord, recordCalldata, runOf } from "@/lib/ledger";
import type { RunRecord } from "@/lib/jobs/metrics";

/**
 * "Record proof" for one finished run. With NimroJobLedger deployed it sends `record(spec, result, kind, ms)` from the
 * visitor's wallet after a dry run; before that it is practice: a wallet signature over the same fields, kept in this
 * browser only.
 */
export function ProofButton({ rec, compact = false }: { rec: RunRecord; compact?: boolean }) {
  const { address, onRobinhoodChain, sendTransaction, signMessage, switchNetwork } = useWallet();
  const { open } = useWalletModal();
  const { updateRecord } = useJobs();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const live = ledgerLive();

  if (rec.state !== "done" || !rec.resultHash) return null;
  if (rec.proof?.tx || rec.proof?.runId) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2 text-[12px]" data-testid="proof-onchain">
        <span className="nm-tag ok">Recorded{rec.proof.runId ? ` · run #${rec.proof.runId}` : ""}</span>
        {rec.proof.tx ? (
          <a href={explorerTx(rec.proof.tx)} target="_blank" rel="noreferrer" className="nm-link inline-flex items-center gap-1">
            tx <ArrowUpRight size={12} />
          </a>
        ) : null}
      </span>
    );
  }
  if (rec.proof?.practice && !live) return <span className="nm-tag" data-testid="proof-practice">Practice proof signed</span>;

  async function go() {
    setErr(null);
    if (!address) return open();
    try {
      const ms = rec.busyMs ?? rec.wallMs ?? 0;
      if (!live) {
        setBusy("Sign in wallet…");
        const msg = [`Nimro practice proof (nothing is sent on chain)`, `spec ${rec.specHash}`, `result ${rec.resultHash}`, `kind ${rec.kind}`, `duration ${Math.round(ms)} ms`, `chain ${CHAIN.name} (${CHAIN.id})`].join("\n");
        const sig = await signMessage(msg);
        updateRecord(rec.id, { proof: { practice: sig, at: Date.now() } });
        return;
      }
      if (!onRobinhoodChain) {
        setBusy("Switching…");
        await switchNetwork();
        return;
      }
      const data = recordCalldata(rec.specHash, rec.resultHash!, rec.kind, ms);
      setBusy("Checking…");
      const existing = await runOf(address, rec.specHash, rec.resultHash!).catch(() => 0);
      if (existing > 0) {
        updateRecord(rec.id, { proof: { runId: existing, at: Date.now() } });
        return;
      }
      await estimateRecord(address, data);
      setBusy("Confirm in wallet…");
      const hash = await sendTransaction({ to: CONTRACTS.ledger, data });
      setBusy("Waiting for block…");
      const r = await waitForReceipt(hash);
      if (!r.ok) throw new Error("The transaction reverted.");
      const id = await runOf(address, rec.specHash, rec.resultHash!).catch(() => 0);
      updateRecord(rec.id, { proof: { tx: hash, runId: id || undefined, at: Date.now() } });
    } catch (e) {
      setErr(explain(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" className={`nm-btn ${compact ? "h-8 px-2.5 text-[13px]" : ""}`} onClick={go} disabled={Boolean(busy)} data-testid="proof-button">
        {busy ?? (address ? (live ? "Record proof" : "Sign practice proof") : "Connect to record")}
      </button>
      {err ? <span className="max-w-[260px] text-[12px] text-bad">{err}</span> : null}
    </span>
  );
}
