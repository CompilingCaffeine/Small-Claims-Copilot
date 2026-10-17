import { useCallback, useState } from "react";
import { emptyCase, type CaseState } from "../shared/schemas.ts";
import { Notice } from "./components/Notice.tsx";
import { generatePacket, type Update } from "./generate.ts";
import { DescribeStep } from "./steps/DescribeStep.tsx";
import { EvidenceStep } from "./steps/EvidenceStep.tsx";
import { ReviewStep } from "./steps/ReviewStep.tsx";

const STEPS = ["Describe", "Add evidence", "Review packet"] as const;
type Step = 0 | 1 | 2;

export default function App() {
  const [state, setState] = useState<CaseState>(emptyCase);
  const update: Update = useCallback((fn) => setState(fn), []);

  const [step, setStep] = useState<Step>(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onGenerate() {
    setGenerating(true);
    setError(null);
    const failure = await generatePacket(state, update);
    setGenerating(false);
    if (failure) setError(failure);
    else setStep(2);
  }

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

      {error && (
        <div className="banner error no-print" role="alert">
          {error} Your inputs are saved{state.analysis ? " and your previous packet is still there" : ""}.
        </div>
      )}

      {step === 0 && <DescribeStep state={state} update={update} onNext={() => setStep(1)} />}
      {step === 1 && <EvidenceStep state={state} update={update} generating={generating} onGenerate={onGenerate} />}
      {step === 2 && <ReviewStep state={state} />}
    </div>
  );
}
