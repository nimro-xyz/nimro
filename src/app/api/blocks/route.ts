import { NextResponse } from "next/server";
import { readBlocks, type BlockRow } from "@/lib/server/blocks";

export const dynamic = "force-dynamic";
export type { BlockRow };

/*
 * The newest blocks for the workloads page table. One upstream read per TTL for the whole site (single flight),
 * however many visitors poll, and a failed read never replaces a recent good one.
 */
let cache: { at: number; value: BlockRow[] } | null = null;
const TTL = 10_000;
let inflight: Promise<void> | null = null;
let lastTry = 0;

export async function GET() {
  if ((!cache || Date.now() - cache.at > TTL) && Date.now() - lastTry > TTL) {
    lastTry = Date.now();
    inflight ??= readBlocks()
      .then((value) => {
        if (value.length) cache = { at: Date.now(), value };
      })
      .catch(() => {})
      .finally(() => {
        inflight = null;
      });
  }
  if (inflight) await inflight;
  if (!cache) return NextResponse.json({ error: "Block data is not available yet." }, { status: 503, headers: { "cache-control": "no-store" } });
  return NextResponse.json({ at: cache.at, blocks: cache.value }, { headers: { "cache-control": "no-store" } });
}
