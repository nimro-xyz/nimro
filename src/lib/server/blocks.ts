import "server-only";
import { rpcBatch } from "@/lib/feeds/rpc";

/* The newest Robinhood Chain blocks (header data only, no full transactions), for the live block table. */

export type BlockRow = { number: number; hash: string; time: number; txs: number; gasUsed: number; baseFeeGwei: number | null };
export const BLOCK_ROWS = 12;

type RawBlock = { number: string; hash: string; timestamp: string; transactions: string[]; gasUsed: string; baseFeePerGas?: string };

export async function readBlocks(): Promise<BlockRow[]> {
  const [head] = await rpcBatch<RawBlock>([{ method: "eth_getBlockByNumber", params: ["latest", false] }]);
  if (!head) throw new Error("no head block");
  const top = Number(BigInt(head.number));
  const rest = await rpcBatch<RawBlock>(
    Array.from({ length: BLOCK_ROWS - 1 }, (_, i) => ({ method: "eth_getBlockByNumber", params: [`0x${(top - 1 - i).toString(16)}`, false] })),
  );
  return [head, ...rest].flatMap((b) =>
    b
      ? [
          {
            number: Number(BigInt(b.number)),
            hash: b.hash,
            time: Number(BigInt(b.timestamp)),
            txs: Array.isArray(b.transactions) ? b.transactions.length : 0,
            gasUsed: Number(BigInt(b.gasUsed)),
            baseFeeGwei: b.baseFeePerGas ? Number(BigInt(b.baseFeePerGas)) / 1e9 : null,
          },
        ]
      : [],
  );
}
