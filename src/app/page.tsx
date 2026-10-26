import Link from "next/link";
import { BRAND } from "@/config/brand";
import { ASSETS } from "@/config/assets";
import { Shell } from "@/components/site/Page";
import { Marquee } from "@/components/site/Marquee";
import { Faq } from "@/components/site/Faq";
import { JsonLd } from "@/components/JsonLd";
import { ArrowRight, ArrowUpRight } from "@/components/site/Icons";
import { WorkloadRows } from "@/components/home/WorkloadRows";
import { Estimator } from "@/components/home/Estimator";
import { homeFaq } from "@/content/faq";
import { HOME_DESCRIPTION, HOME_TITLE, appLd, faqLd, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ path: "/", title: HOME_TITLE, description: HOME_DESCRIPTION });

const STEPS = [
  {
    t: "Choose a workload",
    d: "Pick hashing, a prime sieve, an image resize or a JSON transform, and set its size. The settings become a job specification: plain data that fully decides the result.",
  },
  {
    t: "Queue it",
    d: "The scheduler lines jobs up and runs as many at once as you allow. A failed or stalled attempt is retried with a growing pause; cancel stops the worker on the spot.",
  },
  {
    t: "Watch it run",
    d: "Progress, wall time, worker busy time and throughput are measured while the job runs and kept in the Cloud Dashboard, next to live Robinhood Chain data.",
  },
  {
    t: "Record the proof",
    d: "Send the specification fingerprint, the result fingerprint and the measured duration to NimroJobLedger from your wallet. Anyone can rerun the job and compare.",
  },
];

export default function Home() {
  const faq = homeFaq();
  return (
    <Shell>
      <JsonLd data={[appLd, faqLd(faq)]} />
      <div className="nm-wrap nm-gutter">
        <section className="nm-hero" data-testid="hero">
          <div className="nm-hero-mark" aria-hidden="true">
            { }
            <img src={ASSETS.heroMark} alt="" width={1200} height={1200} />
          </div>
          <div className="relative">
            <h1 className="nm-h1 max-w-[1024px]">
              {BRAND.slogan}
              <span className="dim">Jobs run where you are.</span>
              <span className="dim">Proof stays on chain.</span>
            </h1>
            <p className="nm-lede mt-10 max-w-[576px]">
              <strong>{BRAND.name} runs real workloads in your browser and keeps the receipts.</strong> Queue hashing, sieving, image and JSON jobs, watch every metric, then
              record proof of a run on {BRAND.chainName}.
            </p>
          </div>
        </section>
        <Marquee />

        <section className="pt-14 pb-14 md:pt-20 md:pb-20" aria-labelledby="workloads-h">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <h2 id="workloads-h" className="nm-h2 lg">
              Pick a workload.
              <br />
              Run it as often as you like.
            </h2>
            <p className="nm-body max-w-[384px]">
              Four workloads run today, each inside a Web Worker on your own processor. Running is free; recording a proof costs only network gas. Two more are planned.
            </p>
          </div>
          <WorkloadRows />
          <p className="mt-6 text-[14px] leading-[22.75px] text-fg">Jobs use your device. Proofs use {BRAND.chainName} gas from your wallet. {BRAND.name} takes no fee.</p>
          <p className="nm-small mt-1">Planned rows are directions for the platform and cannot be started. Nothing on this page reserves a server.</p>
          <div className="mt-12 border-t border-line pt-12">
            <Estimator />
          </div>
        </section>

        <section className="nm-section" aria-labelledby="steps-h">
          <div className="nm-split">
            <div>
              <h2 id="steps-h" className="nm-h2 lg">
                From code
                <br />
                to compute.
              </h2>
              <p className="nm-body mt-6 max-w-[330px]">A job goes from a few settings to a measured, repeatable run with a public fingerprint.</p>
            </div>
            <ol className="nm-steps">
              {STEPS.map((s, i) => (
                <li key={s.t}>
                  <span className="n">{i + 1}.</span>
                  <div>
                    <h3 className="nm-h3">{s.t}</h3>
                    <p className="nm-body mt-2">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="nm-section" aria-labelledby="device-h">
          <div className="nm-split">
            <h2 id="device-h" className="nm-h2 lg">
              What does
              <br />
              “on your device” mean?
            </h2>
            <div>
              <p className="nm-body">
                Every job on this site runs in a background thread of your browser, using the processor and memory of the machine in front of you. The site sends the
                worker a specification and gets a result back; no job data travels to a server, and no server could finish the job for you.
              </p>
              <p className="nm-body mt-5">
                That makes the numbers honest: the dashboard measures your hardware, not a rented one. It also sets the limits. A phone runs smaller jobs than a desktop,
                and a closed tab ends the run. Hosted compute nodes, AI jobs and a developer API are planned so the same specifications can run elsewhere later.
              </p>
              <Link href="/docs" className="nm-link mt-6 inline-flex items-center gap-2 text-[14px]">
                How the job ledger works <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        <section className="nm-section" aria-labelledby="faq-h">
          <div className="nm-split">
            <h2 id="faq-h" className="nm-h2 lg">
              Before you start.
            </h2>
            <Faq items={faq} testid="home-faq" />
          </div>
        </section>

        <section className="nm-section" aria-labelledby="cta-h">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 id="cta-h" className="nm-h2 lg">
                Your workload.
                <span className="dim block">Your next run.</span>
              </h2>
              <p className="nm-body mt-6 max-w-[450px]">Start with one job. Add more when you need them. Record the runs that matter.</p>
            </div>
            <Link href="/run" className="nm-btn primary lg w-fit">
              Open the runner <ArrowRight />
            </Link>
          </div>
        </section>
      </div>
    </Shell>
  );
}
