/*
 * Browser storage keys. Deliberately neutral (not the brand name), so renaming the project never
 * orphans what visitors' browsers already hold: run history, practice proofs, the wallet choice.
 */
const PREFIX = "nm1";
export const storageKey = (...parts: string[]) => [PREFIX, ...parts].join(".");
