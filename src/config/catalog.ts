import type { JobKind } from "@/lib/jobs/kinds";

/*
 * What the workload list shows. "live" rows run today on the visitor's device; "planned" rows describe services the
 * product knowledge names that do not exist yet. Change wording or order here only.
 */
export type CatalogRow =
  | { status: "live"; kind: JobKind; title: string; meta: string[]; blurb: string; tags: string[] }
  | { status: "planned"; id: string; title: string; meta: string[]; blurb: string; tags: string[] };

export const CATALOG: CatalogRow[] = [
  {
    status: "live",
    kind: "hash",
    title: "SHA-256 hashing",
    meta: ["Up to 64 MiB per block", "Runs on your device", "Proof on Robinhood Chain"],
    blurb: "Generate a seeded block of data and push it through chained SHA-256 rounds. A clean way to see how fast this machine moves bytes through a hash.",
    tags: ["CPU", "WebCrypto", "Deterministic"],
  },
  {
    status: "live",
    kind: "primes",
    title: "Prime sieve",
    meta: ["Up to 20 million", "Runs on your device", "Proof on Robinhood Chain"],
    blurb: "Sieve every number up to a limit you pick and get the prime count, the largest prime and a checksum anyone can rerun and compare.",
    tags: ["CPU", "Memory", "Deterministic"],
  },
  {
    status: "live",
    kind: "image",
    title: "Image resize and compress",
    meta: ["Sample or your own picture", "Runs on your device", "Proof on Robinhood Chain"],
    blurb: "Scale a generated sample or a picture from your disk with a bilinear filter, then encode WebP or JPEG. The picture never leaves the tab.",
    tags: ["Pixels", "OffscreenCanvas", "Deterministic pixels"],
  },
  {
    status: "live",
    kind: "json",
    title: "JSON transform",
    meta: ["Up to 64K characters", "Runs on your device", "Proof on Robinhood Chain"],
    blurb: "Filter, pick, sort, group, sum and limit an array of records with a short pipeline of fixed steps. No code is evaluated.",
    tags: ["Records", "Pipeline", "Deterministic"],
  },
  {
    status: "planned",
    id: "ai",
    title: "AI compute jobs",
    meta: ["Inference and batch processing", "Not available yet"],
    blurb: "Model inference and data processing jobs on rented compute. This is a direction for the platform, not a service you can use today.",
    tags: ["Planned"],
  },
  {
    status: "planned",
    id: "nodes",
    title: "Hosted compute nodes",
    meta: ["Workloads off your device", "Not available yet"],
    blurb: "Run the same job specifications on servers instead of a browser tab, with the same proof format. Planned; no node is running.",
    tags: ["Planned"],
  },
];
