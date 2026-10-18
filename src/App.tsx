import { useState } from "react";
import deckPhotoUrl from "../demo-files/deck-photo.jpg";
import { useAccessCodeRequired } from "./accessCode.ts";
import { AccessCode } from "./components/AccessCode.tsx";
import { ConfirmDialog } from "./components/ConfirmDialog.tsx";
import { Notice } from "./components/Notice.tsx";
import { demoPhotoDescription, demoReplay } from "./demo/demoReplay.ts";
import { generatePacket } from "./generate.ts";
import { useCases, type Tab } from "./state/caseStore.ts";
import { DescribeStep } from "./steps/DescribeStep.tsx";
import { EvidenceStep } from "./steps/EvidenceStep.tsx";
import { ReviewStep } from "./steps/ReviewStep.tsx";

const STEPS = ["Describe", "Add evidence", "Review packet"] as const;
type Step = 0 | 1 | 2;

export default function App() {
  const { tab, setTab, state, updateFor, reset, saveFailed, notice } = useCases();
  const update = updateFor(tab);
  const [steps, setSteps] = useState<Record<Tab, Step>>({ my: 0, demo: 0 });
  const step = steps[tab];
  const setStep = (s: Step) => setSteps((all) => ({ ...all, [tab]: s }));
  const [generating, setGenerating] = useState<Tab | null>(null);
  const [errors, setErrors] = useState<Record<Tab, string | null>>({ my: null, demo: null });
  const [confirming, setConfirming] = useState(false);
  const accessCodeRequired = useAccessCodeRequired();

  async function onGenerate() {
    const forTab = tab;
    setGenerating(forTab);
    setErrors((e) => ({ ...e, [forTab]: null }));
    const replay = forTab === "demo" ? demoReplay(state) : null;
    const failure = await generatePacket(state, updateFor(forTab), replay);
    setGenerating(null);
    if (failure) setErrors((e) => ({ ...e, [forTab]: failure }));
    else setSteps((all) => ({ ...all, [forTab]: 2 }));
  }

  function onConfirmClear() {
    reset(tab);
    setSteps((all) => ({ ...all, [tab]: 0 }));
    setErrors((e) => ({ ...e, [tab]: null }));
    setConfirming(false);
  }

  const isFirstUse = tab === "my" && !state.input.description && state.documents.length === 0 && !state.analysis;
  const error = errors[tab];

  return (
    <div className="page">
      <header className="header no-print">
        <div className="brand">
          Small Claims Copilot
          <small>Organize a California small claims case</small>
        </div>
        <div className="header-actions">
          <div className="tabs" role="tablist" aria-label="Case">
            {(["my", "demo"] as const).map((t) => (
              <button key={t} type="button" role="tab" className="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
                {t === "my" ? "My case" : "Demo case"}
              </button>
            ))}
          </div>
          <button type="button" className="btn quiet" onClick={() => setConfirming(true)} disabled={generating === tab}>
            {tab === "demo" ? "Reset demo" : "Clear case"}
          </button>
        </div>
      </header>
      <Notice />

      {notice && <div className="banner info no-print">{notice}</div>}
      {saveFailed && (
        <div className="banner error no-print" role="alert">
          Couldn't save. Your case works until you close this tab.
        </div>
      )}
      {accessCodeRequired && tab === "my" && <AccessCode />}
      {isFirstUse && (
        <div className="banner info no-print">
          New here? Open the <strong>Demo case</strong> tab to see a finished example with a fictional contractor dispute.
        </div>
      )}
      {tab === "demo" && (
        <div className="banner info no-print">
          Demo case: a fictional dispute with made-up documents. Generating it replays a saved AI run, so it's instant and
          free; once you edit it, it calls the AI like your own case. Reset demo restores it.
        </div>
      )}

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
      {step === 1 && (
        <EvidenceStep
          state={state}
          update={update}
          generating={generating === tab}
          onGenerate={onGenerate}
          savedPhotoDescription={tab === "demo" ? demoPhotoDescription : undefined}
          demoPhotoUrl={tab === "demo" ? deckPhotoUrl : undefined}
        />
      )}
      {step === 2 && <ReviewStep state={state} update={update} />}

      <ConfirmDialog
        open={confirming}
        title={tab === "demo" ? "Reset the demo case?" : "Clear your case?"}
        body={
          tab === "demo"
            ? "This restores the demo's original description, answers, and documents, and removes its packet."
            : "This permanently removes your description, answers, documents, and packet from this browser."
        }
        confirmLabel={tab === "demo" ? "Reset demo" : "Clear case"}
        onConfirm={onConfirmClear}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
