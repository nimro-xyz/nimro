import Link from "next/link";
import { BRAND, CHAIN, LAUNCHPAD, TOKEN, buyUrl } from "@/config/brand";
import { ASSETS } from "@/config/assets";
import { Shell } from "@/components/site/Page";
import { CaBlock } from "@/components/site/CopyCa";
import { Faq } from "@/components/site/Faq";
import { JsonLd } from "@/components/JsonLd";
import { ArrowRight, ArrowUpRight } from "@/components/site/Icons";
import { DonutCenter, ProofCost, SupplyValue, TokenFacts } from "@/components/token/TokenLive";
import { tokenFaq } from "@/content/faq";
import { breadcrumbLd, faqLd, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  path: "/token",
  title: `${BRAND.name} (${BRAND.symbol}) Token`,
  description: `${BRAND.symbol} is the ${BRAND.name} token on ${BRAND.chainName}. Contract address, supply read from chain, and the planned links between the token and compute.`,
});

const KEYS = [
  { t: "No owner", d: "Nobody can pause the ledger, change its rules or take it over. There is no admin function to call." },
  { t: "No fee", d: "Recording a run costs gas and nothing else. The contract cannot hold or receive ETH." },
  { t: "No upgrade path", d: "The code at the address is the code forever. A new version would be a new contract, announced as such." },
];

const UTILITY = [
  { t: "Compute credits", d: "Prepaid credits for hosted compute nodes once they exist, with ETH or stablecoins kept as a payment option." },
  { t: "Job payments", d: "Paying for AI and batch jobs run on rented hardware, priced per job instead of per server." },
  { t: "Service access", d: "Access to a developer API that lets other apps submit job specifications and read results." },
  { t: "Linked records", d: "Pointing payments and usage at NimroJobLedger records, so spending and work can be matched on chain." },
];

export default function TokenPage() {
  const faq = tokenFaq();
  return (
    <Shell>
      <JsonLd data={[breadcrumbLd([{ name: "Token", path: "/token" }]), faqLd(faq)]} />
      <div className="nm-wrap nm-gutter">
        <section className="relative grid gap-10 overflow-clip pt-14 pb-12 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)] md:pt-24 md:pb-16">
          <div className="relative z-[1] min-w-0">
            <h1 className="text-[64px] leading-none font-medium tracking-[-0.06em] md:text-[128px]">{BRAND.symbol}</h1>
            <p className="mt-6 text-[24px] leading-8 font-medium tracking-tight md:text-[30px] md:leading-9">Built around compute you can check.</p>
            <p className="nm-body mt-5 max-w-[500px] !text-[16px] !leading-[26px]">
              The token of {BRAND.name}, the workload orchestration project on {BRAND.chainName}. Its uses are planned, not live, and are listed plainly below.
            </p>
          </div>
          <div className="pointer-events-none absolute top-6 -right-16 w-[18rem] opacity-[0.09] md:static md:w-auto md:opacity-30" aria-hidden="true">
            { }
            <img src={ASSETS.heroMark} alt="" width={420} height={420} className="mx-auto block w-full max-w-[380px] [mask-image:radial-gradient(closest-side,#000_45%,transparent_100%)]" />
          </div>
        </section>

        <dl className="nm-facts m-0">
          <div>
            <dt>Network</dt>
            <dd>
              <a href={CHAIN.explorer} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:underline">
                {CHAIN.name} <ArrowUpRight size={13} />
              </a>
            </dd>
          </div>
          <div>
            <dt>Total supply</dt>
            <dd>
              <SupplyValue />
            </dd>
          </div>
          <div>
            <dt>Launch venue</dt>
            <dd>
              {buyUrl() ? (
              <a href={buyUrl()!} target="_blank" rel="noreferrer" className="underline underline-offset-4" data-testid="buy-launchpad">
                {LAUNCHPAD.name} ↗
              </a>
            ) : (
              "To be announced"
            )}
            </dd>
          </div>
        </dl>
        <div className="border-b border-line py-8">
          <CaBlock />
        </div>

        <section className="nm-section !border-t-0" aria-labelledby="supply-h">
          <h2 id="supply-h" className="nm-h2 lg">
            Supply, read from the chain.
          </h2>
          <p className="nm-body mt-4 max-w-[560px] !text-[15px]">Supply, decimals and name come from the token contract itself once the address is published. Nothing here is typed in by hand.</p>
          <div className="mt-12 grid items-center gap-12 md:grid-cols-2">
            <div className="nm-donut" style={{ background: "conic-gradient(#ededed 0 100%)" }} aria-hidden="true">
              <div>
                <DonutCenter />
              </div>
            </div>
            <div>
              <h3 className="nm-h3 lg">One contract. Facts from the source.</h3>
              <p className="nm-body mt-3">{TOKEN.isLive ? `${BRAND.symbol} launched on ${LAUNCHPAD.name}. Name, symbol, decimals and supply below are read from the token contract.` : "Launch distribution and venue are published when they are decided. Until then this page shows a dash rather than a guess."}</p>
              <div className="mt-6">
                <TokenFacts />
              </div>
            </div>
          </div>
        </section>

        <section className="nm-section" aria-labelledby="keys-h">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-12">
            <p className="nm-big shrink-0">
              0<small>keys</small>
            </p>
            <div className="md:pt-6">
              <h2 id="keys-h" className="nm-h2 lg">
                No keys over the ledger.
              </h2>
              <p className="nm-body mt-4 max-w-[600px] !text-[15px]">NimroJobLedger, the contract that stores proofs of runs, is built so that no one, including the team, holds power over it.</p>
            </div>
          </div>
          <div className="mt-12 grid border-t border-line md:grid-cols-3">
            {KEYS.map((k, i) => (
              <div key={k.t} className={`py-8 ${i ? "border-t border-line md:border-t-0 md:border-l md:pl-8" : ""} md:pr-8`}>
                <p className="text-[28px] leading-none tracking-tight">0</p>
                <h3 className="nm-h3 mt-5">{k.t}</h3>
                <p className="nm-body mt-2">{k.d}</p>
              </div>
            ))}
          </div>
          <p className="nm-small max-w-[760px]">These are properties of the contract code in this repository. They become facts about a deployed contract once its address is published and its code is verified on the explorer.</p>
        </section>

        <section className="nm-section" aria-labelledby="cost-h">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <p className="nm-big">
                1<small>tx</small>
              </p>
              <h2 id="cost-h" className="nm-h2 lg mt-8">
                One proof.
                <br />
                One small transaction.
              </h2>
              <p className="nm-body mt-6 max-w-[480px] !text-[15px]">A proof is a single call that stores two fingerprints, the job kind and a duration. The price below uses the gas our tests measured and the live gas price.</p>
            </div>
            <div className="md:pt-14">
              <ProofCost />
              <p className="nm-body mt-6">A first record of a new specification costs the most; later records cost a little less. Your wallet shows the exact fee before you sign.</p>
              <p className="nm-small mt-4">No part of the fee goes to {BRAND.name}. Gas is paid to the network.</p>
            </div>
          </div>
        </section>

        <section className="nm-section" aria-labelledby="utility-h">
          <h2 id="utility-h" className="nm-h2 lg">
            Put the token to work.
          </h2>
          <p className="nm-body mt-4 max-w-[580px] !text-[15px]">Options being considered for {BRAND.symbol}. None of them is active, and none promises a return, a discount or a reward.</p>
          <div className="mt-12 grid gap-x-16 md:grid-cols-2">
            {UTILITY.map((u) => (
              <div key={u.t} className="border-t border-line py-8">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="nm-h3 lg">{u.t}</h3>
                  <span className="nm-small">Planned</span>
                </div>
                <p className="nm-body mt-3 max-w-[440px]">{u.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="nm-section" aria-labelledby="tfaq-h">
          <h2 id="tfaq-h" className="nm-h2 lg md:!text-[44px]">
            Token details.
          </h2>
          <div className="mt-10">
            <Faq items={faq} testid="token-faq" />
          </div>
          <div className="mt-14 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <p className="nm-body max-w-[520px] !text-[15px]">The product comes first. Run a workload, check the numbers, and record the runs that matter.</p>
            <Link href="/run" className="nm-btn primary lg w-fit">
              Open the runner <ArrowRight />
            </Link>
          </div>
        </section>
      </div>
    </Shell>
  );
}
