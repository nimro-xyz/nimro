import { isAddress } from "@/config/brand";

/*
 * Nimro contract address on Robinhood Chain.
 *   ledger  NimroJobLedger, no constructor arguments, no owner, does not need the $NIMRO token,
 *           so it can be deployed before the token launches (from /deploy on localhost).
 * Empty => "Record proof" runs in practice mode (a wallet signature kept in this browser, nothing sent).
 * Filled => "Record proof" sends a real transaction from the user's wallet and /verify reads the chain.
 * Check a deployment any time: `npm run verify-deployment -- --ledger <address> --ledger-tx <tx>`.
 */
const DEPLOYED = {
  ledger: "0xe63bb9d9aa27ec55b1a6f3e87d9ebadec5037ebc",
  /** Block of the NimroJobLedger deployment (first block worth reading its events from). */
  ledgerBlock: 97404756,
};

/**
 * Local fork tests only: NEXT_PUBLIC_NIMRO_TEST_CONTRACTS='{"ledger":"0x…","ledgerBlock":1}' at build time
 * points a second build at a contract deployed on an anvil chain. Never set it on Vercel.
 */
function testOverride(): typeof DEPLOYED | null {
  const raw = process.env.NEXT_PUBLIC_NIMRO_TEST_CONTRACTS;
  if (!raw) return null;
  try {
    const v = { ...DEPLOYED, ...(JSON.parse(raw) as Partial<typeof DEPLOYED>) };
    return isAddress(v.ledger) ? v : null;
  } catch {
    return null;
  }
}

export const CONTRACTS = testOverride() ?? DEPLOYED;

export const ledgerLive = () => isAddress(CONTRACTS.ledger);

export const CONTRACT_NAMES = { ledger: "NimroJobLedger" } as const;

/** Gas the ledger's `record` used in tests (first record of a spec; later ones cost less). Shown as an estimate. */
export const RECORD_GAS_ESTIMATE = 253_000;
