"use client";

import { useState } from "react";
import { BRAND, TOKEN, explorerToken, isAddress, shortAddress } from "@/config/brand";
import { ArrowUpRight, CheckIcon, CopyIcon } from "@/components/site/Icons";

/* Contract address of $NIMRO from BRAND.ca. Until it is a real address every copy button says "At launch". */

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!isAddress(BRAND.ca)) return;
    try {
      await navigator.clipboard.writeText(BRAND.ca);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard refused; the address stays visible.
    }
  };
  return { copied, copy };
}

/** Navbar pill: "$NIMRO 0x12…abcd [Copy]"; on phones only the short "CA" button. */
export function CaPill({ compact = false }: { compact?: boolean }) {
  const { copied, copy } = useCopy();
  const live = TOKEN.isLive;
  return (
    <span className={`nm-ca ${compact ? "compact" : ""}`} data-testid={compact ? "ca-chip" : "ca-pill"}>
      {compact ? null : (
        <>
          <b>{BRAND.symbol}</b>
          <span className="nm-mono">{live ? shortAddress(BRAND.ca, 4, 4) : "TBA"}</span>
        </>
      )}
      <button type="button" onClick={copy} disabled={!live} aria-label={live ? `Copy the ${BRAND.symbol} contract address` : `${BRAND.symbol} contract address: at launch`} title={live ? BRAND.ca : "The contract address is published at launch"}>
        {live && !compact ? copied ? <CheckIcon /> : <CopyIcon /> : null}
        {compact ? (live && copied ? "Copied" : "CA") : live ? (copied ? "Copied" : "Copy") : "At launch"}
      </button>
    </span>
  );
}

/** Full address row (footer, token page). */
export function CaBlock({ label = "Contract address" }: { label?: string }) {
  const { copied, copy } = useCopy();
  const live = TOKEN.isLive;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4" data-testid="ca-block">
      <div className="min-w-0">
        <p className="nm-label">{label}</p>
        {live ? (
          <a href={explorerToken(BRAND.ca)} target="_blank" rel="noreferrer" className="mt-2 inline-flex max-w-full items-center gap-3 font-mono text-[13px] break-all hover:underline md:text-[14px]">
            {BRAND.ca} <ArrowUpRight size={14} />
          </a>
        ) : (
          <p className="mt-2 text-[14px] text-fg">Contract address coming soon</p>
        )}
      </div>
      <button type="button" className="nm-btn" onClick={copy} disabled={!live} data-testid="ca-copy">
        {live ? copied ? <CheckIcon /> : <CopyIcon /> : null}
        {live ? (copied ? "Copied" : "Copy CA") : "At launch"}
      </button>
    </div>
  );
}
