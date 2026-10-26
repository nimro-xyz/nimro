# Nimro — Building cloud infrastructure and workload orchestration for the onchain era.

From Code to Compute. Nimro runs real workloads in your browser, measures them, and lets you record a proof of each
run on Robinhood Chain.

## The problem

Compute claims are easy to make and hard to check. A benchmark screenshot, a "job finished" message or a dashboard
number says nothing about what actually ran, with which inputs, and whether anyone else would get the same result.

## The solution

Nimro treats every job as a small, deterministic **specification**. The same specification gives the same result on
any machine, so a result can be fingerprinted and checked by rerunning it. A tiny contract on Robinhood Chain,
**NimroJobLedger**, stores those fingerprints so a run can be shared and verified later.

## How it works

1. **Specification.** Four workloads today: SHA-256 hashing of a seeded data block, a prime sieve, a bilinear image
   resize (+ WebP/JPEG encode) and a JSON transform made of six fixed steps (no code evaluation).
2. **Scheduler.** A queue with a concurrency limit, retries with backoff, per-attempt timeouts and cancel. Each attempt
   runs in its own Web Worker on your device; cancel terminates the worker.
3. **Metrics.** Wall time, worker busy time, queue wait, retries and throughput, kept in your browser and shown on the
   Cloud Dashboard next to live Robinhood Chain data (block, gas price, ETH/USD from Chainlink).
4. **Fingerprints.** `specHash = keccak256(canonical JSON of the spec)`, `resultHash = keccak256(canonical JSON of
   {v, kind, result})`. For pictures the result covers the resized pixels, not the encoder output.
5. **Proof.** `record(specHash, resultHash, kind, durationMs)` on NimroJobLedger from your own wallet. The duration is
   self-reported; correctness is checked by rerunning on the verify page.

## What you can try

Live now:
- Run any of the four workloads, alone or in batches, with retries, timeouts, a fault drill and cancel.
- Watch the Cloud Dashboard (your device's real numbers) and the live block table.
- Verify a run: rerun a specification and compare its fingerprint.
- Connect an EVM wallet (Robinhood Chain is added on connect).

- Record a proof of a run on NimroJobLedger, live on Robinhood Chain mainnet.

Coming later (planned, not available):
- Hosted compute nodes, AI compute jobs, a developer API.
- $NIMRO utility (options: compute credits, job payments, service access). Nothing is promised.

## Run it locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run build
npm start            # http://localhost:5520
```

Download ZIP or fork this repository first. Every environment variable is optional; the site runs without any:

| Variable | Purpose |
| --- | --- |
| `ROBINHOOD_RPC_URL` | server-side Robinhood Chain RPC (default: public RPC) |
| `NEXT_PUBLIC_ROBINHOOD_RPC_URL` | browser RPC (default: public RPC) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | enables WalletConnect in the wallet dialog |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | shared rate-limit counters across server instances |

Put them in `.env.local` (never commit it) or in your host's environment settings. See `.env.example` for names.

Checks:

```bash
npm test             # unit tests (jobs, scheduler, metrics, relay, rate limits, ABI, deployment checks)
npx tsc --noEmit
npx eslint
```

Contracts (Foundry):

```bash
cd contracts && ./setup.sh
forge test --no-match-path 'test/fork/*'
forge test --match-path 'test/fork/*' --fork-url https://rpc.mainnet.chain.robinhood.com --evm-version cancun
```

After a forge build, `npm run contracts:artifacts` regenerates `src/lib/contracts/artifacts.json`.
To prove a deployed address runs this code: `npm run verify-deployment -- --ledger <address> --ledger-tx <tx hash>`.

## Network in your wallet

| Field | Value |
| --- | --- |
| Network name | Robinhood Chain |
| Chain ID | 4663 |
| Currency | ETH |
| RPC | https://rpc.mainnet.chain.robinhood.com |
| Explorer | https://robinhoodchain.blockscout.com |

## Project layout

```
contracts/          NimroJobLedger + unit, fuzz, invariant and fork tests (Foundry)
scripts/            artifact generator, verify-deployment
src/app/            pages: / /workloads /token /docs /run /dashboard /verify /connect, API routes
src/components/     site, wallet dialog (EIP-6963 + WalletConnect), runner, dashboard, verifier
src/config/         brand.ts (name, CA), contracts.ts (ledger address), catalog.ts, assets.ts
src/lib/jobs/       specifications, deterministic execution, scheduler, metrics, sharing
src/workers/        the Web Worker that runs one job
```

## Contracts and token

- **NimroJobLedger**: no constructor arguments, no owner, no fee, no pause, no upgrade path, holds no funds.
  Address: [`0xe63bb9d9aa27ec55b1a6f3e87d9ebadec5037ebc`](https://robinhoodchain.blockscout.com/address/0xe63bb9d9aa27ec55b1a6f3e87d9ebadec5037ebc)
  on Robinhood Chain (set in `src/config/contracts.ts`).
- **$NIMRO**: [`0x5a15a137ca9defd3cd9e592dac572abb89a9d4af`](https://robinhoodchain.blockscout.com/token/0x5a15a137ca9defd3cd9e592dac572abb89a9d4af)
  on Robinhood Chain, launched on Pons (set in `src/config/brand.ts`). It has no live utility.

## Security and status

- Jobs run on your device; nothing you enter is uploaded. Records on chain are public and permanent: do not record
  specifications that contain private data.
- The contract code has not been independently reviewed yet. Its tests ship with the source.
- The browser RPC relay (`/api/rpc`) is read-only, allowlisted and rate limited.

## Contributing

Issues and pull requests are welcome. Keep jobs deterministic (integer arithmetic, no locale-dependent comparisons), add
a test for every new workload or rule, and run the checks above before opening a pull request.

## License

MIT, see [LICENSE](LICENSE).
