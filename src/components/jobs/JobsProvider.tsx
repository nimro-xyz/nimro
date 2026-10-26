"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { storageKey } from "@/config/storage";
import { makeWorkerRunner } from "@/lib/jobs/browser";
import type { JobSpec } from "@/lib/jobs/kinds";
import { pushHistory, toRecord, type RunRecord } from "@/lib/jobs/metrics";
import { JobScheduler, type Job, type SubmitOptions } from "@/lib/jobs/scheduler";

/*
 * One scheduler per tab, kept above the pages so jobs keep running while the visitor moves between the runner and
 * the dashboard. Finished runs go to a history in this browser's storage (capped); outputs such as compressed
 * pictures stay in memory only.
 */

const HISTORY_KEY = storageKey("history");
const SETTINGS_KEY = storageKey("runner");

type Settings = { concurrency: number; maxAttempts: number; timeoutSec: number };
type Ctx = {
  ready: boolean;
  jobs: Job[];
  history: RunRecord[];
  settings: Settings;
  cores: number | null;
  memoryGb: number | null;
  outputs: Map<string, Blob>;
  submit: (spec: JobSpec, opts?: SubmitOptions) => number | null;
  cancel: (id: number) => void;
  cancelAll: () => void;
  clearFinished: () => void;
  setSettings: (s: Partial<Settings>) => void;
  clearHistory: () => void;
  updateRecord: (id: string, patch: Partial<RunRecord>) => void;
};

const JobsContext = createContext<Ctx | null>(null);

function loadHistory(): RunRecord[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const v = raw ? (JSON.parse(raw) as RunRecord[]) : [];
    return Array.isArray(v) ? v.filter((r) => r && typeof r.id === "string" && typeof r.kind === "string") : [];
  } catch {
    return [];
  }
}
function saveHistory(list: RunRecord[]) {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked: the dashboard still shows this session's runs.
  }
}

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const scheduler = useRef<JobScheduler | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [history, setHistory] = useState<RunRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [settings, setSettingsState] = useState<Settings>({ concurrency: 2, maxAttempts: 3, timeoutSec: 60 });
  const [hw, setHw] = useState<{ cores: number | null; memoryGb: number | null }>({ cores: null, memoryGb: null });
  const [outputs] = useState(() => new Map<string, Blob>());

  useEffect(() => {
    const cores = typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : null;
    const memoryGb = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null;
    let saved: Partial<Settings> = {};
    try {
      saved = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "{}") as Partial<Settings>;
    } catch {
      saved = {};
    }
    const initial: Settings = {
      concurrency: Math.max(1, Math.min(16, Number(saved.concurrency) || Math.max(1, Math.min(4, Math.floor((cores ?? 2) / 2))))),
      maxAttempts: Math.max(1, Math.min(5, Number(saved.maxAttempts) || 3)),
      timeoutSec: Math.max(5, Math.min(300, Number(saved.timeoutSec) || 60)),
    };
    const s = new JobScheduler(makeWorkerRunner, { concurrency: initial.concurrency });
    scheduler.current = s;
    const offList = s.subscribe(setJobs);
    const offDone = s.onFinished((job) => {
      const rec = toRecord(job);
      const blob = job.output?.blob;
      if (blob) {
        outputs.set(rec.id, blob);
        // Bounded: keep the newest 12 outputs in memory.
        while (outputs.size > 12) outputs.delete(outputs.keys().next().value as string);
      }
      setHistory((h) => {
        const next = pushHistory(h, rec);
        saveHistory(next);
        return next;
      });
    });
    // State setup after the browser-only scheduler exists (storage, hardware and workers are client-side).
    /* eslint-disable react-hooks/set-state-in-effect */
    setHistory(loadHistory());
    setSettingsState(initial);
    setHw({ cores, memoryGb });
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const onStorage = (e: StorageEvent) => {
      if (e.key === HISTORY_KEY) setHistory(loadHistory());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      offList();
      offDone();
      s.cancelAll();
      window.removeEventListener("storage", onStorage);
    };
  }, [outputs]);

  const submit = useCallback(
    (spec: JobSpec, opts?: SubmitOptions) =>
      scheduler.current ? scheduler.current.submit(spec, { maxAttempts: settings.maxAttempts, timeoutMs: settings.timeoutSec * 1000, ...opts }) : null,
    [settings],
  );
  const cancel = useCallback((id: number) => void scheduler.current?.cancel(id), []);
  const cancelAll = useCallback(() => scheduler.current?.cancelAll(), []);
  const clearFinished = useCallback(() => scheduler.current?.clearFinished(), []);
  const setSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState((cur) => {
      const next = { ...cur, ...patch };
      try {
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        // not persisted; still applied
      }
      scheduler.current?.setConcurrency(next.concurrency);
      return next;
    });
  }, []);
  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
    outputs.clear();
  }, [outputs]);
  const updateRecord = useCallback((id: string, patch: Partial<RunRecord>) => {
    setHistory((h) => {
      const next = h.map((r) => (r.id === id ? { ...r, ...patch } : r));
      saveHistory(next);
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({ ready, jobs, history, settings, cores: hw.cores, memoryGb: hw.memoryGb, outputs: outputs, submit, cancel, cancelAll, clearFinished, setSettings, clearHistory, updateRecord }),
    [ready, jobs, history, settings, hw, outputs, submit, cancel, cancelAll, clearFinished, setSettings, clearHistory, updateRecord],
  );
  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobs() {
  const c = useContext(JobsContext);
  if (!c) throw new Error("useJobs must be used inside JobsProvider");
  return c;
}
