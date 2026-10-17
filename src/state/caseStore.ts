// Keeps My case and Demo case in the browser's localStorage under separate keys,
// so each survives closing the browser and neither affects the other.
import { useCallback, useEffect, useRef, useState } from "react";
import { CaseState, emptyCase } from "../../shared/schemas.ts";
import { demoCase } from "../demo/demoCase.ts";

export type Tab = "my" | "demo";
export type Update = (fn: (s: CaseState) => CaseState) => void;

// The demo key carries a version: when the demo story changes, browsers load the new
// demo (which matches the saved replay) instead of an outdated copy.
export const STORAGE_KEYS: Record<Tab, string> = { my: "scc:case:my", demo: "scc:case:demo:v2" };
const TAB_KEY = "scc:tab";

function initial(tab: Tab): CaseState {
  return tab === "demo" ? demoCase() : emptyCase();
}

/** Reads and validates a saved case. Corrupt or unreadable data starts fresh with a message. */
export function loadCase(storage: Storage | undefined, tab: Tab): { state: CaseState; notice?: string } {
  let raw: string | null;
  try {
    raw = storage?.getItem(STORAGE_KEYS[tab]) ?? null;
  } catch {
    return { state: initial(tab), notice: "This browser is blocking saved data, so your case won't be kept after you close the tab." };
  }
  if (!raw) return { state: initial(tab) };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    json = null;
  }
  const parsed = CaseState.safeParse(json);
  if (!parsed.success) {
    return { state: initial(tab), notice: "Your saved case couldn't be read, so this tab started fresh." };
  }
  // A document that was mid-extraction when the page closed is just unread now.
  const facts = Object.fromEntries(Object.entries(parsed.data.facts).filter(([, f]) => f.status !== "pending"));
  // A photo description can't resume: the original file isn't kept across page loads.
  const photos = parsed.data.photos.map((p) =>
    p.descriptionStatus === "pending"
      ? { ...p, descriptionStatus: "failed" as const, descriptionError: "Interrupted when the page closed. Add the photo again to describe it." }
      : p,
  );
  return { state: { ...parsed.data, facts, photos } };
}

export function saveCase(storage: Storage | undefined, tab: Tab, state: CaseState): boolean {
  try {
    storage?.setItem(STORAGE_KEYS[tab], JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function useCases() {
  const storage = browserStorage();
  const [loaded] = useState(() => ({ my: loadCase(storage, "my"), demo: loadCase(storage, "demo") }));
  const [cases, setCases] = useState<Record<Tab, CaseState>>({ my: loaded.my.state, demo: loaded.demo.state });
  const [tab, setTabState] = useState<Tab>(() => {
    try {
      return storage?.getItem(TAB_KEY) === "demo" ? "demo" : "my";
    } catch {
      return "my";
    }
  });
  const [saveFailed, setSaveFailed] = useState(false);
  const notice = loaded.my.notice ?? loaded.demo.notice;

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const ok = saveCase(storage, "my", cases.my) && saveCase(storage, "demo", cases.demo);
    setSaveFailed(!ok);
  }, [cases, storage]);

  const setTab = useCallback(
    (t: Tab) => {
      setTabState(t);
      try {
        storage?.setItem(TAB_KEY, t);
      } catch {
        // Remembering the tab is a convenience; ignore failures.
      }
    },
    [storage],
  );

  // Bound to one tab, so a generate started in Demo case keeps writing to Demo case.
  const updateFor = useCallback((t: Tab): Update => (fn) => setCases((c) => ({ ...c, [t]: fn(c[t]) })), []);
  const reset = useCallback((t: Tab) => setCases((c) => ({ ...c, [t]: initial(t) })), []);

  return { tab, setTab, state: cases[tab], updateFor, reset, saveFailed, notice };
}
