"use client";

import type { JobSpec } from "./kinds";
import type { Runner, WorkerReply } from "./scheduler";

/*
 * Browser side of the runner: one dedicated Web Worker per attempt (terminating it is how cancel and timeouts
 * stop real work), plus a small in-memory store for pictures the visitor picked. Picture bytes never leave the tab.
 */

export type Picture = { sha256: string; name: string; width: number; height: number; pixels: Uint8ClampedArray };
const pictures = new Map<string, Picture>();

export function rememberPicture(p: Picture) {
  pictures.set(p.sha256, p);
  // Keep memory bounded: the newest four pictures stay available.
  while (pictures.size > 4) pictures.delete(pictures.keys().next().value as string);
}
export function pictureFor(sha256: string) {
  return pictures.get(sha256) ?? null;
}

/** Decodes a picture file to RGBA pixels (scaled down so neither side passes `max`). */
export async function decodePicture(file: File, max = 4096): Promise<Picture> {
  if (!/^image\/(png|jpeg|webp|gif|avif|bmp)$/.test(file.type)) throw new Error("Choose a PNG, JPEG, WebP, GIF, AVIF or BMP picture.");
  if (file.size > 25 * 1024 * 1024) throw new Error("Pictures up to 25 MB.");
  const buf = await file.arrayBuffer();
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
  const sha256 = [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
  const bitmap = await createImageBitmap(new Blob([buf], { type: file.type }));
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  if (!g) throw new Error("This browser cannot read pictures.");
  g.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const pixels = g.getImageData(0, 0, width, height).data;
  return { sha256, name: file.name.slice(0, 80), width, height, pixels };
}

export function makeWorkerRunner(): Runner {
  let worker: Worker | null = null;
  return {
    run(spec: JobSpec, onProgress) {
      return new Promise<WorkerReply>((resolve) => {
        try {
          worker = new Worker(new URL("../../workers/job.worker.ts", import.meta.url), { type: "module" });
        } catch (e) {
          resolve({ ok: false, error: `Workers are not available here: ${(e as Error).message}` });
          return;
        }
        worker.onmessage = (ev: MessageEvent<{ type: string; f?: number; reply?: WorkerReply }>) => {
          if (ev.data.type === "progress" && typeof ev.data.f === "number") onProgress(ev.data.f);
          if (ev.data.type === "done" && ev.data.reply) {
            resolve(ev.data.reply);
            worker?.terminate();
            worker = null;
          }
        };
        worker.onerror = (ev) => {
          ev.preventDefault();
          resolve({ ok: false, error: ev.message || "The worker stopped." });
          worker?.terminate();
          worker = null;
        };
        const source = spec.kind === "image" && spec.source.type === "file" ? (pictureFor(spec.source.sha256)?.pixels ?? null) : null;
        worker.postMessage({ spec, source });
      });
    },
    terminate() {
      worker?.terminate();
      worker = null;
    },
  };
}
