import Link from "next/link";
import { BRAND, CHAIN, explorerAddress } from "@/config/brand";
import { CONTRACTS, RECORD_GAS_ESTIMATE, ledgerLive } from "@/config/contracts";
import { Shell } from "@/components/site/Page";
import { JsonLd } from "@/components/JsonLd";
import { ArrowUpRight } from "@/components/site/Icons";
import { KINDS, KIND_IDS, KIND_INFO } from "@/lib/jobs/kinds";
import { breadcrumbLd, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  path: "/docs",
  title: `Docs | ${BRAND.name}`,
  description: `How ${BRAND.name} works: job specifications, the scheduler, result fingerprints, the NimroJobLedger contract on ${BRAND.chainName}, verification and what is planned.`,
});

const FUNCS = [
  ["record(bytes32 specHash, bytes32 resultHash, uint8 kind, uint32 durationMs)", "Stores one run for the caller and returns its id. Refuses empty hashes, an unknown kind, and the same caller recording the same spec and result twice."],
  ["run(uint256 id)", "The stored run: runner, kind, duration, chain block, timestamp, both hashes."],
  ["runOf(address runner, bytes32 specHash, bytes32 resultHash)", "The id a runner got for that spec and result, or 0."],
  ["specRuns(bytes32 specHash, uint256 offset, uint256 limit)", "Run ids for one specification, newest first, at most 100 per call."],
  ["runnerRuns(address runner, uint256 offset, uint256 limit)", "Run ids recorded by one address, newest first, at most 100 per call."],
  ["runCount(), specRunCount(bytes32), runnerRunCount(address)", "Totals for paging."],
  ["chainBlock()", "The chain's own block number (read from the ArbSys precompile, since block.number reports the parent chain here)."],
];

const PLANNED = [
  ["Hosted compute nodes", "Run the same specifications on servers, with the same fingerprints, so results stay comparable with browser runs."],
  ["AI compute jobs", "Inference and batch processing on rented hardware. Requires partners and pricing that do not exist yet."],
  ["Developer API", "Submit specifications and read results from other applications. No endpoint is open today."],
  ["Workload orchestration across devices", "Spread one batch over several machines a team controls, with the scheduler you use here."],
  [`${BRAND.symbol} utility`, "Compute credits, job payments or service access. Options only; see the token page."],
];

export default function DocsPage() {
  const live = ledgerLive();
  return (
    <Shell>
      <JsonLd data={breadcrumbLd([{ name: "Docs", path: "/docs" }])} />
      <div className="nm-wrap nm-gutter pt-14 pb-20 md:pt-16">
        <h1 className="nm-h2 lg md:!text-[44px] md:!leading-[52px]">How {BRAND.name} works.</h1>
        <p className="nm-lede mt-3 max-w-[720px] !text-[16px] md:!text-[17px]">
          Four parts: a job specification, a scheduler that runs it in Web Workers, fingerprints of the specification and the result, and a small contract on {BRAND.chainName} that
          stores those fingerprints.
        </p>

        <section className="nm-section mt-12" aria-labelledby="spec-h">
          <div className="nm-split">
            <h2 id="spec-h" className="nm-h2">
              Job specifications
            </h2>
            <div>
              <p className="nm-body">
                A specification is a small JSON object with a version, a kind and the settings of that kind. It fully decides the result: the data for hashing comes from a seed,
                the sample picture is generated from a seed, the resize filter uses integer arithmetic, and JSON steps are six fixed operations with no code evaluation. Any
                engine that follows the rules gets the same bytes.
              </p>
              <div className="mt-6 overflow-x-auto">
                <table className="nm-table min-w-[480px]">
                  <thead>
                    <tr>
                      <th>Kind</th>
                      <th>Id on chain</th>
                      <th>Counts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {KINDS.map((k) => (
                      <tr key={k}>
                        <td>{KIND_INFO[k].name}</td>
                        <td>{KIND_IDS[k]}</td>
                        <td className="text-muted">{KIND_INFO[k].unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="nm-section" aria-labelledby="sched-h">
          <div className="nm-split">
            <h2 id="sched-h" className="nm-h2">
              The scheduler
            </h2>
            <div className="flex flex-col gap-4">
              <p className="nm-body">Jobs wait in a queue and start in order while fewer than your chosen number are running. Each attempt gets its own Web Worker.</p>
              <p className="nm-body">An attempt that throws or passes its timeout is retried after 250 ms, then 500 ms, then 1 s, up to the attempts you set. A specification that can never succeed (for example invalid JSON) is not retried.</p>
              <p className="nm-body">Cancel terminates the worker, so the processor stops working at once. Wall time is measured by the page; busy time is measured inside the worker around the computation itself.</p>
            </div>
          </div>
        </section>

        <section className="nm-section" aria-labelledby="hash-h">
          <div className="nm-split">
            <h2 id="hash-h" className="nm-h2">
              Fingerprints
            </h2>
            <div className="flex flex-col gap-4">
              <p className="nm-body">
                The specification hash is keccak-256 of the specification written as canonical JSON (keys sorted, no spaces). The result hash is keccak-256 of the canonical JSON of{" "}
                <code>{`{ v: 1, kind, result }`}</code>.
              </p>
              <p className="nm-body">For pictures, the result covers the resized pixels, not the compressed file: encoders differ between browsers, the pixels do not. A picture you chose is identified in the specification by its SHA-256, so a verifier needs the same file.</p>
            </div>
          </div>
        </section>

        <section className="nm-section" aria-labelledby="ledger-h" id="ledger">
          <div className="nm-split">
            <h2 id="ledger-h" className="nm-h2">
              NimroJobLedger
            </h2>
            <div>
              <div className="nm-kv">
                <span>Address</span>
                <span>
                  {live ? (
                    <a className="nm-link font-mono" href={explorerAddress(CONTRACTS.ledger)} target="_blank" rel="noreferrer">
                      {CONTRACTS.ledger}
                    </a>
                  ) : (
                    "Not deployed yet. Proofs are practice signatures until it is."
                  )}
                </span>
              </div>
              <div className="nm-kv">
                <span>Network</span>
                <span>
                  {CHAIN.name} · chain id {CHAIN.id}
                </span>
              </div>
              <div className="nm-kv">
                <span>Owner, fee, upgrade</span>
                <span>None, none, none</span>
              </div>
              <div className="nm-kv">
                <span>Gas per record</span>
                <span>about {RECORD_GAS_ESTIMATE.toLocaleString("en-US")}</span>
              </div>
              <h3 className="nm-h3 mt-8">Functions</h3>
              <ul className="mt-3 flex flex-col gap-4">
                {FUNCS.map(([sig, d]) => (
                  <li key={sig}>
                    <code className="text-[12.5px] break-words text-fg">{sig}</code>
                    <p className="nm-body mt-1">{d}</p>
                  </li>
                ))}
              </ul>
              <h3 className="nm-h3 mt-8">Event</h3>
              <code className="mt-2 block text-[12.5px] break-words">JobRecorded(uint256 indexed id, address indexed runner, bytes32 indexed specHash, bytes32 resultHash, uint8 kind, uint32 durationMs, uint64 recordedBlock)</code>
              <p className="nm-body mt-6">
                What a record proves: this address claimed this specification produced this result, at this block. What it does not prove: that the result is correct (rerun it on{" "}
                <Link href="/verify" className="nm-link">
                  the verify page
                </Link>
                ) or that the duration is real (it is self-reported).
              </p>
            </div>
          </div>
        </section>

        <section className="nm-section" aria-labelledby="planned-h" id="planned">
          <div className="nm-split">
            <h2 id="planned-h" className="nm-h2">
              Planned, not live
            </h2>
            <ul className="flex flex-col">
              {PLANNED.map(([t, d]) => (
                <li key={t} className="border-b border-line py-5 first:pt-0">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="nm-h3">{t}</h3>
                    <span className="nm-small">Planned</span>
                  </div>
                  <p className="nm-body mt-2">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="nm-section" aria-labelledby="risk-h">
          <div className="nm-split">
            <h2 id="risk-h" className="nm-h2">
              Limits and risks
            </h2>
            <div className="flex flex-col gap-4">
              <p className="nm-body">Browser jobs are bounded by your device: large sieves or pictures can be slow on a phone, and a closed or sleeping tab stops work.</p>
              <p className="nm-body">Records on {CHAIN.name} are public and permanent. Do not record specifications that contain private data; a JSON input is part of its specification.</p>
              <p className="nm-body">The contract code has not been independently reviewed yet. Its tests (unit, fuzz, invariant and a fork test) are in the repository.</p>
              <p className="nm-body">
                {BRAND.symbol} has no live utility. Nothing on this site is an offer or a promise of value.{" "}
                <Link href="/token" className="nm-link inline-flex items-center gap-1">
                  Token page <ArrowUpRight size={12} />
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </Shell>
  );
}
