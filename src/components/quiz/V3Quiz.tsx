/**
 * V3Quiz — Quick (Q1–Q4) + Advanced refinement over the SAME CanonicalProfile.
 * The store holds the canonical v3 profile; this component only edits it.
 * Submit POSTs { schemaVersion:"v3", profile } — the single recommendation path.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Gamepad2, Clapperboard, Brain, Box, Code2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useV3QuizStore, QUICK_STEPS, budgetRangeError } from "@/store/useV3QuizStore";
import { advancedSectionsFor } from "@/lib/recommend/v3/quiz";
import { interpretProfile } from "@/lib/recommend/v3/interpret";
import { ReviewSummary } from "@/components/quiz/ReviewSummary";
import { readValidated, writeValidated } from "@/lib/storage";
import { writeBinding } from "@/lib/result-binding";
import { setClientRegion } from "@/lib/region-store";
import { CanonicalProfileSchema } from "@/lib/recommend/v3/validate";
import { REGIONS, type RegionConfig } from "@/lib/regions";
import type { CanonicalProfile, Q3Pick, Requirement, WorkloadId } from "@/lib/recommend/v3/types";
import { cn } from "@/lib/utils";

const WORKLOAD_CARDS: Array<{ id: WorkloadId; label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "dev", label: "Coding & software", description: "Apps, websites, code. Needs a fast processor and plenty of memory.", icon: Code2 },
  { id: "gaming", label: "Gaming", description: "Play games, from competitive shooters to big story adventures.", icon: Gamepad2 },
  { id: "ai-ml", label: "AI & machine learning", description: "Run or train AI models on your own machine. Needs strong graphics.", icon: Brain },
  { id: "video-photo", label: "Video & photo editing", description: "Cut video, edit photos. Needs a great screen and room for files.", icon: Clapperboard },
  { id: "cad-3d", label: "3D & design work", description: "Model, render, CAD. Needs strong graphics.", icon: Box },
  { id: "study-office", label: "Study, work & everyday use", description: "Documents, classes, browsing, video calls. Battery and portability matter.", icon: Briefcase },
];

const Q3_OPTIONS: Array<{ id: Q3Pick; label: string; hint: string }> = [
  { id: "speed", label: "Speed", hint: "Fast for demanding work" },
  { id: "battery", label: "Battery life", hint: "Lasts all day unplugged" },
  { id: "carry", label: "Light & portable", hint: "Easy to carry around" },
  { id: "screen", label: "Great screen", hint: "Sharp and vivid display" },
  { id: "build", label: "Solid build", hint: "Feels durable, built to last" },
  { id: "value", label: "Good value", hint: "The most for my money" },
];

const RAM_OPTIONS = [16, 32, 64];
const STORAGE_OPTIONS = [512, 1024, 2048];
const OS_OPTIONS = [
  { value: "windows", label: "Windows" },
  { value: "macos", label: "macOS" },
  { value: "linux", label: "Linux" },
  { value: "chromeos", label: "ChromeOS" },
];
const WEIGHT_OPTIONS = [1.3, 1.5, 1.8, 2.0];
const PORT_OPTIONS = ["usb-c", "usb-a", "hdmi", "sd-card", "ethernet", "displayport", "headphone"];
const IMPORTANCE: Array<"primary" | "secondary" | "occasional"> = ["primary", "secondary", "occasional"];

function Chip({ active, onClick, children, label }: { active: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        "rounded border px-3 py-2 text-sm transition",
        active ? "border-accent bg-accent/10 text-accent" : "border-border bg-card text-muted hover:border-border-strong",
      )}
    >
      {children}
    </button>
  );
}

type KindChoice = "none" | "prefer" | "must";

function KindSegment({
  legend,
  value,
  onChange,
  choices = ["none", "prefer", "must"],
  mustLabel = "Must-have",
}: {
  legend: string;
  value: KindChoice;
  onChange: (v: KindChoice) => void;
  choices?: KindChoice[];
  mustLabel?: string;
}) {
  const labels: Record<KindChoice, string> = {
    none: "No preference",
    prefer: "Prefer",
    must: mustLabel,
  };
  return (
    <div role="radiogroup" aria-label={legend} className="flex flex-wrap gap-2">
      {choices.map((c) => (
        <button
          key={c}
          role="radio"
          aria-checked={value === c}
          onClick={() => onChange(c)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            value === c
              ? "border-accent bg-accent/10 text-accent"
              : "border-border bg-card text-muted hover:border-border-strong",
          )}
        >
          {labels[c]}
        </button>
      ))}
    </div>
  );
}

function KindNote({ mode, preferText, mustText }: { mode: KindChoice; preferText: string; mustText: string }) {
  if (mode === "none") return null;
  return <p className="mt-2 text-xs leading-relaxed text-muted">{mode === "prefer" ? preferText : mustText}</p>;
}

export function V3Quiz({ region, sharedProfile }: { region: RegionConfig; sharedProfile?: CanonicalProfile | null }) {
  const router = useRouter();
  const store = useV3QuizStore();
  const { profile, step } = store;
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priorityNote, setPriorityNote] = useState(false);
  // Phase 3: review is a mode, not a step — progress stays frozen.
  const [reviewing, setReviewing] = useState(false);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  // Share-link hydration: applied once after mount (the store is the single
  // source of truth; a null/invalid payload opens an empty quiz).
  // Refine-answers hydration: with no share payload, restore the last
  // submitted profile (if any) so Back shows the user's answers instead of
  // defaults. Stored data is revalidated; anything invalid opens empty.
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    if (sharedProfile) {
      store.loadProfile(sharedProfile);
      return;
    }
    const stored = readValidated("specwise-v3-profile", (u) => {
      const parsed = CanonicalProfileSchema.safeParse(u);
      return parsed.success ? parsed.data : null;
    });
    if (stored) store.loadProfile(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const QUICK_TOTAL = QUICK_STEPS.length;
  const inAdvanced = store.advancedOpen && step === QUICK_STEPS.length;
  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    store.go(next);
  };

  const gpuRelevant = profile.workloads.some((w) => ["gaming", "ai-ml", "cad-3d", "video-photo"].includes(w.id));
  const weightRelevant =
    profile.priorities.includes("carry") || profile.workloads.some((w) => w.id === "study-office");
  const sections = useMemo(
    () => advancedSectionsFor(profile.workloads.map((w) => w.id)),
    [profile.workloads],
  );

  const budgetErr = budgetRangeError(profile.budget.min, profile.budget.max, profile.budget.noMax);
  const canNext = step === 0 ? profile.workloads.length > 0 : step === 1 ? !budgetErr : true;

  const pickPriority = (id: Q3Pick) => {
    const active = profile.priorities.includes(id);
    if (!active && profile.priorities.length >= 2) {
      setPriorityNote(true);
      return;
    }
    setPriorityNote(false);
    store.togglePriority(id);
  };

  async function submit() {
    if (budgetErr) {
      setError(budgetErr);
      return;
    }
    setSubmitting(true);
    setError(null);    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schemaVersion: "v3", profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Recommendation failed");
      writeValidated("specwise-v3-results", data);
      writeValidated("specwise-v3-profile", profile);
      // Phase 5 binding: fingerprint the EXACT profile POSTed so results
      // can prove they came from these answers (overwrites any prior run).
      writeBinding(profile);
      store.setSubmitted(true);
      router.push("/results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recommendation failed");
    } finally {
      setSubmitting(false);
    }
  }

  // Review gate: validate first (same guards as submit), then enter review
  // mode instead of POSTing. Review is not a step — step + answers intact.
  function openReview() {
    if (budgetErr) {
      setError(budgetErr);
      return;
    }
    if (profile.workloads.length === 0) {
      go(0);
      return;
    }
    setError(null);
    setReviewing(true);
  }

  function closeReview() {
    setReviewing(false);
    requestAnimationFrame(() => submitBtnRef.current?.focus());
  }

  const interpretation = useMemo(
    () => (reviewing ? interpretProfile(profile) : null),
    [reviewing, profile],
  );
  const gamingSel = profile.workloads.find((w) => w.id === "gaming");
  const ramReq = profile.requirements.find((r) => r.id === "ram");
  const storageReq = profile.requirements.find((r) => r.id === "storage");
  const osHard = profile.requirements.find((r) => r.id === "os" && r.kind === "hard");
  const osPref = profile.requirements.find((r) => r.id === "os-prefer");
  const gpuReq = profile.requirements.find((r) => r.id === "gpu");
  const weightReq = profile.requirements.find((r) => r.id === "weight");

  const ramVal = typeof ramReq?.target === "number" ? ramReq.target : typeof ramReq?.min === "number" ? ramReq.min : null;
  const ramMode: KindChoice = !ramReq ? "none" : ramReq.kind === "hard" ? "must" : "prefer";
  const storageVal = typeof storageReq?.target === "number" ? storageReq.target : typeof storageReq?.min === "number" ? storageReq.min : null;
  const storageMode: KindChoice = !storageReq ? "none" : storageReq.kind === "hard" ? "must" : "prefer";
  const osSelected = (osHard?.min ?? osPref?.target ?? null) as string | null;
  const osMode: KindChoice = osHard ? "must" : osPref ? "prefer" : "none";
  // NOTE: no Prefer for graphics — a gpu-prefer target is engine-inert
  // (nothing consumes it), so offering it would mislead. Must-have or nothing.
  const gpuMode: KindChoice = gpuReq?.kind === "hard" ? "must" : "none";
  const weightVal = typeof weightReq?.max === "number" ? weightReq.max : null;
  const weightMode: KindChoice = !weightReq ? "none" : weightReq.kind === "hard" ? "must" : "prefer";
  const weightReason = profile.priorities.includes("carry")
    ? "You said portability matters, so we're checking how heavy a laptop you're comfortable carrying."
    : "Study and work laptops move around a lot — how light should yours be?";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <nav aria-label="Quiz progress" className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wider text-muted">
            {inAdvanced ? "Fine-tuning · optional — skip anytime" : QUICK_STEPS[Math.min(step, QUICK_STEPS.length - 1)]}
          </span>
          <span className="font-mono text-xs text-muted">
            {inAdvanced ? `${QUICK_TOTAL} / ${QUICK_TOTAL}` : `${Math.min(step + 1, QUICK_TOTAL)} / ${QUICK_TOTAL}`}
          </span>
        </div>
        <Progress value={inAdvanced ? QUICK_TOTAL : step + 1} max={QUICK_TOTAL} />
      </nav>

      {reviewing && interpretation ? (
        <ReviewSummary
          interpretation={interpretation}
          onConfirm={submit}
          onBack={closeReview}
          submitting={submitting}
        />
      ) : (
        <>
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {step === 0 && (
              <div>
                <h2 className="mb-1 text-2xl font-semibold tracking-tight">What will you mainly use this laptop for?</h2>
                <p className="mb-6 text-sm leading-relaxed text-muted">Select all that apply. If more than one, mark each as Primary, Secondary, or Occasional.</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {WORKLOAD_CARDS.map((card) => {
                    const Icon = card.icon;
                    const sel = profile.workloads.find((w) => w.id === card.id);
                    const active = !!sel;
                    return (
                      <div key={card.id} className={cn("rounded-xl border p-5 transition", active ? "border-accent bg-accent/10" : "border-border bg-card")}>
                        <button onClick={() => store.toggleWorkload(card.id)} aria-pressed={active} className="group block w-full text-left">
                          <div className="mb-3 flex items-center gap-2">
                            <Icon className={cn("h-5 w-5", active ? "text-accent" : "text-muted")} />
                            <span className="text-sm font-semibold text-foreground">{card.label}</span>
                            {active && <Check className="ml-auto h-4 w-4 text-accent" />}
                          </div>
                          <p className="text-xs leading-relaxed text-muted">{card.description}</p>
                        </button>
                        {active && profile.workloads.length > 1 && (
                          <div className="mt-3 flex gap-1" role="group" aria-label={`${card.label} importance`}>
                            {IMPORTANCE.map((imp) => (
                              <button
                                key={imp}
                                onClick={() => store.setImportance(card.id, imp)}
                                aria-pressed={sel.importance === imp}
                                className={cn(
                                  "flex-1 rounded border px-2 py-1 font-mono text-[10px] uppercase transition",
                                  sel.importance === imp ? "border-accent bg-accent/10 text-accent" : "border-border text-muted",
                                )}
                              >
                                {imp === "primary" ? "Primary" : imp === "secondary" ? "Secondary" : "Occasional"}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {profile.workloads.length > 1 && (
                  <p className="mt-4 text-xs leading-relaxed text-muted">Primary counts most, Occasional least.</p>
                )}
                {gamingSel && (
                  <fieldset className="mt-6">
                    <legend className="font-mono text-xs uppercase tracking-wider text-muted">Which describes your gaming?</legend>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {([["esports", "Competitive & fast (high refresh)"], ["aaa", "Story & visuals (AAA)"], ["both", "A bit of both"]] as const).map(([v, label]) => (
                        <Chip key={v} active={gamingSel.subprofile === v} onClick={() => store.setGamingSubtype(v)}>{label}</Chip>
                      ))}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted">Different games lean on different strengths.</p>
                  </fieldset>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-8">
                <div>
                  <h2 className="mb-1 text-2xl font-semibold tracking-tight">What&apos;s your budget?</h2>
                  <p className="text-sm leading-relaxed text-muted">Prices shown in your region&apos;s currency.</p>
                </div>
                <fieldset>
                  <legend className="font-mono text-xs uppercase tracking-wider text-muted">Region</legend>
                  <select
                    aria-label="Region"
                    value={profile.region}
                    onChange={(e) => {
                      store.setRegion(e.target.value)
                      // Write-through: quiz region is also the site region —
                      // persist the cookie + notify the header picker instantly.
                      void setClientRegion(e.target.value).then(() => router.refresh())
                    }}
                    className="mt-4 rounded border border-border bg-card px-3 py-2 text-sm text-foreground"
                  >
                    {REGIONS.map((r) => (
                      <option key={r.code} value={r.code}>{r.flag} {r.label} ({r.currency})</option>
                    ))}
                  </select>
                </fieldset>
                <fieldset>
                  <legend className="font-mono text-xs uppercase tracking-wider text-muted">Budget ({profile.currency})</legend>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Min</span>
                      <input
                        type="number" min={0} inputMode="numeric" aria-label="Minimum budget"
                        value={profile.budget.min ?? ""}
                        onChange={(e) => store.setBudget(e.target.value === "" ? null : Number(e.target.value), profile.budget.max, profile.budget.noMax)}
                        className="h-10 w-full rounded border border-border bg-card px-3 text-sm tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Max</span>
                      <input
                        type="number" min={0} inputMode="numeric" aria-label="Maximum budget" disabled={profile.budget.noMax}
                        value={profile.budget.max ?? ""}
                        onChange={(e) => store.setBudget(profile.budget.min, e.target.value === "" ? null : Number(e.target.value), false)}
                        className="h-10 w-full rounded border border-border bg-card px-3 text-sm tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40"
                      />
                    </label>
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-xs text-muted">
                    <input
                      type="checkbox" checked={profile.budget.noMax}
                      onChange={(e) => store.setBudget(profile.budget.min, profile.budget.max, e.target.checked)}
                      className="size-4 accent-accent"
                    />
                    No maximum
                  </label>
                  {budgetErr && (
                    <p role="alert" aria-live="assertive" className="mt-3 text-sm text-red-400">{budgetErr}</p>
                  )}
                </fieldset>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="mb-1 text-2xl font-semibold tracking-tight">What matters most?</h2>
                <p className="mb-6 text-sm leading-relaxed text-muted">You can skip this — your workload already gives us a sensible starting point.</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {Q3_OPTIONS.map((opt) => {
                    const active = profile.priorities.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => pickPriority(opt.id)}
                        aria-pressed={active}
                        className={cn("rounded-xl border p-4 text-left transition", active ? "border-accent bg-accent/10" : "border-border bg-card hover:border-border-strong")}
                      >
                        <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                        <div className="mt-1 text-xs text-muted">{opt.hint}</div>
                      </button>
                    );
                  })}
                </div>
                {priorityNote && (
                  <p aria-live="polite" className="mt-4 text-xs leading-relaxed text-muted">Pick up to two — remove one to change your picks.</p>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8">
                <div>
                  <h2 className="mb-1 text-2xl font-semibold tracking-tight">Any must-haves?</h2>
                  <p className="text-sm leading-relaxed text-muted">Only answer what you care about — leave the rest on No preference.</p>
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">How much memory (RAM)?</h3>
                  <p className="mb-3 text-xs leading-relaxed text-muted">More memory keeps lots of apps and tabs running smoothly.</p>
                  <div className="flex flex-wrap gap-2">
                    {RAM_OPTIONS.map((gb) => (
                      <Chip key={gb} active={ramVal === gb} onClick={() => store.setRam(ramVal === gb ? null : gb, ramMode === "must")}>
                        {gb} GB
                      </Chip>
                    ))}
                  </div>
                  <div className="mt-3">
                    <KindSegment
                      legend="Memory preference strength"
                      value={ramMode}
                      onChange={(c) => store.setRam(c === "none" ? null : (ramVal ?? 16), c === "must")}
                    />
                    <KindNote mode={ramMode} preferText="Prefer — we'll flag picks that fall short in your results." mustText="Must-have — only matching laptops are shown." />
                  </div>
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">How much storage space?</h3>
                  <p className="mb-3 text-xs leading-relaxed text-muted">Room for apps, photos, video and files.</p>
                  <div className="flex flex-wrap gap-2">
                    {STORAGE_OPTIONS.map((gb) => (
                      <Chip key={gb} active={storageVal === gb} onClick={() => store.setStorage(storageVal === gb ? null : gb, storageMode === "must")}>
                        {gb >= 1024 ? `${gb / 1024} TB` : `${gb} GB`}
                      </Chip>
                    ))}
                  </div>
                  <div className="mt-3">
                    <KindSegment
                      legend="Storage preference strength"
                      value={storageMode}
                      onChange={(c) => store.setStorage(c === "none" ? null : (storageVal ?? 512), c === "must")}
                    />
                    <KindNote mode={storageMode} preferText="Prefer — we'll flag picks that fall short in your results." mustText="Must-have — only matching laptops are shown." />
                  </div>
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">Which operating system?</h3>
                  <p className="mb-3 text-xs leading-relaxed text-muted">Only Apple laptops run macOS.</p>
                  <div className="flex flex-wrap gap-2">
                    {OS_OPTIONS.map((os) => {
                      const active = osSelected === os.value;
                      return (
                        <Chip key={os.value} active={active} onClick={() => store.setOs(active ? "any" : "prefer", os.value)}>
                          {os.label}
                        </Chip>
                      );
                    })}
                  </div>
                  <div className="mt-3">
                    <KindSegment
                      legend="Operating system preference strength"
                      value={osMode}
                      onChange={(c) => {
                        if (c === "none") store.setOs("any");
                        else if (osSelected) store.setOs(c, osSelected);
                        // No OS chosen yet: auto-select nothing — pick a system above first.
                      }}
                    />
                    <KindNote mode={osMode} preferText="Prefer — laptops with your system rank higher." mustText="Must-have — only matching laptops are shown. We never loosen this." />
                    <p className="mt-2 text-xs leading-relaxed text-muted">Must-have is never loosened, even to show more options.</p>
                  </div>
                </div>
                {gpuRelevant && (
                  <div>
                    <h3 className="mb-1 text-sm font-semibold text-foreground">How important is graphics power?</h3>
                    <p className="mb-3 text-xs leading-relaxed text-muted">Needed for gaming, 3D, AI and heavy video work.</p>
                    <div className="mt-3">
                      <KindSegment
                        legend="Graphics requirement"
                        value={gpuMode}
                        choices={["none", "must"]}
                        mustLabel="Must-have dedicated GPU"
                        onChange={(c) => store.setGpu(c === "must" ? "must" : "any")}
                      />
                      <KindNote mode={gpuMode} preferText="" mustText="Must-have — only matching laptops are shown." />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted">Your workload can benefit from a dedicated graphics card, so we&apos;re asking.</p>
                  </div>
                )}
                {weightRelevant && (
                  <div>
                    <h3 className="mb-1 text-sm font-semibold text-foreground">How light should it be?</h3>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {WEIGHT_OPTIONS.map((kg) => (
                        <Chip key={kg} active={weightVal === kg} onClick={() => store.setWeight(weightVal === kg ? null : kg, weightMode === "must")}>
                          ≤ {kg} kg
                        </Chip>
                      ))}
                    </div>
                    <div className="mt-3">
                      <KindSegment
                        legend="Weight preference strength"
                        value={weightMode}
                        onChange={(c) => store.setWeight(c === "none" ? null : (weightVal ?? 1.5), c === "must")}
                      />
                      <KindNote mode={weightMode} preferText="Prefer — we'll flag picks that fall short in your results." mustText="Must-have — only matching laptops are shown." />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted">{weightReason}</p>
                  </div>
                )}
              </div>
            )}

            {inAdvanced && (
              <AdvancedPanel sections={sections} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (step === 0) {
              store.reset();
              go(0);
            } else if (inAdvanced) {
              go(QUICK_STEPS.length - 1);
            } else {
              go(step - 1);
            }
          }}
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> {step === 0 ? "Start over" : inAdvanced ? "Back to questions" : "Back"}
        </Button>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!inAdvanced && step < QUICK_STEPS.length - 1 && (
            <Button size="lg" disabled={!canNext} onClick={() => go(step + 1)} className="gap-2">
              <span className="font-mono text-xs">NEXT</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {!inAdvanced && step === QUICK_STEPS.length - 1 && (
            <>
              <Button variant="outline" size="sm" onClick={() => { store.setAdvancedOpen(true); go(QUICK_STEPS.length); }}>
                Refine further
              </Button>
              <Button ref={submitBtnRef} size="lg" disabled={submitting || !!budgetErr} onClick={openReview} className="gap-2">
                <span className="font-mono text-xs">{submitting ? "SCORING…" : "SEE MY MATCHES"}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}
          {inAdvanced && step < QUICK_STEPS.length && (
            <Button size="lg" disabled={!canNext} onClick={() => go(step + 1)} className="gap-2">
              <span className="font-mono text-xs">NEXT</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {inAdvanced && step === QUICK_STEPS.length && (
            <Button ref={submitBtnRef} size="lg" disabled={submitting || !!budgetErr} onClick={openReview} className="gap-2">
              <span className="font-mono text-xs">{submitting ? "SCORING…" : "SEE MY MATCHES"}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
        </>
      )}
      {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
    </div>
  );
}

function AdvancedPanel({ sections }: { sections: string[] }) {
  const store = useV3QuizStore();
  const { profile } = store;
  const has = (s: string) => sections.includes(s);
  const req = (id: Requirement["id"], kind?: Requirement["kind"]) =>
    profile.requirements.find((r) => r.id === id && (!kind || r.kind === kind));

  const upsert = (r: Requirement) => store.upsertRequirement(r);
  const numTarget = (id: Requirement["id"], target: number | null, extra?: Partial<Requirement>) => {
    if (target == null) store.removeRequirements([id]);
    else upsert({ id, kind: "target", targetClass: "A", importance: 2, target, provenance: { source: "advanced", reason: `${id} preferred ≥${target}` }, userMust: false, ...extra });
  };

  const portsReq = req("ports");
  const ports = typeof portsReq?.target === "string" ? (portsReq.target as string).split("+").filter(Boolean) : [];
  const devSel = profile.workloads.find((w) => w.id === "dev");
  const refurbHard = req("refurb", "hard");
  const vramHard = req("vram", "hard");
  const vramTarget = req("vram", "target");
  const refreshHard = req("refresh", "hard");
  const refreshTarget = req("refresh", "target");
  const coresHard = req("cpu-cores", "hard");
  const batteryHard = req("battery", "hard");
  const batteryTarget = req("battery", "target");
  const sizeHard = req("displaySize", "hard");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-1 text-2xl font-semibold tracking-tight">Fine-tune your match (optional)</h2>
        <p className="text-sm leading-relaxed text-muted">Skip anytime — Quick already gives you a strong profile. These details only appear because of your workloads.</p>
      </div>

      {devSel && (
        <div>
          <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">Development intensity</h3>
          <div className="flex flex-wrap gap-2">
            <Chip active={devSel.subprofile === "standard"} onClick={() => store.setDevHeavy(false)}>Standard</Chip>
            <Chip active={devSel.subprofile === "heavy"} onClick={() => store.setDevHeavy(true)}>VMs / containers / large builds</Chip>
          </div>
        </div>
      )}

      {has("cpu") && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-foreground">Minimum processor cores?</h3>
          <p className="mb-3 text-xs leading-relaxed text-muted">Strict filter — only laptops with at least this many cores are shown.</p>
          <div className="flex flex-wrap gap-2">
            {[4, 6, 8, 12, 16].map((c) => (
              <Chip key={c} active={coresHard?.target === c} onClick={() => {
                if (coresHard?.target === c) store.removeRequirements(["cpu-cores"]);
                else upsert({ id: "cpu-cores", kind: "hard", importance: 2, target: c, provenance: { source: "advanced", reason: `CPU must have ≥${c} cores` }, userMust: true });
              }}>{c}+ cores</Chip>
            ))}
          </div>
        </div>
      )}

      {(has("gpu") || has("vram")) && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-foreground">Minimum graphics memory (VRAM)?</h3>
          <p className="mb-3 text-xs leading-relaxed text-muted">Preference — we&apos;ll flag picks that fall short. &ldquo;Only show&rdquo; makes it strict.</p>
          <div className="flex flex-wrap gap-2">
            {[6, 8, 12, 16].map((v) => {
              const active = vramHard?.target === v || vramTarget?.target === v;
              return (
                <Chip key={v} active={!!active} onClick={() => {
                  if (active) store.removeRequirements(["vram"]);
                  else upsert({ id: "vram", kind: "target", targetClass: "A", importance: 3, target: v, provenance: { source: "advanced", reason: `VRAM preferred ≥${v}GB` }, userMust: false });
                }}>{v} GB</Chip>
              );
            })}
            {(vramTarget || vramHard) && (
              <Chip active={!!vramHard} onClick={() => {
                const v = (vramHard?.target ?? vramTarget?.target ?? 8) as number;
                if (vramHard) upsert({ id: "vram", kind: "target", targetClass: "A", importance: 3, target: v, provenance: { source: "advanced", reason: `VRAM preferred ≥${v}GB` }, userMust: false });
                else upsert({ id: "vram", kind: "hard", importance: 2, target: v, provenance: { source: "advanced", reason: `VRAM must have ≥${v}GB` }, userMust: true });
              }}>Only show</Chip>
            )}
          </div>
          {vramHard && (
            <p className="mt-2 text-xs leading-relaxed text-muted">Strict filter — only matching laptops are shown.</p>
          )}
        </div>
      )}

      {(has("display") || has("display-size")) && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-foreground">Minimum screen size?</h3>
          <p className="mb-3 text-xs leading-relaxed text-muted">Strict filter — only laptops with at least this screen size are shown.</p>
          <div className="flex flex-wrap gap-2">
            {[13, 14, 15, 16, 17].map((s) => {
              const active = sizeHard?.target === s;
              return (
                <Chip key={s} active={!!active} onClick={() => {
                  // Hard-only: a displaySize target is engine-silent (fully
                  // inert), so no Prefer is offered — a preference here would
                  // change nothing. Clear all kinds first so a legacy target
                  // from a share link can't linger beside the new hard req.
                  store.removeRequirements(["displaySize"]);
                  if (!active) upsert({ id: "displaySize", kind: "hard", importance: 2, target: s, provenance: { source: "advanced", reason: `Display must be ≥${s}"` }, userMust: true });
                }}>{s}&quot;+</Chip>
              );
            })}
          </div>
        </div>
      )}

      {(has("refresh") || has("display")) && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-foreground">Minimum refresh rate?</h3>
          <p className="mb-3 text-xs leading-relaxed text-muted">Preference — we&apos;ll flag picks that fall short.</p>
          <div className="flex flex-wrap gap-2">
            {[60, 120, 144, 240].map((hz) => {
              const active = refreshHard?.target === hz || refreshTarget?.target === hz;
              return (
                <Chip key={hz} active={!!active} onClick={() => {
                  if (active) store.removeRequirements(["refresh"]);
                  else upsert({ id: "refresh", kind: "target", targetClass: "A", importance: 2, target: hz, provenance: { source: "advanced", reason: `Refresh preferred ≥${hz}Hz` }, userMust: false });
                }}>{hz} Hz</Chip>
              );
            })}
          </div>
        </div>
      )}

      {(has("battery") || has("weight")) && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-foreground">Minimum battery life?</h3>
          <p className="mb-3 text-xs leading-relaxed text-muted">Preference — we&apos;ll flag picks that fall short.</p>
          <div className="flex flex-wrap gap-2">
            {[6, 8, 10, 12].map((h) => {
              const active = batteryHard?.target === h || batteryTarget?.target === h;
              return (
                <Chip key={h} active={!!active} onClick={() => {
                  if (active) store.removeRequirements(["battery"]);
                  else numTarget("battery", h);
                }}>{h}h</Chip>
              );
            })}
          </div>
        </div>
      )}

      {has("ports") && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-foreground">Which ports must it have?</h3>
          <p className="mb-3 text-xs leading-relaxed text-muted">Strict — laptops must have all of these.</p>
          <div className="flex flex-wrap gap-2">
            {PORT_OPTIONS.map((p) => (
              <Chip key={p} active={ports.includes(p)} onClick={() => {
                const next = ports.includes(p) ? ports.filter((x) => x !== p) : [...ports, p];
                store.setPorts(next);
              }}>{p}</Chip>
            ))}
          </div>
        </div>
      )}

      {has("upgrade") && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-foreground">Upgradeability</h3>
          <p className="mb-3 text-xs leading-relaxed text-muted">Strict filter — laptops must allow the upgrades you pick.</p>
          <div className="flex flex-wrap gap-2">
            {(["ram", "storage"] as const).map((k) => {
              const up = req("upgrade");
              const active = typeof up?.target === "string" && (up.target as string).includes(k);
              return (
                <Chip key={k} active={!!active} onClick={() => {
                  const cur = typeof up?.target === "string" ? (up.target as string).split("+").filter(Boolean) : [];
                  const next = cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k];
                  if (next.length === 0) store.removeRequirements(["upgrade"]);
                  else upsert({ id: "upgrade", kind: "hard", importance: 2, target: next.join("+"), provenance: { source: "advanced", reason: `Upgradeable ${next.join(", ")} required` }, userMust: true });
                }}>{k === "ram" ? "RAM upgradeable" : "Storage expandable"}</Chip>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-1 text-sm font-semibold text-foreground">New or refurbished?</h3>
        <p className="mb-3 text-xs leading-relaxed text-muted">New only is never loosened.</p>
        <div className="flex flex-wrap gap-2">
          <Chip active={!refurbHard} onClick={() => store.setRefurbNewOnly(false)}>Accept refurbished</Chip>
          <Chip active={!!refurbHard} onClick={() => store.setRefurbNewOnly(!refurbHard)}>New only</Chip>
        </div>
      </div>
    </div>
  );
}
