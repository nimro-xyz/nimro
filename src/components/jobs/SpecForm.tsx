"use client";

import { useState } from "react";
import { decodePicture, rememberPicture } from "@/lib/jobs/browser";
import { LIMITS, type ImageSpec, type JobSpec, type JsonOp } from "@/lib/jobs/kinds";
import { CloseIcon } from "@/components/site/Icons";

/* Settings for each workload kind. Every field maps 1:1 onto the job specification. */

const num = (v: string) => (v.trim() === "" ? Number.NaN : Number(v));

function Field({ label, id, children, hint }: { label: string; id: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="min-w-0">
      <label className="nm-flabel" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint ? <p className="nm-small mt-1.5">{hint}</p> : null}
    </div>
  );
}

export function SpecForm({ spec, onChange }: { spec: JobSpec; onChange: (s: JobSpec) => void }) {
  switch (spec.kind) {
    case "hash":
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Block size (KiB)" id="f-size" hint={`${LIMITS.hashKiB.min} to ${LIMITS.hashKiB.max.toLocaleString("en-US")}`}>
            <input id="f-size" className="nm-field" type="number" value={Number.isNaN(spec.sizeKiB) ? "" : spec.sizeKiB} onChange={(e) => onChange({ ...spec, sizeKiB: num(e.target.value) })} />
          </Field>
          <Field label="Rounds" id="f-rounds" hint="1 to 64">
            <input id="f-rounds" className="nm-field" type="number" value={Number.isNaN(spec.rounds) ? "" : spec.rounds} onChange={(e) => onChange({ ...spec, rounds: num(e.target.value) })} />
          </Field>
          <Field label="Seed" id="f-seed" hint="Same seed, same data">
            <input id="f-seed" className="nm-field" type="number" value={Number.isNaN(spec.seed) ? "" : spec.seed} onChange={(e) => onChange({ ...spec, seed: num(e.target.value) })} />
          </Field>
        </div>
      );
    case "primes":
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Sieve up to" id="f-limit" hint={`${LIMITS.primes.min.toLocaleString("en-US")} to ${LIMITS.primes.max.toLocaleString("en-US")}`}>
            <input id="f-limit" className="nm-field" type="number" value={Number.isNaN(spec.limit) ? "" : spec.limit} onChange={(e) => onChange({ ...spec, limit: num(e.target.value) })} />
          </Field>
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
            {[1_000_000, 5_000_000, 20_000_000].map((n) => (
              <button key={n} type="button" className="nm-btn h-8 text-[13px]" onClick={() => onChange({ ...spec, limit: n })}>
                {n / 1_000_000}M
              </button>
            ))}
          </div>
        </div>
      );
    case "image":
      return <ImageForm spec={spec} onChange={onChange} />;
    case "json":
      return <JsonForm spec={spec} onChange={onChange} />;
  }
}

function ImageForm({ spec, onChange }: { spec: ImageSpec; onChange: (s: JobSpec) => void }) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const src = spec.source;
  const ratio = src.height / src.width;
  async function pick(file: File | undefined) {
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const p = await decodePicture(file);
      rememberPicture(p);
      const w = Math.min(spec.width, p.width);
      onChange({ ...spec, source: { type: "file", sha256: p.sha256, width: p.width, height: p.height, name: p.name }, width: w, height: Math.max(8, Math.round((w * p.height) / p.width)) });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={`nm-btn h-8 text-[13px] ${src.type === "sample" ? "!border-[#666]" : ""}`} onClick={() => onChange({ ...spec, source: { type: "sample", seed: 7, width: 2400, height: 1600 }, width: 640, height: 427 })}>
          Generated sample
        </button>
        <label className={`nm-btn h-8 cursor-pointer text-[13px] ${src.type === "file" ? "!border-[#666]" : ""}`}>
          {busy ? "Reading…" : "Choose a picture"}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} data-testid="image-file" />
        </label>
        <span className="nm-small min-w-0 truncate">
          {src.type === "sample" ? `Sample ${src.width}×${src.height}, seed ${src.seed}` : `${src.name} · ${src.width}×${src.height} · stays in this tab`}
        </span>
      </div>
      {err ? <p className="text-[13px] text-bad">{err}</p> : null}
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Width" id="f-w">
          <input
            id="f-w"
            className="nm-field"
            type="number"
            value={Number.isNaN(spec.width) ? "" : spec.width}
            onChange={(e) => {
              const w = num(e.target.value);
              onChange({ ...spec, width: w, height: Number.isNaN(w) ? spec.height : Math.max(8, Math.round(w * ratio)) });
            }}
          />
        </Field>
        <Field label="Height" id="f-h">
          <input id="f-h" className="nm-field" type="number" value={Number.isNaN(spec.height) ? "" : spec.height} onChange={(e) => onChange({ ...spec, height: num(e.target.value) })} />
        </Field>
        <Field label="Format" id="f-fmt">
          <select id="f-fmt" className="nm-field" value={spec.format} onChange={(e) => onChange({ ...spec, format: e.target.value as "webp" | "jpeg" })}>
            <option value="webp">WebP</option>
            <option value="jpeg">JPEG</option>
          </select>
        </Field>
        <Field label="Quality" id="f-q">
          <input id="f-q" className="nm-field" type="number" step={0.05} min={0.1} max={1} value={spec.quality} onChange={(e) => onChange({ ...spec, quality: Math.round(num(e.target.value) * 100) / 100 })} />
        </Field>
      </div>
      {src.type === "sample" ? (
        <Field label="Sample seed" id="f-sseed">
          <input id="f-sseed" className="nm-field sm:max-w-[200px]" type="number" value={src.seed} onChange={(e) => onChange({ ...spec, source: { ...src, seed: num(e.target.value) } })} />
        </Field>
      ) : null}
    </div>
  );
}

const OPS: JsonOp["op"][] = ["filter", "pick", "sort", "limit", "group", "sum"];

function blankOp(op: JsonOp["op"]): JsonOp {
  switch (op) {
    case "filter":
      return { op, path: "status", cmp: "eq", value: "done" };
    case "pick":
      return { op, fields: ["id"] };
    case "sort":
      return { op, path: "id", dir: "asc" };
    case "limit":
      return { op, n: 10 };
    case "group":
      return { op, path: "status" };
    case "sum":
      return { op, path: "ms" };
  }
}

function parseValue(v: string): string | number | boolean | null {
  const t = v.trim();
  if (t === "true") return true;
  if (t === "false") return false;
  if (t === "null") return null;
  if (t !== "" && Number.isFinite(Number(t))) return Number(t);
  return v;
}

function JsonForm({ spec, onChange }: { spec: Extract<JobSpec, { kind: "json" }>; onChange: (s: JobSpec) => void }) {
  const setOp = (i: number, op: JsonOp) => onChange({ ...spec, ops: spec.ops.map((o, k) => (k === i ? op : o)) });
  return (
    <div className="grid gap-4">
      <Field label="Input (a JSON array of records)" id="f-json" hint={`${spec.input.length.toLocaleString("en-US")} of ${LIMITS.jsonInput.toLocaleString("en-US")} characters`}>
        <textarea id="f-json" className="nm-field" value={spec.input} maxLength={LIMITS.jsonInput} onChange={(e) => onChange({ ...spec, input: e.target.value })} spellCheck={false} />
      </Field>
      <div>
        <p className="nm-flabel">Steps</p>
        <div className="flex flex-col gap-2">
          {spec.ops.map((o, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-line p-2">
              <span className="w-5 text-center text-[12px] text-muted">{i + 1}</span>
              <select aria-label={`Step ${i + 1} operation`} className="nm-field h-8 !w-[110px]" value={o.op} onChange={(e) => setOp(i, blankOp(e.target.value as JsonOp["op"]))}>
                {OPS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
              {o.op === "filter" ? (
                <>
                  <input aria-label="Field" className="nm-field h-8 !w-[120px]" value={o.path} onChange={(e) => setOp(i, { ...o, path: e.target.value })} />
                  <select aria-label="Comparison" className="nm-field h-8 !w-[100px]" value={o.cmp} onChange={(e) => setOp(i, { ...o, cmp: e.target.value as typeof o.cmp })}>
                    {["eq", "ne", "gt", "gte", "lt", "lte", "contains"].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input aria-label="Value" className="nm-field h-8 !w-[120px]" value={o.value === null ? "null" : String(o.value)} onChange={(e) => setOp(i, { ...o, value: parseValue(e.target.value) })} />
                </>
              ) : null}
              {o.op === "pick" ? (
                <input aria-label="Fields (comma separated)" className="nm-field h-8 min-w-[160px] flex-1" value={o.fields.join(", ")} onChange={(e) => setOp(i, { ...o, fields: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
              ) : null}
              {o.op === "sort" ? (
                <>
                  <input aria-label="Field" className="nm-field h-8 !w-[120px]" value={o.path} onChange={(e) => setOp(i, { ...o, path: e.target.value })} />
                  <select aria-label="Direction" className="nm-field h-8 !w-[90px]" value={o.dir} onChange={(e) => setOp(i, { ...o, dir: e.target.value as "asc" | "desc" })}>
                    <option value="asc">asc</option>
                    <option value="desc">desc</option>
                  </select>
                </>
              ) : null}
              {o.op === "limit" ? <input aria-label="Count" type="number" className="nm-field h-8 !w-[100px]" value={Number.isNaN(o.n) ? "" : o.n} onChange={(e) => setOp(i, { ...o, n: num(e.target.value) })} /> : null}
              {o.op === "group" || o.op === "sum" ? <input aria-label="Field" className="nm-field h-8 !w-[140px]" value={o.path} onChange={(e) => setOp(i, { ...o, path: e.target.value })} /> : null}
              <button type="button" className="nm-iconbtn ml-auto h-8 w-8" aria-label={`Remove step ${i + 1}`} onClick={() => onChange({ ...spec, ops: spec.ops.filter((_, k) => k !== i) })}>
                <CloseIcon size={14} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="nm-btn mt-2 h-8 text-[13px]" disabled={spec.ops.length >= LIMITS.jsonOps} onClick={() => onChange({ ...spec, ops: [...spec.ops, blankOp("filter")] })}>
          Add step
        </button>
      </div>
    </div>
  );
}
