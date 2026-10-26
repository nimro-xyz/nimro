import Link from "next/link";
import { BRAND } from "@/config/brand";
import { CATALOG } from "@/config/catalog";
import { Shell } from "@/components/site/Page";
import { ArrowDown, ArrowRight } from "@/components/site/Icons";
import { Estimator } from "@/components/home/Estimator";
import { BlockTable } from "@/components/workloads/BlockTable";
import { JsonLd } from "@/components/JsonLd";
import { KIND_INFO } from "@/lib/jobs/kinds";
import { breadcrumbLd, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  path: "/workloads",
  title: `Workloads | ${BRAND.name}`,
  description: `Every ${BRAND.name} workload: SHA-256 hashing, prime sieve, image resize and JSON transform, run in your browser with proof on ${BRAND.chainName}.`,
});

export default function WorkloadsPage() {
  return (
    <Shell>
      <JsonLd data={breadcrumbLd([{ name: "Workloads", path: "/workloads" }])} />
      <div className="nm-wrap nm-gutter">
        <section className="flex flex-col gap-6 pt-14 pb-10 md:flex-row md:items-start md:justify-between md:pt-16 md:pb-11">
          <div>
            <h1 className="nm-h2 lg md:!text-[44px] md:!leading-[52px]">Explore workloads.</h1>
            <p className="nm-lede mt-3 max-w-[620px] !text-[16px] md:!text-[17px]">
              Run a workload on your own device right now, or read about the ones that are planned. Every finished run can be recorded on {BRAND.chainName}.
            </p>
          </div>
          <a href="#catalog" className="nm-btn w-fit shrink-0">
            View all workloads <ArrowDown />
          </a>
        </section>

        <section className="nm-section !pt-12 !pb-10">
          <Estimator id="plan-workloads" />
        </section>

        <section className="py-16">
          <div className="nm-card">
            <h2 className="text-[20px] leading-7 font-medium">Bring your own data.</h2>
            <p className="nm-body mt-3 max-w-[680px] !text-[15px]">
              Paste a JSON array or choose a picture from your disk in the runner. The data is read inside this tab and handed to a worker; it is never uploaded.
              Specifications you run can be shared and rerun by anyone.
            </p>
            <Link href="/run" className="nm-btn mt-6">
              Open the runner <ArrowRight />
            </Link>
          </div>
        </section>

        <section className="pb-16" aria-labelledby="blocks-h">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="blocks-h" className="text-[20px] leading-7 font-medium">
                Latest blocks on {BRAND.chainName}
              </h2>
              <p className="nm-body mt-1">The chain your proofs are recorded on, block by block.</p>
            </div>
            <span className="nm-small">Live</span>
          </div>
          <BlockTable />
        </section>

        <section className="border-t border-line py-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="nm-body max-w-[540px] !text-[15px]">Compare the workloads below. Each one is free to run; recording a proof costs only gas from your wallet.</p>
            <a href="#catalog" className="nm-btn w-fit">
              View all workloads <ArrowDown />
            </a>
          </div>
        </section>

        <section id="catalog" className="scroll-mt-24 pt-12 pb-6" aria-labelledby="catalog-h">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-6">
            <div>
              <h2 id="catalog-h" className="text-[20px] leading-7 font-medium">
                Workload catalog
              </h2>
              <p className="nm-body mt-1">{CATALOG.filter((c) => c.status === "live").length} live · {CATALOG.filter((c) => c.status === "planned").length} planned</p>
            </div>
            <span className="nm-pill">On your device</span>
          </div>
          {CATALOG.map((row) => {
            const live = row.status === "live";
            return (
              <article key={live ? row.kind : row.id} className="grid gap-6 border-b border-line py-10 md:grid-cols-[minmax(0,1fr)_240px] md:gap-10" data-testid="catalog-item">
                <div className="min-w-0">
                  <h3 className="text-[20px] leading-7 font-medium">{row.title}</h3>
                  <p className="nm-body mt-3 max-w-[580px] !text-[15px] !leading-6">{live ? KIND_INFO[row.kind].detail : row.blurb}</p>
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-muted">
                    {row.tags.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                </div>
                <div className="md:text-right">
                  <p className="nm-label">{live ? "Cost to run" : "Status"}</p>
                  <p className="mt-1 text-[20px] leading-7 font-medium">
                    {live ? "Free" : "Planned"} <span className="text-[14px] font-normal text-muted">{live ? "/ on your device" : "/ not available"}</span>
                  </p>
                  <p className="nm-small">{live ? "Proof: gas only" : "No date, no price"}</p>
                  {live ? (
                    <Link href={`/run?kind=${row.kind}`} className="nm-btn mt-4 w-full md:w-[176px]">
                      Run job <ArrowRight />
                    </Link>
                  ) : (
                    <span className="nm-btn mt-4 w-full md:w-[176px]" aria-disabled="true">
                      Planned
                    </span>
                  )}
                </div>
              </article>
            );
          })}
          <div className="grid gap-6 py-10 md:grid-cols-2 md:gap-16">
            <p className="nm-body !text-[15px] !leading-6">Only live workloads can be started. Planned ones are described so you know where the platform is going; none of them runs today.</p>
            <p className="nm-body !text-[15px] !leading-6">Jobs stop when the tab closes. Results stay in this browser until you clear them, and a recorded proof stays on chain for good.</p>
          </div>
        </section>
      </div>
    </Shell>
  );
}
