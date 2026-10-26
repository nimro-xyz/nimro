import { BRAND, LAUNCHPAD, TOKEN } from "@/config/brand";
import { ledgerLive } from "@/config/contracts";
import type { Qa } from "@/components/site/Faq";

/* Visible Q&A text; the same strings feed the FAQPage structured data on the page that shows them. */

export function homeFaq(): Qa[] {
  return [
    {
      q: `What is ${BRAND.name}?`,
      a: `${BRAND.name} is a compute orchestration platform on ${BRAND.chainName}. Today it runs real workloads (hashing, a prime sieve, image resizing and JSON transforms) inside your own browser, schedules them, measures them, and lets you record a proof of each run on chain. Hosted compute nodes are planned.`,
    },
    {
      q: `How does ${BRAND.name} work?`,
      a: "You describe a job as a small specification. The scheduler queues it, starts a Web Worker for it, retries it when an attempt fails or times out, and stops it when you cancel. When the job finishes, the specification and the result are each reduced to a keccak-256 fingerprint that you can record in the NimroJobLedger contract.",
    },
    {
      q: "Where does my job actually run?",
      a: "On the device you are using, in a background thread of this browser tab. Nothing about the job is uploaded: not your JSON, not your picture, not the result. Close the tab and the work stops. Running on remote servers is a planned part of the platform, not something this site offers yet.",
    },
    {
      q: "What does recording a proof cost?",
      a: `Only ${BRAND.chainName} gas, paid from your own wallet, usually a small fraction of a cent. ${BRAND.name} charges no fee and the ledger contract cannot take one. Running jobs without recording them is free.`,
    },
    {
      q: "Does a recorded proof show the result is correct?",
      a: "It shows that a given address claimed a given specification produced a given result, at a given block. The duration is self-reported. Correctness is checked by recomputing: the verify page reruns the specification and compares the fingerprint with what was recorded.",
    },
    {
      q: `Which network is ${BRAND.name} on?`,
      a: `${BRAND.chainName} (chain id 4663), an Ethereum-compatible network that uses ETH for gas. The wallet dialog adds it to your wallet when you connect.`,
    },
    {
      q: `How do I buy ${BRAND.symbol}?`,
      a: TOKEN.isLive
        ? `${BRAND.symbol} is live on ${BRAND.chainName} at ${BRAND.ca}. It launched on ${LAUNCHPAD.name}, linked from the token page. Check that address on the explorer and buy only through that link or the official ${BRAND.xHandle} account.`
        : `${BRAND.symbol} has not launched yet. The contract address will be published on this site and on ${BRAND.xHandle}. Until then, any token using the name is not ours.`,
    },
    {
      q: "Has the code been independently reviewed?",
      a: `Not yet. The ${ledgerLive() ? "deployed" : "planned"} NimroJobLedger is small: no owner, no fee, no upgrade path, no funds held. Its tests (unit, fuzz, invariant and a fork test against ${BRAND.chainName}) ship with the source so anyone can run them.`,
    },
  ];
}

export function tokenFaq(): Qa[] {
  return [
    {
      q: `Has ${BRAND.symbol} launched, and what is its address?`,
      a: TOKEN.isLive ? `Yes. The contract address is ${BRAND.ca} on ${BRAND.chainName}. It is shown with a copy button at the top of this page.` : `Not yet. The address will appear at the top of this page and on ${BRAND.xHandle} at launch. Ignore any address shared elsewhere before that.`,
    },
    {
      q: `Do I need ${BRAND.symbol} to run jobs?`,
      a: `No. Every workload on this site runs without the token, and recording a proof only needs a little ETH for gas. Ideas that would connect the token to compute are listed above as planned.`,
    },
    {
      q: "What will the token be used for?",
      a: "The options under consideration are compute credits, paying for jobs on hosted nodes and access to a developer API. None of them is active, none is promised, and the list may change.",
    },
    {
      q: "Who controls the job ledger?",
      a: "No one. NimroJobLedger has no owner, no admin, no fee and no upgrade path. Anyone can record runs, and every record is public.",
    },
    {
      q: "Which token facts on this page are confirmed?",
      a: TOKEN.isLive ? `Name, symbol, decimals and total supply are read live from the token contract. The launch venue is ${LAUNCHPAD.name}; anything else (distribution) is stated only when it is published.` : "None yet: supply, decimals and holders are read from the chain once the contract address is published. Until then they show a dash.",
    },
  ];
}
