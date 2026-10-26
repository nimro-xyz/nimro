import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, fingerprint } from "./canonical";
import { execute, resizeBilinear, runJson, runPrimes, samplePixels, SpecError } from "./execute";
import { DEFAULT_SPECS, resultHash, specHash, validateSpec, type JobSpec } from "./kinds";
import { fillBytes } from "./prng";

test("canonical JSON sorts keys and drops undefined", () => {
  assert.equal(canonicalJson({ b: 1, a: [1, { d: undefined, c: "x" }] }), '{"a":[1,{"c":"x"}],"b":1}');
  assert.equal(fingerprint({ a: 1, b: 2 }), fingerprint({ b: 2, a: 1 }));
  assert.throws(() => canonicalJson({ a: Infinity }));
});

test("seeded bytes are stable", () => {
  const a = fillBytes(new Uint8Array(37), 42);
  const b = fillBytes(new Uint8Array(37), 42);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, fillBytes(new Uint8Array(37), 43));
});

test("prime sieve counts match known values", () => {
  const r = runPrimes({ v: 1, kind: "primes", limit: 1000 }).result as { count: number; largest: number };
  assert.equal(r.count, 168);
  assert.equal(r.largest, 997);
  const m = runPrimes({ v: 1, kind: "primes", limit: 1_000_000 }).result as { count: number; largest: number };
  assert.equal(m.count, 78498);
  assert.equal(m.largest, 999983);
});

test("hash job is deterministic and depends on the seed", async () => {
  const spec: JobSpec = { v: 1, kind: "hash", sizeKiB: 16, rounds: 3, seed: 9 };
  const a = await execute(spec);
  const b = await execute(spec);
  assert.deepEqual(a.result, b.result);
  const c = await execute({ ...spec, seed: 10 });
  assert.notDeepEqual(a.result, c.result);
  assert.equal(a.units, (16 * 1024 + 32) * 3);
});

test("image resize: identity keeps pixels, results are deterministic", async () => {
  const px = samplePixels(3, 20, 10);
  assert.deepEqual(resizeBilinear(px, 20, 10, 20, 10), px);
  const spec: JobSpec = { v: 1, kind: "image", source: { type: "sample", seed: 3, width: 300, height: 200 }, width: 64, height: 40, format: "webp", quality: 0.8 };
  const a = await execute(spec);
  const b = await execute(spec);
  assert.deepEqual(a.result, b.result);
  assert.equal(a.extra?.pixels?.length, 64 * 40 * 4);
});

test("image from a file needs the decoded pixels", async () => {
  const spec: JobSpec = { v: 1, kind: "image", source: { type: "file", sha256: "a".repeat(64), width: 4, height: 4, name: "x.png" }, width: 8, height: 8, format: "jpeg", quality: 0.5 };
  await assert.rejects(execute(spec), SpecError);
  const ok = await execute(spec, () => {}, new Uint8ClampedArray(64).fill(200));
  assert.equal((ok.result as { width: number }).width, 8);
});

test("json pipeline: filter, sort, pick, group, sum, limit", () => {
  const input = JSON.stringify([
    { id: 1, t: "a", n: 5, o: { x: 1 } },
    { id: 2, t: "b", n: 1 },
    { id: 3, t: "a", n: 9 },
    { id: 4, t: "c", n: "z" },
  ]);
  const r = runJson({ v: 1, kind: "json", input, ops: [{ op: "filter", path: "t", cmp: "eq", value: "a" }, { op: "sort", path: "n", dir: "desc" }, { op: "pick", fields: ["id", "o.x"] }] });
  assert.deepEqual(r.result, [{ id: 3 }, { id: 1, o: { x: 1 } }]);
  const g = runJson({ v: 1, kind: "json", input, ops: [{ op: "group", path: "t" }] });
  assert.deepEqual(g.result, [{ key: "a", count: 2 }, { key: "b", count: 1 }, { key: "c", count: 1 }]);
  const s = runJson({ v: 1, kind: "json", input, ops: [{ op: "sum", path: "n" }] });
  assert.deepEqual(s.result, { field: "n", sum: 15, counted: 3, of: 4 });
  const l = runJson({ v: 1, kind: "json", input, ops: [{ op: "limit", n: 1 }] });
  assert.equal((l.result as unknown[]).length, 1);
  const c = runJson({ v: 1, kind: "json", input, ops: [{ op: "filter", path: "n", cmp: "gt", value: 4 }] });
  assert.equal((c.result as unknown[]).length, 2);
  assert.throws(() => runJson({ v: 1, kind: "json", input, ops: [{ op: "sum", path: "n" }, { op: "limit", n: 1 }] }), SpecError);
  assert.throws(() => runJson({ v: 1, kind: "json", input: "{", ops: [] }), SpecError);
  assert.throws(() => runJson({ v: 1, kind: "json", input: "{}", ops: [] }), SpecError);
});

test("json paths never reach the prototype", () => {
  const r = runJson({ v: 1, kind: "json", input: '[{"a":1}]', ops: [{ op: "pick", fields: ["constructor", "a"] }] });
  assert.deepEqual(r.result, [{ a: 1 }]);
});

test("validation rejects out-of-range specs", () => {
  for (const k of Object.values(DEFAULT_SPECS)) assert.equal(validateSpec(k), null);
  assert.ok(validateSpec({ v: 1, kind: "primes", limit: 10 }));
  assert.ok(validateSpec({ v: 1, kind: "hash", sizeKiB: 0, rounds: 1, seed: 1 }));
  assert.ok(validateSpec({ v: 1, kind: "hash", sizeKiB: 1, rounds: 1, seed: -1 }));
  assert.ok(validateSpec({ v: 1, kind: "json", input: "[]", ops: [{ op: "pick", fields: ["a b"] }] }));
  assert.ok(validateSpec({ v: 1, kind: "json", input: "x".repeat(70_000), ops: [] }));
  assert.ok(validateSpec({ v: 1, kind: "image", source: { type: "sample", seed: 1, width: 5000, height: 10 }, width: 10, height: 10, format: "webp", quality: 0.5 }));
});

test("spec and result hashes are 32-byte hex and differ by kind", () => {
  const s = specHash(DEFAULT_SPECS.primes);
  assert.match(s, /^0x[0-9a-f]{64}$/);
  assert.notEqual(resultHash("hash", { a: 1 }), resultHash("json", { a: 1 }));
});

import { decodeSpec, encodeSpec, parseSpec } from "./share";

test("spec links round-trip and reject junk", () => {
  for (const s of Object.values(DEFAULT_SPECS)) assert.deepEqual(decodeSpec(encodeSpec(s)), JSON.parse(canonicalJson(s)));
  assert.equal(decodeSpec("!!!"), null);
  assert.equal(parseSpec('{"v":1,"kind":"primes","limit":5}'), null);
});
