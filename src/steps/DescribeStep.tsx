import type { CaseInput, CaseState } from "../../shared/schemas.ts";
import type { Update } from "../generate.ts";

const TRI_OPTIONS = [
  { value: "", label: "Not answered" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not_sure", label: "Not sure" },
] as const;

export function DescribeStep({ state, update, onNext }: { state: CaseState; update: Update; onNext: () => void }) {
  const input = state.input;
  const set = <K extends keyof CaseInput>(key: K, value: CaseInput[K]) =>
    update((s) => ({ ...s, input: { ...s.input, [key]: value } }));

  return (
    <section className="panel">
      <h2>Describe your dispute</h2>
      <p className="lede">
        A few sentences in your own words, plus a few quick questions. Anything except the description can be left blank
        or answered "not sure."
      </p>
      <div className="stack" style={{ gap: 18 }}>
        <label className="field">
          What happened?
          <span className="hint">Who you're in a dispute with, what was agreed, and what went wrong.</span>
          <textarea value={input.description} onChange={(e) => set("description", e.target.value)} />
        </label>
        <div className="grid-2">
          <label className="field">
            How much are you owed?
            <span className="hint">e.g. $2,800</span>
            <input type="text" value={input.amountOwed} onChange={(e) => set("amountOwed", e.target.value)} />
          </label>
          <label className="field">
            How long has it been overdue?
            <span className="hint">e.g. 6 weeks</span>
            <input type="text" value={input.overdue} onChange={(e) => set("overdue", e.target.value)} />
          </label>
          <label className="field">
            Has the other party said they won't pay?
            <select value={input.saidWontPay} onChange={(e) => set("saidWontPay", e.target.value as CaseInput["saidWontPay"])}>
              {TRI_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Do you know where the other party lives or does business?
            <span className="hint">Just yes or no. We never ask for the address.</span>
            <select
              value={input.knowsLocation}
              onChange={(e) => set("knowsLocation", e.target.value as CaseInput["knowsLocation"])}
            >
              {TRI_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="row">
          <button type="button" className="btn primary" onClick={onNext}>
            Next: add evidence
          </button>
        </div>
      </div>
    </section>
  );
}
