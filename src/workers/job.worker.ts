/// <reference lib="webworker" />
import { execute, SpecError } from "../lib/jobs/execute";
import type { JobSpec } from "../lib/jobs/kinds";

/*
 * One job per worker. The page posts { spec, source? }; the worker answers with progress messages and one final
 * reply. Busy time is measured here, inside the worker, so it covers the computation and not the queue.
 */

type In = { spec: JobSpec; source?: Uint8ClampedArray | null };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (event: MessageEvent<In>) => {
  const { spec, source } = event.data;
  const t0 = performance.now();
  try {
    let last = 0;
    const out = await execute(
      spec,
      (f) => {
        const now = performance.now();
        if (f >= 1 || now - last > 80) {
          last = now;
          ctx.postMessage({ type: "progress", f });
        }
      },
      source ?? null,
    );
    let output: { blob?: Blob; bytes?: number; type?: string } | undefined;
    if (spec.kind === "image" && out.extra?.pixels && typeof OffscreenCanvas !== "undefined") {
      const { pixels, width = 1, height = 1 } = out.extra;
      const canvas = new OffscreenCanvas(width, height);
      const g = canvas.getContext("2d");
      if (g) {
        g.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0);
        const type = spec.format === "webp" ? "image/webp" : "image/jpeg";
        const blob = await canvas.convertToBlob({ type, quality: spec.quality });
        output = { blob, bytes: blob.size, type: blob.type };
      }
    }
    const busyMs = performance.now() - t0;
    ctx.postMessage({ type: "done", reply: { ok: true, result: out.result, busyMs, units: out.units, output } });
  } catch (e) {
    ctx.postMessage({ type: "done", reply: { ok: false, error: e instanceof Error ? e.message : String(e), fatal: e instanceof SpecError } });
  }
};
