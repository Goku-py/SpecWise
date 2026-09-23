"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { readValidated, validateV3Results } from "@/lib/storage";
import { FScoreMeter } from "@/components/charts/f-score-meter";
import type { RecommendationDTO, RankedItemDTO } from "@/lib/recommend/v3/types";
import { buttonVariants } from "@/components/ui/button";

/**
 * ResultsViewV3 — consumes the v3 RecommendationDTO as returned by the server.
 * No client-side scoring or re-ranking. Scores are display-only.
 */
export function ResultsViewV3({ initialRegion }: { initialRegion: string }) {
  const router = useRouter();
  const [dto, setDto] = useState<RecommendationDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = readValidated("specwise-v3-results", validateV3Results);
    if (!stored) {
      router.replace("/quiz");
      return;
    }
    setDto(stored as unknown as RecommendationDTO);
    setLoading(false);
  }, [router]);

  if (loading || !dto) return null;
  void initialRegion;

  if (dto.items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h2 className="text-2xl font-semibold text-foreground">No results found</h2>
        {dto.awaitingUser ? (
          <p className="mt-2 text-sm text-muted">
            Your must-have requirements rule out the whole catalog. Adjust a hard requirement (e.g. OS or budget minimum) and try again.
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">Try adjusting your criteria or broadening your budget.</p>
        )}
        <Link href="/quiz" className={buttonVariants({ className: "mt-6" })}>
          Refine answers
        </Link>
      </div>
    );
  }

  const top = dto.items[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <div className="mb-8">
        <button
          onClick={() => router.push("/quiz")}
          className="mb-4 flex items-center gap-1 font-mono text-xs text-muted transition hover:text-foreground"
        >
          &larr; REFINE ANSWERS
        </button>
        <h1 className="text-2xl font-bold text-foreground">Your Matches</h1>
        <p className="mt-1 font-mono text-sm text-muted">
          {dto.items.length} laptop{dto.items.length > 1 ? "s" : ""} · {dto.region} · {dto.currency}
        </p>
      </div>

      {dto.exhausted && dto.items.length > 0 && (
        <div role="status" className="mb-6 rounded border border-red-500/40 bg-red-500/10 p-4">
          <p className="text-sm font-semibold text-foreground">
            No exact matches for your must-have requirements. Showing the closest options — adjust a hard requirement to see exact matches.
          </p>
          {dto.awaitingUser && (
            <p className="mt-1 text-xs text-muted">Your OS, condition, or minimum-budget requirement was kept as-is. The engine never relaxes those automatically.</p>
          )}
        </div>
      )}

      {dto.relaxed && dto.relaxationLedger.length > 0 && (
        <div role="status" className="mb-6 rounded border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-foreground">
            No exact matches. Relaxed {dto.relaxationLedger.map((e) => `${e.requirement} (${e.from} → ${e.to})`).join("; ")}. {dto.items.length} laptops found.
          </p>
          <ul className="mt-2 space-y-1">
            {dto.relaxationLedger.map((e, i) => (
              <li key={i} className="font-mono text-xs text-muted">{e.requirement}: {e.from} → {e.to} — {e.reason}</li>
            ))}
          </ul>
        </div>
      )}

      {dto.contradictions.length > 0 && (
        <div className="mb-6 rounded border border-border bg-card p-4">
          <ul className="space-y-1">
            {dto.contradictions.map((c, i) => (
              <li key={i} className="text-xs text-muted">{c}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6 rounded border border-border bg-card p-6">
        <div className="mb-2 font-mono text-xs uppercase tracking-widest text-accent">Best match</div>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <FScoreMeter score={top.scores.overall} size={132} />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-foreground">{top.brand} {top.model}</h2>
            <p className="mt-1 font-mono text-sm text-muted">
              {top.price != null ? `${top.price} ${top.currency}` : "Price unavailable"}
              {top.priceStale ? " (stale)" : ""} · W {top.scores.W} · C {top.scores.C} · V {top.scores.V ?? "—"}
            </p>
            <p className="mt-1 font-mono text-xs text-muted" data-testid="top-specs">
              {top.specs.ramGB}GB RAM · {top.specs.storageGB}GB · {top.specs.os} · {top.specs.weightKg ?? "—"}kg · {top.specs.refreshHz}Hz
            </p>
            <ConfidenceBadge item={top} />
            <WhyBlock item={top} />
          </div>
        </div>
      </div>

      {dto.items.length > 1 && (
        <div>
          <h2 className="mb-4 text-lg font-bold text-foreground">More options</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {dto.items.slice(1).map((item, idx) => (
              <article key={item.laptopId} className="rounded border border-border bg-card p-5">
                <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">#{idx + 2}</div>
                <h3 className="font-semibold text-foreground">{item.brand} {item.model}</h3>
                <p className="mt-1 font-mono text-xs text-muted">
                  {item.price != null ? `${item.price} ${item.currency}` : "Price unavailable"} · {item.scores.overall} overall
                </p>
                <p className="mt-1 font-mono text-[10px] text-muted" data-testid="item-specs">
                  {item.specs.ramGB}GB · {item.specs.storageGB}GB · {item.specs.os} · {item.specs.weightKg ?? "—"}kg
                </p>
                <ConfidenceBadge item={item} />
                <WhyBlock item={item} compact />
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ConfidenceBadge({ item }: { item: RankedItemDTO }) {
  return (
    <div className="mt-2">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
        {item.confidence} confidence · completeness {item.dataCompleteness}
      </span>
      {item.confidenceFactors.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {item.confidenceFactors.slice(0, 4).map((f, i) => (
            <li key={i} className="font-mono text-[10px] text-muted">· {f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WhyBlock({ item, compact }: { item: RankedItemDTO; compact?: boolean }) {
  return (
    <div className={`space-y-2 ${compact ? "mt-3" : "mt-4"}`}>
      {item.strengths.length > 0 && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted">Why it matches</div>
          <ul className="mt-1 space-y-0.5">
            {item.strengths.map((s, i) => (
              <li key={i} className="text-xs text-foreground">+ {s.dim}: {s.evidence}</li>
            ))}
          </ul>
        </div>
      )}
      {item.compromises.length > 0 && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted">Trade-offs</div>
          <ul className="mt-1 space-y-0.5">
            {item.compromises.map((c, i) => (
              <li key={i} className="text-xs text-muted">~ weakest: {c}</li>
            ))}
          </ul>
        </div>
      )}
      {item.missedPreferred.length > 0 && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted">Missed preferred targets</div>
          <ul className="mt-1 space-y-0.5">
            {item.missedPreferred.map((m, i) => (
              <li key={i} className="text-xs text-muted">− {m.id}: wanted {m.required}, has {m.actual}</li>
            ))}
          </ul>
        </div>
      )}
      {item.whyAbove && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted">Why above #{item.whyAbove.vsId?.slice(0, 8) ?? "next"}</div>
          <p className="mt-1 font-mono text-[10px] text-muted">
            {item.whyAbove.won.map((w) => `${w.dim} +${w.delta.toFixed(2)}`).join(" · ")}
            {item.whyAbove.lost.length > 0 && ` | ${item.whyAbove.lost.map((l) => `${l.dim} ${l.delta.toFixed(2)}`).join(" · ")}`}
          </p>
        </div>
      )}
    </div>
  );
}
