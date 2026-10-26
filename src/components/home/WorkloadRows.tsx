import Link from "next/link";
import { CATALOG } from "@/config/catalog";
import { ArrowUpRight, GlyphChain, GlyphWorker } from "@/components/site/Icons";

/* The workload list in the layout of a price table: name and facts, cost, where it runs, action. */
export function WorkloadRows() {
  return (
    <div className="nm-rows mt-12" data-testid="workload-rows">
      {CATALOG.map((row) => {
        const live = row.status === "live";
        return (
          <div key={live ? row.kind : row.id} className="nm-row">
            <div className="min-w-0">
              <h3 className="nm-h3 lg">{row.title}</h3>
              <p className="nm-row-meta">{row.meta.join(" · ")}</p>
            </div>
            <div className="nm-price">
              {live ? "Free" : "—"}
              <small>{live ? "per run · gas only to record" : "planned · not priced"}</small>
            </div>
            <div className="nm-chips" aria-label={live ? "Runs in a Web Worker, proof on Robinhood Chain" : "Planned"}>
              {live ? (
                <>
                  <span className="nm-chip-dot bg-[#e5e5e5]">
                    <GlyphWorker size={14} />
                  </span>
                  <span className="nm-chip-dot bg-[#b9b9b9]">
                    <GlyphChain size={14} />
                  </span>
                </>
              ) : (
                <span className="nm-tag">Planned</span>
              )}
            </div>
            <div className="md:justify-self-end">
              {live ? (
                <Link href={`/run?kind=${row.kind}`} className="nm-btn" data-testid={`row-run-${row.kind}`}>
                  Run job <ArrowUpRight />
                </Link>
              ) : (
                <Link href="/docs#planned" className="nm-btn">
                  Read the plan <ArrowUpRight />
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
