import { parseAbi } from "viem";

/*
 * ABIs the site needs. LEDGER_ABI mirrors contracts/src/NimroJobLedger.sol (src/lib/abi.test.ts checks it
 * against the compiled artifact so the two cannot drift apart).
 */
export const ERC20_ABI = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function owner() view returns (address)",
  "function getOwner() view returns (address)",
]);

export const FEED_ABI = parseAbi([
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
]);

export const LEDGER_ABI = parseAbi([
  "struct Run { address runner; uint8 kind; uint32 durationMs; uint64 recordedBlock; uint64 recordedAt; bytes32 specHash; bytes32 resultHash; }",
  "function record(bytes32 specHash, bytes32 resultHash, uint8 kind, uint32 durationMs) returns (uint256 id)",
  "function run(uint256 id) view returns (Run)",
  "function runCount() view returns (uint256)",
  "function runOf(address runner, bytes32 specHash, bytes32 resultHash) view returns (uint256)",
  "function specRunCount(bytes32 specHash) view returns (uint256)",
  "function specRuns(bytes32 specHash, uint256 offset, uint256 limit) view returns (uint256[])",
  "function runnerRunCount(address runner) view returns (uint256)",
  "function runnerRuns(address runner, uint256 offset, uint256 limit) view returns (uint256[])",
  "function chainBlock() view returns (uint64)",
  "function MAX_KIND() view returns (uint8)",
  "function MAX_PAGE() view returns (uint256)",
  "event JobRecorded(uint256 indexed id, address indexed runner, bytes32 indexed specHash, bytes32 resultHash, uint8 kind, uint32 durationMs, uint64 recordedBlock)",
  "error ZeroSpec()",
  "error ZeroResult()",
  "error UnknownKind(uint8 kind)",
  "error AlreadyRecorded(uint256 id)",
  "error UnknownRun(uint256 id)",
]);

export const ALL_ERRORS = LEDGER_ABI.filter((x) => x.type === "error");

/** Plain words for each custom error, shown instead of a selector. */
export const ERROR_WORDS: Record<string, string> = {
  ZeroSpec: "The job specification hash is empty. Run the job again.",
  ZeroResult: "The result hash is empty. Run the job again.",
  UnknownKind: "This job kind is not accepted by the ledger.",
  AlreadyRecorded: "This wallet already recorded this exact run. Its record is shown below.",
  UnknownRun: "No run exists with that id.",
};
