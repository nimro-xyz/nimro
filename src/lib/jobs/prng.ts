/** mulberry32: small, fast, deterministic 32-bit generator. Same seed, same stream, on every device. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
}

/** Fills `out` with bytes from the seeded stream. */
export function fillBytes(out: Uint8Array, seed: number) {
  const next = mulberry32(seed);
  let i = 0;
  for (; i + 4 <= out.length; i += 4) {
    const v = next();
    out[i] = v & 255;
    out[i + 1] = (v >>> 8) & 255;
    out[i + 2] = (v >>> 16) & 255;
    out[i + 3] = v >>> 24;
  }
  if (i < out.length) {
    const v = next();
    for (let k = 0; i < out.length; i++, k++) out[i] = (v >>> (8 * k)) & 255;
  }
  return out;
}
