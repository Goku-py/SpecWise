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
import { useV3QuizStore, QUICK_STEPS } from "@/store/useV3QuizStore";
import { advancedSectionsFor } from "@/lib/recommend/v3/quiz";
import { readValidated, writeValidated } from "@/lib/storage";
import { setClientRegion } from "@/lib/region-store";
import { CanonicalProfileSchema } from "@/lib/recommend/v3/validate";
import { REGIONS, type RegionConfig } from "@/lib/regions";
import type { CanonicalProfile, Q3Pick, Requirement, WorkloadId } from "@/lib/recommend/v3/types";
import { cn } from "@/lib/utils";

const WORKLOAD_CARDS: Array<{ id: WorkloadId; label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "dev", label: "Software development", description: "Code, builds, dev servers. CPU + RAM heavy.", icon: Code2 },
  { id: "gaming", label: "Gaming", description: "Esports or AAA. GPU + refresh first.", icon: Gamepad2 },
  { id: "ai-ml", label: "AI / machine learning", description: "Local models, training. GPU + VRAM.", icon: Brain },
  { id: "video-photo", label: "Video / photo", description: "Editing, color, exports. Display + storage.", icon: Clapperboard },
  { id: "cad-3d", label: "3D / CAD", description: "Modeling, viewports. GPU + VRAM.", icon: Box },
  { id: "study-office", label: "Study / office", description: "Docs, browsing, calls. Battery + portability.", icon: Briefcase },
];

const Q3_OPTIONS: Array<{ id: Q3Pick; label: string; hint: string }> = [
  { id: "speed", label: "Raw speed", hint: "Fastest CPU/GPU" },
  { id: "battery", label: "Battery life", hint: "All-day unplugged" },
  { id: "carry", label: "Easy to carry", hint: "Light + portable" },
  { id: "screen", label: "Screen quality", hint: "Sharp, vivid panel" },
  { id: "build", label: "Build quality", hint: "Durable chassis" },
  { id: "value", label: "Best value", hint: "Capability per money" },
];

const RAM_OPTIONS = [16, 32, 64];
const STORAGE_OPTIONS = [512, 1024, 2048];
const OS_OPTIONS = ["windows", "macos", "linux", "chromeos"];
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

export function V3Quiz({ region, sharedProfile }: { region: RegionConfig; sharedProfile?: CanonicalProfile | null }) {
  const router = useRouter();
  const store = useV3QuizStore();
  const { profile, step } = store;
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const totalSteps = store.advancedOpen ? QUICK_STEPS.length + 1 : QUICK_STEPS.length;
  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    store.go(next);
  };

  const gpuRelevant = profile.workloads.some((w) => ["gaming", "ai-ml", "cad-3d", "video-photo"].includes(w.id));
  const weightRelevant = profile.priorities.includes("carry");
  const sections = useMemo(
    () => advancedSectionsFor(profile.workloads.map((w) => w.id)),
    [profile.workloads],
  );

  const canNext = step === 0 ? profile.workloads.length > 0 : true;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schemaVersion: "v3", profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Recommendation failed");
      writeValidated("specwise-v3-results", data);
      writeValidated("specwise-v3-profile", profile);
      store.setSubmitted(true);
      router.push("/results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recommendation failed");
    } finally {
      setSubmitting(false);
    }
  }

  const gamingSel = profile.workloads.find((w) => w.id === "gaming");
  const ramReq = profile.requirements.find((r) => r.id === "ram");
  const storageReq = profile.requirements.find((r) => r.id === "storage");
  const osHard = profile.requirements.find((r) => r.id === "os" && r.kind === "hard");
  const osPref = profile.requirements.find((r) => r.id === "os-prefer");
  const gpuReq = profile.requirements.find((r) => r.id === "gpu");
  const weightReq = profile.requirements.find((r) => r.id === "weight");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <nav aria-label="Quiz progress" className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wider text-muted">
            {store.advancedOpen && step === QUICK_STEPS.length ? "Advanced" : QUICK_STEPS[Math.min(step, QUICK_STEPS.length - 1)]}
          </span>
          <span className="font-mono text-xs text-muted">{Math.min(step + 1, totalSteps)} / {totalSteps}</span>
        </div>
        <Progress value={step + 1} max={totalSteps} />
      </nav>

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
                {gamingSel && (
                  <fieldset className="mt-6">
                    <legend className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">Which describes your gaming?</legend>
                    <div className="flex flex-wrap gap-2">
                      {([["esports", "Competitive high-refresh"], ["aaa", "Story-driven AAA"], ["both", "Both"]] as const).map(([v, label]) => (
                        <Chip key={v} active={gamingSel.subprofile === v} onClick={() => store.setGamingSubtype(v)}>{label}</Chip>
                      ))}
                    </div>
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
                  <legend className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">Region</legend>
                  <select
                    aria-label="Region"
                    value={profile.region}
                    onChange={(e) => {
                      store.setRegion(e.target.value)
                      // Write-through: quiz region is also the site region —
                      // persist the cookie + notify the header picker instantly.
                      void setClientRegion(e.target.value).then(() => router.refresh())
                    }}
                    className="rounded border border-border bg-card px-3 py-2 text-sm text-foreground"
                  >
                    {REGIONS.map((r) => (
                      <option key={r.code} value={r.code}>{r.flag} {r.label} ({r.currency})</option>
                    ))}
                  </select>
                </fieldset>
                <fieldset>
                  <legend className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">Budget ({profile.currency})</legend>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-[9rem_9rem_auto] sm:items-end">
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
                    <label className="col-span-2 flex h-10 items-center gap-2 text-xs text-muted sm:col-span-1">
                      <input
                        type="checkbox" checked={profile.budget.noMax}
                        onChange={(e) => store.setBudget(profile.budget.min, profile.budget.max, e.target.checked)}
                        className="size-4 accent-accent"
                      />
                      No maximum
                    </label>
                  </div>
                </fieldset>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="mb-1 text-2xl font-semibold tracking-tight">What matters most?</h2>
                <p className="mb-6 text-sm leading-relaxed text-muted">Pick up to two. Skip if you&apos;re unsure — your workload already sets sensible defaults.</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {Q3_OPTIONS.map((opt) => {
                    const active = profile.priorities.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => store.togglePriority(opt.id)}
                        aria-pressed={active}
                        className={cn("rounded-xl border p-4 text-left transition", active ? "border-accent bg-accent/10" : "border-border bg-card hover:border-border-strong")}
                      >
                        <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                        <div className="mt-1 text-xs text-muted">{opt.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8">
                <div>
                  <h2 className="mb-1 text-2xl font-semibold tracking-tight">Any must-haves?</h2>
                  <p className="text-sm leading-relaxed text-muted">Only answer what you care about. Defaults are preferences — &ldquo;Only show&rdquo; makes them strict filters.</p>
                </div>
                <MustPreferBlock
                  title="Memory (RAM)"
                  options={RAM_OPTIONS.map((g) => ({ value: g, label: `${g} GB` }))}
                  selected={typeof ramReq?.target === "number" ? ramReq.target : typeof ramReq?.min === "number" ? ramReq.min : null}
                  must={ramReq?.kind === "hard"}
                  onSelect={(gb) => store.setRam(gb, ramReq?.kind === "hard")}
                  onToggleMust={() => {
                    const gb = typeof ramReq?.target === "number" ? ramReq.target : typeof ramReq?.min === "number" ? ramReq.min : 16;
                    store.setRam(gb, ramReq?.kind !== "hard");
                  }}
                />
                <MustPreferBlock
                  title="Storage"
                  options={STORAGE_OPTIONS.map((g) => ({ value: g, label: g >= 1024 ? `${g / 1024} TB` : `${g} GB` }))}
                  selected={typeof storageReq?.target === "number" ? storageReq.target : typeof storageReq?.min === "number" ? storageReq.min : null}
                  must={storageReq?.kind === "hard"}
                  onSelect={(gb) => store.setStorage(gb, storageReq?.kind === "hard")}
                  onToggleMust={() => {
                    const gb = typeof storageReq?.target === "number" ? storageReq.target : typeof storageReq?.min === "number" ? storageReq.min : 512;
                    store.setStorage(gb, storageReq?.kind !== "hard");
                  }}
                />
                <div>
                  <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">Operating system</h3>
                  <div className="flex flex-wrap gap-2">
                    <Chip active={!osHard && !osPref} onClick={() => store.setOs("any")}>No requirement</Chip>
                    {OS_OPTIONS.map((os) => {
                      const mustActive = osHard?.min === os;
                      const prefActive = osPref?.target === os;
                      return (
                        <span key={os} className="flex gap-1">
                          <Chip active={mustActive || prefActive} onClick={() => store.setOs(prefActive || mustActive ? "any" : "prefer", os)}>
                            {prefActive ? `${os} ✓` : mustActive ? `${os} (must)` : os}
                          </Chip>
                          {(prefActive || (!osHard && !osPref)) && (
                            <Chip active={mustActive} label={`Only show ${os}`} onClick={() => store.setOs(mustActive ? "any" : "must", os)}>
                              Only show
                            </Chip>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
                {gpuRelevant && (
                  <div>
                    <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">Graphics (your workload can use a dedicated GPU)</h3>
                    <div className="flex flex-wrap gap-2">
                      <Chip active={!gpuReq} onClick={() => store.setGpu("any")}>No preference</Chip>
                      <Chip active={gpuReq?.kind === "target"} onClick={() => store.setGpu(gpuReq?.kind === "target" ? "any" : "prefer")}>Prefer powerful graphics</Chip>
                      <Chip active={gpuReq?.kind === "hard"} onClick={() => store.setGpu(gpuReq?.kind === "hard" ? "any" : "must")}>Only show dedicated GPU</Chip>
                    </div>
                  </div>
                )}
                {weightRelevant && (
                  <div>
                    <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">Maximum weight</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      {[1.3, 1.5, 1.8, 2.0].map((kg) => (
                        <Chip key={kg} active={weightReq?.max === kg} onClick={() => store.setWeight(weightReq?.max === kg ? null : kg, weightReq?.kind === "hard")}>
                          ≤ {kg} kg
                        </Chip>
                      ))}
                      {weightReq && (
                        <Chip active={weightReq.kind === "hard"} onClick={() => store.setWeight(typeof weightReq.max === "number" ? weightReq.max : 1.5, weightReq.kind !== "hard")}>
                          Only show
                        </Chip>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {store.advancedOpen && step === QUICK_STEPS.length && (
              <AdvancedPanel sections={sections} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => (step === 0 ? (store.reset(), go(0)) : go(step - 1))}>
          <ArrowLeft className="mr-1 h-4 w-4" /> {step === 0 ? "Start over" : "Back"}
        </Button>
        <div className="flex items-center gap-2">
          {!store.advancedOpen && step === QUICK_STEPS.length - 1 && (
            <Button variant="outline" size="sm" onClick={() => { store.setAdvancedOpen(true); go(QUICK_STEPS.length); }}>
              Advanced refine
            </Button>
          )}
          {store.advancedOpen && step < QUICK_STEPS.length && (
            <Button variant="outline" size="sm" onClick={() => go(QUICK_STEPS.length)}>
              Skip to Advanced
            </Button>
          )}
          {(!store.advancedOpen && step < QUICK_STEPS.length - 1) || (store.advancedOpen && step < QUICK_STEPS.length) ? (
            <Button size="lg" disabled={!canNext} onClick={() => go(step + 1)} className="gap-2">
              <span className="font-mono text-xs">NEXT</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="lg" disabled={!canNext || submitting} onClick={submit} className="gap-2">
              <span className="font-mono text-xs">{submitting ? "SCORING…" : "SEE MATCHES"}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
    </div>
  );
}

function MustPreferBlock({ title, options, selected, must, onSelect, onToggleMust }: {
  title: string;
  options: Array<{ value: number; label: string }>;
  selected: number | null;
  must: boolean;
  onSelect: (v: number | null) => void;
  onToggleMust: () => void;
}) {
  return (
    <div>
      <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">{title}</h3>
      <div className="flex flex-wrap gap-2">
        <Chip active={selected == null} onClick={() => onSelect(null)}>Any</Chip>
        {options.map((o) => (
          <Chip key={o.value} active={selected === o.value} onClick={() => onSelect(selected === o.value ? null : o.value)}>
            {o.label}{selected === o.value && !must ? " (preferred)" : ""}{selected === o.value && must ? " (must)" : ""}
          </Chip>
        ))}
        {selected != null && (
          <Chip active={must} label="Only show" onClick={onToggleMust}>Only show</Chip>
        )}
      </div>
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-1 text-2xl font-semibold tracking-tight">Advanced refinement</h2>
        <p className="text-sm leading-relaxed text-muted">Your Quick answers are preserved above. Only sections relevant to your workloads are shown. Controls marked HARD filter; others affect ranking.</p>
      </div>

      {devSel && (
        <div>
          <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">Development intensity (ranking)</h3>
          <div className="flex gap-2">
            <Chip active={devSel.subprofile === "standard"} onClick={() => store.setDevHeavy(false)}>Standard</Chip>
            <Chip active={devSel.subprofile === "heavy"} onClick={() => store.setDevHeavy(true)}>VMs / containers / large builds</Chip>
          </div>
        </div>
      )}

      {has("cpu") && (
        <div>
          <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">CPU cores (HARD only if Must)</h3>
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
          <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">GPU VRAM, GB (HARD only if Must)</h3>
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
        </div>
      )}

      {(has("display") || has("display-size")) && (
        <div>
          <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">Display size, min inches (HARD only if Must)</h3>
          <div className="flex flex-wrap gap-2">
            {[13, 14, 15, 16, 17].map((s) => {
              const cur = req("displaySize");
              const active = cur?.target === s;
              return (
                <Chip key={s} active={!!active} onClick={() => {
                  if (active) store.removeRequirements(["displaySize"]);
                  else upsert({ id: "displaySize", kind: "target", targetClass: "A", importance: 2, target: s, provenance: { source: "advanced", reason: `Display preferred ≥${s}"` }, userMust: false });
                }}>{s}&quot;+</Chip>
              );
            })}
          </div>
        </div>
      )}

      {(has("refresh") || has("display")) && (
        <div>
          <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">Refresh rate, min Hz (HARD only if Must)</h3>
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
          <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">Battery, min hours (HARD only if Must)</h3>
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
          <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">Required ports (HARD, all must match)</h3>
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
          <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">Upgradeability (HARD per flag)</h3>
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
        <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">Condition (HARD)</h3>
        <div className="flex gap-2">
          <Chip active={!refurbHard} onClick={() => store.setRefurbNewOnly(false)}>Accept refurbished</Chip>
          <Chip active={!!refurbHard} onClick={() => store.setRefurbNewOnly(!refurbHard)}>New only</Chip>
        </div>
      </div>
    </div>
  );
}
