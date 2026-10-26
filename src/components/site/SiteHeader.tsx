"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND } from "@/config/brand";
import { ASSETS } from "@/config/assets";
import { NAV } from "@/components/site/nav";
import { CaPill } from "@/components/site/CopyCa";
import { ArrowUpRight, CloseIcon, MenuIcon } from "@/components/site/Icons";
import { NavWallet, useWalletModal } from "@/components/wallet/WalletButton";
import { useWallet } from "@/components/wallet/WalletProvider";

export function SiteHeader() {
  const path = usePathname();
  // The menu belongs to the page it was opened on, so navigating closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === path;
  const setOpen = (v: boolean | ((cur: boolean) => boolean)) => setOpenOn((typeof v === "function" ? v(open) : v) ? path : null);
  const { open: openWallet } = useWalletModal();
  const { address } = useWallet();
  const current = (href: string) => (path === href || path.startsWith(`${href}/`) ? "page" : undefined);
  return (
    <>
      <a href="#main-content" className="nm-skip">
        Skip to content
      </a>
      <header className="nm-header">
        <div className="nm-wrap nm-gutter nm-header-row">
          <Link href="/" className={`nm-wordmark ${address ? "tight" : ""}`} aria-label={`${BRAND.name} home`}>
            { }
            <img src={ASSETS.mark} alt="" width={22} height={22} />
            <span className="txt">NIMRO</span>
          </Link>
          <nav className="nm-nav" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={current(n.href)}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="nm-header-end">
            <span className="nm-hide-sm">
              <CaPill />
            </span>
            <span className="nm-hide-sm">
              <NavWallet />
            </span>
            <span className="nm-only-sm">
              <CaPill compact />
            </span>
            {address ? (
              <span className="nm-only-sm">
                <NavWallet onlyConnected />
              </span>
            ) : null}
            <Link href="/run" className={`nm-btn primary ${address ? "nm-hide-sm" : ""}`} data-testid="nav-run">
              Run a job <ArrowUpRight />
            </Link>
            <button type="button" className="nm-iconbtn nm-only-sm" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)} data-testid="nav-menu">
              {open ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
            </button>
          </div>
        </div>
      </header>
      {open ? (
        <div className="nm-menu-panel nm-only-sm" data-testid="mobile-menu">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={current(n.href)}>
              {n.label}
            </Link>
          ))}
          <Link href="/run">Run a job</Link>
          <Link href="/verify">Verify a run</Link>
          {address ? null : (
            <button
              type="button"
              className="nm-menu-link"
              onClick={() => {
                setOpen(false);
                openWallet();
              }}
            >
              Connect wallet
            </button>
          )}
          <div className="pt-4">
            <CaPill />
          </div>
        </div>
      ) : null}
    </>
  );
}
