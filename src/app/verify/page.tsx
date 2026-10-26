import { BRAND } from "@/config/brand";
import { Shell } from "@/components/site/Page";
import { Verifier } from "@/components/jobs/Verifier";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  path: "/verify",
  title: `Verify a run | ${BRAND.name}`,
  description: `Rerun a ${BRAND.name} job specification on your device and compare its result fingerprint with the runs recorded on ${BRAND.chainName}.`,
  noindex: true,
});

export default async function VerifyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const spec = typeof sp.spec === "string" && sp.spec.length < 10_000 ? sp.spec : null;
  return (
    <Shell>
      <div className="nm-wrap nm-gutter pt-14 pb-20 md:pt-16">
        <h1 className="nm-h2 lg md:!text-[44px] md:!leading-[52px]">Verify a run.</h1>
        <p className="nm-lede mt-3 max-w-[700px] !text-[16px] md:!text-[17px]">
          A recorded proof is a claim. Rerunning the same specification is the check: if the result fingerprint matches, the recorded result is the right one.
        </p>
        <div className="mt-10">
          <Verifier initial={spec} />
        </div>
      </div>
    </Shell>
  );
}
