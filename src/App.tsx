import { useState } from "react";
import { emptyCase, type CaseState } from "../shared/schemas.ts";
import { Notice } from "./components/Notice.tsx";
import { EvidenceStep } from "./steps/EvidenceStep.tsx";

const STEPS = ["Describe", "Add evidence", "Review packet"] as const;
type Step = 0 | 1 | 2;

export default function App() {
  const [state, setState] = useState<CaseState>(emptyCase);
  const [step, setStep] = useState<Step>(1);

  return (
    <div className="page">
      <header className="header no-print">
        <div className="brand">
          Small Claims Copilot
          <small>Organize a California small claims case</small>
        </div>
      </header>
      <Notice />

      <nav className="stepper no-print" aria-label="Steps">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            className="step"
            aria-current={step === i ? "step" : undefined}
            onClick={() => setStep(i as Step)}
          >
            <span className="num">{i + 1}</span> {label}
          </button>
        ))}
      </nav>

      {step === 1 ? (
        <EvidenceStep state={state} update={(fn) => setState(fn)} />
      ) : (
        <section className="panel">
          <h2>{STEPS[step]}</h2>
          <p className="lede">This step isn't built yet.</p>
        </section>
      )}
    </div>
  );
}
