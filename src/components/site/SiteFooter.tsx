import Link from "next/link";
import { BRAND, DOMAIN_LIVE, hasGithub } from "@/config/brand";
import { NAV } from "@/components/site/nav";
import { CaBlock } from "@/components/site/CopyCa";
import { ArrowUpRight } from "@/components/site/Icons";

export function SiteFooter() {
  return (
    <footer className="nm-footer">
      <div className="nm-footer-atmosphere" aria-hidden="true" />
      <div className="nm-wrap nm-gutter nm-footer-content">
        <div className="nm-footer-top">
          <p className="nm-footer-title">
            Your code, your device.
            <span>Proof on {BRAND.chainName}.</span>
          </p>
          <nav className="nm-footer-nav" aria-label="Footer">
            <Link href="/">Home</Link>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href}>
                {n.label}
              </Link>
            ))}
            <Link href="/verify">Verify</Link>
            <Link href="/connect">Connect</Link>
            <Link href="/docs">Docs</Link>
            <a href={BRAND.x} target="_blank" rel="noreferrer">
              X · {BRAND.xHandle} <ArrowUpRight />
            </a>
            {hasGithub ? (
              <a href={BRAND.github} target="_blank" rel="noreferrer">
                GitHub <ArrowUpRight />
              </a>
            ) : null}
            <Link href="/run" className="strong">
              Run a job <ArrowUpRight />
            </Link>
          </nav>
        </div>
        <div className="mt-10 border-t border-line pt-6">
          <CaBlock label={`${BRAND.symbol} contract address`} />
        </div>
        <Link href="/" className="nm-footer-wordmark" aria-label={`${BRAND.name} home`}>
          NIMRO
        </Link>
        <div className="nm-footer-bottom">
          <span>© 2026 {BRAND.name.toUpperCase()}</span>
          <span className="mid">Jobs run on your device. Hosted compute nodes are planned.</span>
          {DOMAIN_LIVE ? (
            <a href={BRAND.url}>
              {BRAND.domain} <ArrowUpRight />
            </a>
          ) : (
            <span>{BRAND.domain}</span>
          )}
        </div>
      </div>
    </footer>
  );
}
