import { canonicalJson } from "./canonical";
import { validateSpec, type JobSpec } from "./kinds";

/* Specifications travel in links as base64url of their canonical JSON. */

export const MAX_LINK_SPEC = 6_000;

export function encodeSpec(spec: JobSpec): string {
  const bytes = new TextEncoder().encode(canonicalJson(spec));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeSpec(text: string): JobSpec | null {
  try {
    const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return parseSpec(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

/** Parses pasted JSON into a specification, or null when it is not a valid one. */
export function parseSpec(text: string): JobSpec | null {
  try {
    const v = JSON.parse(text) as JobSpec;
    return v && typeof v === "object" && validateSpec(v) === null ? v : null;
  } catch {
    return null;
  }
}

export function verifyLink(spec: JobSpec): string | null {
  const enc = encodeSpec(spec);
  return enc.length <= MAX_LINK_SPEC ? `/verify?spec=${enc}` : null;
}
