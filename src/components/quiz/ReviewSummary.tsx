/**
 * ReviewSummary — presentational Phase-3 review screen.
 * Renders a RequirementInterpretation; no engine access, no store access.
 * Mono is reserved for the region + budget values only.
 */
"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  formatBudgetRange,
  type RequirementInterpretation,
} from "@/lib/recommend/v3/interpret";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">{title}</h3>
      {children}
    </section>
  );
}

export function ReviewSummary({
  interpretation,
  onConfirm,
  onBack,
  submitting,
}: {
  interpretation: RequirementInterpretation;
  onConfirm: () => void;
  onBack: () => void;
  submitting: boolean;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const it = interpretation;
  const budgetLine = formatBudgetRange(it.budget.min, it.budget.max, it.budget.noMax, it.currency);

  return (
    <div>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mb-1 text-2xl font-semibold tracking-tight focus-visible:outline-none"
      >
        Here&apos;s what we understood
      </h2>
      <p className="mb-6 text-sm leading-relaxed text-muted">
        Check this over — your matches are based on exactly this.
      </p>

      <div className="space-y-4">
        <Group title="Region and budget">
          <p className="font-mono text-sm text-foreground">{it.region}</p>
          {budgetLine && <p className="mt-1 font-mono text-sm text-foreground">{budgetLine}</p>}
        </Group>

        {it.workloads.length > 0 && (
          <Group title="Your workload">
            <ul className="space-y-2">
              {it.workloads.map((w) => (
                <li key={w.id} className="text-sm text-foreground">
                  {w.label}
                  <span className="text-muted"> · {w.importance}</span>
                  {w.subprofileLabel && <span className="text-muted"> · {w.subprofileLabel}</span>}
                </li>
              ))}
            </ul>
            {it.occasionalNote && (
              <p className="mt-3 text-xs leading-relaxed text-muted">{it.occasionalNote}</p>
            )}
          </Group>
        )}

        {it.mustHaves.length > 0 && (
          <Group title="Must-haves">
            <ul className="list-disc space-y-1.5 pl-5">
              {it.mustHaves.map((m) => (
                <li key={m.id} className="text-sm text-foreground">
                  {m.text}
                </li>
              ))}
            </ul>
          </Group>
        )}

        <Group title="Preferences">
          {it.preferences.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted">
              No extra preferences — your workload sets the balance.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {it.preferences.map((p) => (
                <li key={p.id} className="text-sm text-foreground">
                  {p.text}
                  <span className="block text-xs leading-relaxed text-muted">{p.honestNote}</span>
                </li>
              ))}
            </ul>
          )}
        </Group>

        {it.fixedConstraints.length > 0 && (
          <Group title="We won't loosen">
            <ul className="list-disc space-y-1.5 pl-5">
              {it.fixedConstraints.map((f) => (
                <li key={f.id} className="text-sm text-foreground">
                  {f.text}
                </li>
              ))}
            </ul>
          </Group>
        )}

        {it.relaxableConstraints.length > 0 && (
          <Group title="May be adjusted if needed">
            <ul className="space-y-2.5">
              {it.relaxableConstraints.map((r) => (
                <li key={r.id} className="text-sm text-foreground">
                  {r.text}
                </li>
              ))}
            </ul>
          </Group>
        )}

        {it.contradictions.length > 0 && (
          <Group title="Heads-up">
            <ul className="space-y-1.5">
              {it.contradictions.map((c, i) => (
                <li key={i} className="text-sm leading-relaxed text-foreground">
                  {c}
                </li>
              ))}
            </ul>
          </Group>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onBack} disabled={submitting}>
          Go back and refine
        </Button>
        <Button size="lg" disabled={submitting} onClick={onConfirm}>
          <span className="font-mono text-xs">{submitting ? "SCORING…" : "SHOW MY MATCHES"}</span>
        </Button>
      </div>
    </div>
  );
}
