import { BRAND } from "@/config/brand";
import { Shell } from "@/components/site/Page";
import { Runner } from "@/components/jobs/Runner";
import { KINDS, type JobKind } from "@/lib/jobs/kinds";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  path: "/run",
  title: `Run a job | ${BRAND.name}`,
  description: `${BRAND.name} runner: queue hashing, prime sieve, image and JSON jobs in Web Workers on your own device, with retries, cancel and proof on ${BRAND.chainName}.`,
  noindex: true,
});

export default async function RunPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const k = typeof sp.kind === "string" && (KINDS as string[]).includes(sp.kind) ? (sp.kind as JobKind) : null;
  const spec = typeof sp.spec === "string" && sp.spec.length < 10_000 ? sp.spec : null;
  return (
    <Shell>
      <div className="nm-wrap nm-gutter pt-14 pb-20 md:pt-16">
        <h1 className="nm-h2 lg md:!text-[44px] md:!leading-[52px]">Run a workload.</h1>
        <p className="nm-lede mt-3 max-w-[700px] !text-[16px] md:!text-[17px]">
          Jobs run in Web Workers on this device. Nothing you enter is uploaded; closing the tab stops the queue. Hosted compute nodes are planned.
        </p>
        <div className="mt-10">
          <Runner initialKind={k} initialSpec={spec} />
        </div>
      </div>
    </Shell>
  );
}
