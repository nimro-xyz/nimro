import { keccak256, stringToBytes } from "viem";

/*
 * Canonical JSON: object keys sorted, no whitespace, no undefined values, finite numbers only. The same value
 * always gives the same text, so hashing the text gives a fingerprint anyone can recompute.
 */
export function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Numbers must be finite.");
    return JSON.stringify(value);
  }
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => (v === undefined ? "null" : canonicalJson(v))).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.keys(value as Record<string, unknown>)
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`);
    return `{${entries.join(",")}}`;
  }
  throw new Error(`Cannot encode a ${typeof value}.`);
}

/** keccak-256 of the canonical JSON text, as 0x-prefixed hex. */
export function fingerprint(value: unknown): `0x${string}` {
  return keccak256(stringToBytes(canonicalJson(value)));
}

export function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, "0");
  return s;
}
