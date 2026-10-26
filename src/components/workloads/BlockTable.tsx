"use client";

import { useEffect, useMemo, useState } from "react";
import { explorerBlock } from "@/config/brand";
import { ArrowUpRight, ChevronDown, SearchIcon } from "@/components/site/Icons";
import { ago, compact } from "@/lib/format";
import type { BlockRow } from "@/lib/server/blocks";

type Sort = "newest" | "txs" | "gas";

/** Live table of the newest Robinhood Chain blocks, read through this site's server (cached for everyone). */
export function BlockTable() {
  const [rows, setRows] = useState<BlockRow[] | null>(null);
  const [at, setAt] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [now, setNow] = useState(() => Date.now() / 1000);

  useEffect(() => {
    let stop = false;
    const load = () =>
      fetch("/api/blocks", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((v: { at: number; blocks: BlockRow[] }) => {
          if (stop) return;
          setRows(v.blocks);
          setAt(v.at);
          setFailed(false);
        })
        .catch(() => !stop && setFailed(true));
    load();
    const t = window.setInterval(() => document.visibilityState === "visible" && load(), 15_000);
    const c = window.setInterval(() => setNow(Date.now() / 1000), 1_000);
    return () => {
      stop = true;
      window.clearInterval(t);
      window.clearInterval(c);
    };
  }, []);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = (rows ?? []).filter((b) => !term || String(b.number).includes(term) || b.hash.toLowerCase().includes(term));
    if (sort === "txs") return [...list].sort((a, b) => b.txs - a.txs || b.number - a.number);
    if (sort === "gas") return [...list].sort((a, b) => b.gasUsed - a.gasUsed || b.number - a.number);
    return list;
  }, [rows, q, sort]);

  return (
    <div data-testid="block-table">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-[384px]">
          <span className="sr-only">Search blocks</span>
          <SearchIcon size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input className="nm-field pl-9" placeholder="Search block number or hash…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="block w-full sm:w-[208px]">
          <span className="sr-only">Sort blocks</span>
          <select className="nm-field" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="newest">Newest first</option>
            <option value="txs">Most transactions</option>
            <option value="gas">Most gas used</option>
          </select>
        </label>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="nm-table min-w-[560px]">
          <thead>
            <tr>
              <th className="w-[52px]">Rank</th>
              <th>Block</th>
              <th className="r">Transactions</th>
              <th className="r">Gas used</th>
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr>
                <td colSpan={4} className="text-muted">
                  {failed ? "Robinhood Chain did not answer. Retrying every 15 seconds." : "Reading the newest blocks…"}
                </td>
              </tr>
            ) : shown.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted">
                  No block in this list matches “{q}”.
                </td>
              </tr>
            ) : (
              shown.map((b, i) => (
                <tr key={b.number}>
                  <td className="text-muted">{String(i + 1).padStart(2, "0")}</td>
                  <td>
                    <a href={explorerBlock(b.number)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium hover:underline">
                      #{b.number.toLocaleString("en-US")} <ArrowUpRight size={12} />
                    </a>
                    <p className="mt-1 font-mono text-[12px] text-muted">{`${b.hash.slice(0, 18)}…${b.hash.slice(-6)}`}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="nm-tag">{ago(b.time, now)}</span>
                      {b.baseFeeGwei !== null ? <span className="nm-tag solid">base fee {b.baseFeeGwei.toFixed(4)} gwei</span> : null}
                    </div>
                  </td>
                  <td className="r">{b.txs.toLocaleString("en-US")}</td>
                  <td className="r">{compact(b.gasUsed)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="nm-small mt-4">{rows ? `${rows.length} blocks · read live from Robinhood Chain${at ? `, refreshed ${ago(at / 1000, now)}` : ""}` : "Live chain data"}</p>
      <details className="nm-faq mt-2">
        <summary>
          <span className="nm-link text-[14px] font-normal">How this list is read</span>
          <ChevronDown />
        </summary>
        <p className="a">
          This site&apos;s server asks a public Robinhood Chain endpoint for the latest block and the eleven before it (headers only), at most once every ten seconds for
          all visitors together. Rank is the position in the current sort. Transactions are counted from each block&apos;s list; gas used is the block total.
        </p>
      </details>
    </div>
  );
}
