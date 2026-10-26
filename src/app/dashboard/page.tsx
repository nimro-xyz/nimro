import { BRAND } from "@/config/brand";
import { Shell } from "@/components/site/Page";
import { Dashboard } from "@/components/jobs/Dashboard";
import { GlyphGauge } from "@/components/site/Icons";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  path: "/dashboard",
  title: `Cloud dashboard | ${BRAND.name}`,
  description: `${BRAND.name} cloud dashboard: wall time, worker busy time, retries and throughput of the jobs you ran, next to live ${BRAND.chainName} data.`,
  noindex: true,
});

export default function DashboardPage() {
  return (
    <Shell>
      <div className="nm-wrap nm-gutter pt-14 pb-20 md:pt-20">
        <GlyphGauge size={28} className="text-muted" />
        <h1 className="nm-h2 lg mt-6 md:!text-[52px] md:!leading-[56px] md:!tracking-[-2px]">Cloud dashboard.</h1>
        <p className="nm-lede mt-4 max-w-[640px] !text-[16px] md:!text-[17px]">
          Real numbers from the jobs you ran in this browser: how long they took, how much of that was computing, what failed and what was retried. No wallet needed.
        </p>
        <div className="mt-12">
          <Dashboard />
        </div>
      </div>
    </Shell>
  );
}
