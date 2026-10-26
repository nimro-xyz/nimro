import { encodeFunctionData, type Abi } from "viem";
import { CONTRACTS } from "@/config/contracts";
import { LEDGER_ABI } from "@/lib/abi";
import { read, readMany, rpcCall } from "@/lib/client";
import { KIND_IDS, type JobKind } from "@/lib/jobs/kinds";

/* Browser reads and the one write the site sends to NimroJobLedger. */

export type LedgerRun = {
  id: number;
  runner: string;
  kind: number;
  durationMs: number;
  recordedBlock: number;
  recordedAt: number;
  specHash: string;
  resultHash: string;
};

const abi = LEDGER_ABI as Abi;

export function recordCalldata(specHash: `0x${string}`, resultHash: `0x${string}`, kind: JobKind, durationMs: number) {
  const ms = Math.max(0, Math.min(0xffffffff, Math.round(durationMs)));
  return encodeFunctionData({ abi: LEDGER_ABI, functionName: "record", args: [specHash, resultHash, KIND_IDS[kind], ms] });
}

/** Dry run of `record` from `from` (reverts surface here, before the wallet opens). */
export async function estimateRecord(from: string, data: string) {
  const gas = await rpcCall<string>("eth_estimateGas", [{ from, to: CONTRACTS.ledger, data }]);
  return Number(BigInt(gas));
}

type RawRun = { runner: string; kind: number; durationMs: number; recordedBlock: bigint; recordedAt: bigint; specHash: string; resultHash: string };
const toRun = (id: number, r: RawRun): LedgerRun => ({
  id,
  runner: r.runner,
  kind: Number(r.kind),
  durationMs: Number(r.durationMs),
  recordedBlock: Number(r.recordedBlock),
  recordedAt: Number(r.recordedAt),
  specHash: r.specHash,
  resultHash: r.resultHash,
});

export async function runOf(runner: string, specHash: string, resultHash: string): Promise<number> {
  const id = await read<bigint>({ to: CONTRACTS.ledger, abi, fn: "runOf", args: [runner, specHash, resultHash] });
  return Number(id);
}

export async function runCount(): Promise<number> {
  return Number(await read<bigint>({ to: CONTRACTS.ledger, abi, fn: "runCount" }));
}

export async function runsByIds(ids: number[]): Promise<LedgerRun[]> {
  const raw = await readMany(ids.map((id) => ({ to: CONTRACTS.ledger, abi, fn: "run", args: [BigInt(id)] })));
  return raw.flatMap((r, i) => (r ? [toRun(ids[i], r as RawRun)] : []));
}

/** Newest runs recorded for a specification (up to `limit`). */
export async function runsForSpec(specHash: string, limit = 20): Promise<{ total: number; runs: LedgerRun[] }> {
  const total = Number(await read<bigint>({ to: CONTRACTS.ledger, abi, fn: "specRunCount", args: [specHash] }));
  if (total === 0) return { total, runs: [] };
  const ids = (await read<readonly bigint[]>({ to: CONTRACTS.ledger, abi, fn: "specRuns", args: [specHash, 0n, BigInt(limit)] })).map(Number);
  return { total, runs: await runsByIds(ids) };
}

/** Newest runs recorded by an address. */
export async function runsByRunner(runner: string, limit = 20): Promise<{ total: number; runs: LedgerRun[] }> {
  const total = Number(await read<bigint>({ to: CONTRACTS.ledger, abi, fn: "runnerRunCount", args: [runner] }));
  if (total === 0) return { total, runs: [] };
  const ids = (await read<readonly bigint[]>({ to: CONTRACTS.ledger, abi, fn: "runnerRuns", args: [runner, 0n, BigInt(limit)] })).map(Number);
  return { total, runs: await runsByIds(ids) };
}

/** Newest runs on the whole ledger (ids counted down from runCount). */
export async function latestRuns(limit = 10): Promise<{ total: number; runs: LedgerRun[] }> {
  const total = await runCount();
  const ids: number[] = [];
  for (let id = total; id > 0 && ids.length < limit; id--) ids.push(id);
  return { total, runs: ids.length ? await runsByIds(ids) : [] };
}
