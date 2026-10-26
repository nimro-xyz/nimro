import Link from "next/link";
import { BRAND } from "@/config/brand";
import { Shell } from "@/components/site/Page";
import { ConnectPanel } from "@/components/jobs/ConnectPanel";
import { WalletIcon } from "@/components/site/Icons";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  path: "/connect",
  title: `Connect a wallet | ${BRAND.name}`,
  description: `Connect an EVM wallet to ${BRAND.name} to record proofs of your runs on ${BRAND.chainName}. Running jobs needs no wallet.`,
  noindex: true,
});

export default function ConnectPage() {
  return (
    <Shell>
      <div className="nm-wrap nm-gutter grid gap-14 pt-16 pb-24 md:grid-cols-[minmax(0,448px)_minmax(0,1fr)] md:gap-0 md:pt-24">
        <div className="min-w-0">
          <WalletIcon size={28} className="text-muted" />
          <h1 className="nm-h2 lg mt-8 md:!text-[48px] md:!leading-[52px] md:!tracking-[-2px]">Connect your wallet.</h1>
          <p className="nm-lede mt-4 !text-[16px]">Use the same address each time and your proofs line up on the dashboard. Running jobs works without it.</p>
          <div className="mt-10">
            <ConnectPanel />
          </div>
          <p className="mt-8 text-center text-[14px] text-muted">
            Just looking?{" "}
            <Link href="/run" className="nm-link">
              Run a job first
            </Link>
          </p>
        </div>
        <div className="min-w-0 md:ml-[96px] md:mt-[120px] md:border-l md:border-line md:pl-12">
          <h2 className="text-[20px] leading-7 font-medium">Your address. Nothing else.</h2>
          <p className="nm-body mt-6 !text-[15px] !leading-6">Connecting shares your public address with this page. There is no account to create, no password and no email.</p>
          <p className="nm-body mt-5 !text-[15px] !leading-6">Recording a proof opens a transaction in your wallet for you to read. It calls one function on NimroJobLedger, moves no tokens and sets no approvals.</p>
          <p className="nm-body mt-5 !text-[15px] !leading-6">Seed words and keys never leave your wallet app. This site never sees them and never asks for them.</p>
          <p className="nm-small mt-8 border-t border-line pt-6">Connecting is free. A recorded proof costs a little {BRAND.chainName} gas, paid in ETH by your wallet.</p>
        </div>
      </div>
    </Shell>
  );
}
