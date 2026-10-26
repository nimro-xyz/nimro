"use client";

import { useChain } from "@/components/providers/ChainProvider";
import { BRAND, LAUNCHPAD, TOKEN, buyUrl } from "@/config/brand";
import { RECORD_GAS_ESTIMATE } from "@/config/contracts";
import { ArrowRight } from "@/components/site/Icons";

function supplyText(supply: string | null | undefined, decimals: number | null | undefined) {
  if (!supply || decimals === null || decimals === undefined) return null;
  const whole = BigInt(supply) / 10n ** BigInt(decimals);
  return whole.toLocaleString("en-US");
}

/** Total supply as read from the token contract (a dash before launch). */
export function SupplyValue({ suffix = true }: { suffix?: boolean }) {
  const { facts } = useChain();
  const s = TOKEN.isLive ? supplyText(facts?.token?.supply, facts?.token?.decimals) : null;
  return <span data-testid="token-supply">{s ? `${s}${suffix ? ` ${facts?.token?.symbol ?? BRAND.ticker}` : ""}` : TOKEN.isLive ? "…" : "Read from chain at launch"}</span>;
}

export function TokenFacts() {
  const { facts } = useChain();
  const t = TOKEN.isLive ? facts?.token : null;
  return (
    <div>
      <div className="nm-kv">
        <span>Name on chain</span>
        <span>{t?.name ?? "—"}</span>
      </div>
      <div className="nm-kv">
        <span>Symbol on chain</span>
        <span>{t?.symbol ?? "—"}</span>
      </div>
      <div className="nm-kv">
        <span>Decimals</span>
        <span>{t?.decimals ?? "—"}</span>
      </div>
      <div className="nm-kv">
        <span>Launch venue</span>
        <span>
          {buyUrl() ? (
            <a href={buyUrl()!} target="_blank" rel="noreferrer" className="underline underline-offset-4" data-testid="buy-launchpad">
              {LAUNCHPAD.name} ↗
            </a>
          ) : (
            "To be announced"
          )}
        </span>
      </div>
    </div>
  );
}

export function DonutCenter() {
  const { facts } = useChain();
  const s = TOKEN.isLive ? supplyText(facts?.token?.supply, facts?.token?.decimals) : null;
  return (
    <>
      <p className="text-[44px] leading-none font-normal tracking-tight md:text-[56px]">{s ? (Number(s.replace(/,/g, "")) >= 1e9 ? `${(Number(s.replace(/,/g, "")) / 1e9).toFixed(2)}B` : s) : "—"}</p>
      <p className="nm-small mt-3">{s || TOKEN.isLive ? "total supply, read live" : "total supply at launch"}</p>
    </>
  );
}

/** What one proof costs right now: measured gas × live gas price, in ETH and USD. */
export function ProofCost() {
  const { facts } = useChain();
  const eth = facts?.gasGwei ? (RECORD_GAS_ESTIMATE * facts.gasGwei) / 1e9 : null;
  const usd = eth !== null && facts?.ethUsd ? eth * facts.ethUsd : null;
  return (
    <div className="border-t border-b border-line py-8">
      <p className="nm-small">Live estimate · not a quote</p>
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-4">
        <div>
          <p className="text-[32px] leading-10 tracking-tight">{RECORD_GAS_ESTIMATE.toLocaleString("en-US")}</p>
          <p className="nm-small mt-2">gas for one record</p>
        </div>
        <ArrowRight size={16} className="mt-3 text-muted" />
        <div className="text-right">
          <p className="text-[32px] leading-10 tracking-tight" data-testid="proof-cost">
            {usd !== null ? `$${usd < 0.01 ? usd.toFixed(4) : usd.toFixed(2)}` : "—"}
          </p>
          <p className="nm-small mt-2">{eth !== null ? `${eth.toFixed(8)} ETH at ${facts?.gasGwei?.toFixed(4)} gwei` : "waiting for the gas price"}</p>
        </div>
      </div>
    </div>
  );
}
