import { useState } from "react";
import { accessCode, setAccessCode } from "../accessCode.ts";
import { checkAccessCode } from "../api.ts";

/** Shown on the hosted copy, where live AI needs an access code. */
export function AccessCode() {
  const [saved, setSaved] = useState(accessCode());
  const [draft, setDraft] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUse() {
    const code = draft.trim();
    setChecking(true);
    setError(null);
    try {
      if (await checkAccessCode(code)) {
        setAccessCode(code);
        setSaved(code);
        setDraft("");
      } else {
        setError("That code didn't work.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "The check failed.");
    } finally {
      setChecking(false);
    }
  }

  function onRemove() {
    setAccessCode("");
    setSaved("");
  }

  if (saved) {
    return (
      <div className="banner info no-print row">
        <span>Live AI is on in this browser (access code saved).</span>
        <button type="button" className="btn quiet" onClick={onRemove}>
          Remove code
        </button>
      </div>
    );
  }

  return (
    <div className="banner info no-print stack">
      <div>
        Live AI on this site needs an access code. No code? The <strong>Demo case</strong> works without one. Your
        documents go through this site's server to Anthropic's API (Claude) and aren't stored there.
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          void onUse();
        }}
      >
        <input
          type="password"
          aria-label="Access code"
          placeholder="Access code"
          autoComplete="off"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          style={{ maxWidth: 260 }}
        />
        <button type="submit" className="btn" disabled={!draft.trim() || checking}>
          {checking ? "Checking…" : "Use code"}
        </button>
        {error && <span style={{ color: "var(--bad-ink)" }}>{error}</span>}
      </form>
    </div>
  );
}
