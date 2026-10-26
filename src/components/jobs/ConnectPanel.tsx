"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CHAIN, explorerAddress, shortAddress } from "@/config/brand";
import { WALLET_CATALOG, catalogIcon } from "@/config/wallets";
import { WALLETCONNECT_RDNS, useWallet, type DiscoveredWallet } from "@/components/wallet/WalletProvider";
import { useWalletModal } from "@/components/wallet/WalletButton";
import { ArrowUpRight, ChevronRight, WalletIcon } from "@/components/site/Icons";

/** Wallet list in page form: detected wallets connect directly; anything else opens the site's wallet dialog. */
export function ConnectPanel() {
  const { wallets, connect, connecting, address, walletName, onRobinhoodChain, error } = useWallet();
  const { open } = useWalletModal();
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => {
    window.dispatchEvent(new Event("eip6963:requestProvider"));
  }, []);
  const detected = wallets.filter((w) => w.rdns !== WALLETCONNECT_RDNS);
  const fallback = WALLET_CATALOG.filter((c) => ["metamask", "coinbase", "rabby"].includes(c.id));

  async function pick(w: DiscoveredWallet) {
    setPending(w.rdns);
    await connect(w);
    setPending(null);
  }

  if (address)
    return (
      <div className="flex flex-col gap-4" data-testid="connect-done">
        <div className="nm-kv">
          <span>Wallet</span>
          <span>{walletName ?? "Connected"}</span>
        </div>
        <div className="nm-kv">
          <span>Address</span>
          <a className="nm-link font-mono" href={explorerAddress(address)} target="_blank" rel="noreferrer">
            {shortAddress(address, 8, 6)}
          </a>
        </div>
        <div className="nm-kv">
          <span>Network</span>
          <span className={onRobinhoodChain ? "text-ok" : "text-warn"}>{onRobinhoodChain ? CHAIN.name : "Other network: switch from the account menu"}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href="/dashboard" className="nm-btn primary">
            Open the dashboard <ArrowUpRight />
          </Link>
          <Link href="/run" className="nm-btn">
            Run a job
          </Link>
        </div>
      </div>
    );

  return (
    <div>
      <div className="nm-kv !py-4 !text-[14px]">
        <span>Sign-in method</span>
        <span className="text-fg">Wallet address</span>
      </div>
      <div className="mt-6 flex flex-col gap-2.5" data-testid="connect-list">
        {detected.length
          ? detected.map((w) => (
              <button key={w.rdns} type="button" className="nm-wrow !min-h-[68px]" disabled={connecting || Boolean(w.unsupported)} onClick={() => pick(w)}>
                { }
                {w.icon || catalogIcon(w.rdns) ? <img src={(w.icon || catalogIcon(w.rdns)) as string} alt="" width={40} height={40} /> : <span className="ph grid place-items-center bg-[#1d1d1d]"><WalletIcon size={16} /></span>}
                <span className="min-w-0 flex-1">
                  {w.name}
                  <small>{w.unsupported ? `Not supported · ${w.unsupported}` : pending === w.rdns ? "Check your wallet" : "Detected in this browser"}</small>
                </span>
                <ChevronRight size={16} />
              </button>
            ))
          : fallback.map((w) => (
              <button key={w.id} type="button" className="nm-wrow !min-h-[68px]" onClick={open}>
                { }
                <img src={`/wallets/${w.id}.webp`} alt="" width={40} height={40} />
                <span className="min-w-0 flex-1">
                  {w.name}
                  <small>Not detected · see options</small>
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
        <button type="button" className="nm-wrow !min-h-[56px]" onClick={open} data-testid="connect-more">
          <span className="ph grid place-items-center bg-[#1d1d1d]">
            <WalletIcon size={16} />
          </span>
          <span className="min-w-0 flex-1">
            More wallets
            <small>WalletConnect and install links</small>
          </span>
          <ChevronRight size={16} />
        </button>
      </div>
      {error ? <p className="nm-alert mt-4">{error}</p> : null}
      <p className="nm-small mt-4">Any EVM extension installed in this browser is listed here. Phantom cannot add {CHAIN.name} and is shown as not supported.</p>
    </div>
  );
}
