"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readValidated, validateV3Profile, validateV3Results } from "@/lib/storage";
import { CanonicalProfileSchema } from "@/lib/recommend/v3/validate";
import type {
  CanonicalProfile,
  RecommendationDTO,
} from "@/lib/recommend/v3/types";
import {
  asRecommendationDTO,
  bindingStatus,
  topItem,
} from "@/lib/results-presentation";
import { bindingStateFor, readBinding } from "@/lib/result-binding";
import { ResultsHero } from "@/components/results/ResultsHero";
import { WhyThisOne } from "@/components/results/WhyThisOne";
import { Tradeoffs } from "@/components/results/Tradeoffs";
import { WhyAbove } from "@/components/results/WhyAbove";
import { MoreOptions } from "@/components/results/MoreOptions";
import { ConfidenceDetails } from "@/components/results/ConfidenceDetails";
import { MatchingLedger } from "@/components/results/MatchingLedger";
import { Contradictions } from "@/components/results/Contradictions";
import { ResultsActions } from "@/components/results/ResultsActions";
import {
  EmptyCatalog,
  InvalidResult,
  LoadingSkeleton,
  MissingProfile,
  NoResults,
  StaleNotice,
} from "@/components/results/ResultsStates";

/**
 * ResultsViewV3 — renders the frozen v3 RecommendationDTO as returned by the
 * server. No client-side scoring or re-ranking; engine order is never
 * re-sorted and scores are display-only.
 */
export function ResultsViewV3({ initialRegion }: { initialRegion: string }) {
  void initialRegion;
  const [dto, setDto] = useState<RecommendationDTO | null>(null);
  const [profile, setProfile] = useState<CanonicalProfile | null>(null);
  const [binding, setBinding] = useState<"ok" | "stale" | "unbound">("unbound");
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const stored = readValidated("specwise-v3-results", validateV3Results);
    if (!stored) {
      // Distinguish "nothing saved" (raw key absent) from "saved but invalid".
      let raw: string | null = null;
      try {
        raw = window.localStorage.getItem("specwise-v3-results");
      } catch {
        raw = null;
      }
      setInvalid(raw != null);
      setLoading(false);
      return;
    }
    const parsed = asRecommendationDTO(stored);
    if (!parsed) {
      setInvalid(true);
      setLoading(false);
      return;
    }
    setDto(parsed);

    // Profile is advisory only: it drives binding status + the share-link
    // builder. Schema-invalid profile → unbound, results still render.
    const storedProfile = readValidated("specwise-v3-profile", validateV3Profile);
    const schemaParsed = storedProfile
      ? CanonicalProfileSchema.safeParse(storedProfile)
      : null;
    setProfile(
      schemaParsed && schemaParsed.success ? schemaParsed.data : null,
    );
    // Phase 5 binding: fingerprint of the stored profile vs the binding
    // written for the EXACT profile POSTed. No binding (pre-Phase-5
    // results) keeps the legacy region-drift behavior; stale reuses the
    // same StaleNotice — never a dead end.
    const fpState = bindingStateFor(storedProfile, readBinding());
    if (fpState === "unbound") setBinding(bindingStatus(parsed, storedProfile));
    else setBinding(fpState === "bound" ? "ok" : "stale");
    setLoading(false);
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (!dto) return invalid ? <InvalidResult /> : <MissingProfile />;

  if (dto.items.length === 0) {
    if (dto.awaitingUser) return <NoResults awaitingUser />;
    if (!dto.relaxed) return <EmptyCatalog />;
    return <NoResults awaitingUser={false} />;
  }

  const top = topItem(dto);
  if (!top) return <EmptyCatalog />;
  const second = dto.items.length > 1 ? dto.items[1] : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <div className="mb-8">
        <Link
          href="/quiz"
          className="mb-4 flex items-center gap-1 font-mono text-xs text-muted transition hover:text-foreground"
        >
          &larr; REFINE ANSWERS
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Your best match</h1>
        <p className="mt-1 font-mono text-sm text-muted">
          {dto.items.length} laptop{dto.items.length > 1 ? "s" : ""} ·{" "}
          {dto.region} · {dto.currency}
        </p>
      </div>

      {binding === "stale" && <StaleNotice />}

      {dto.exhausted && (
        <div
          role="status"
          className="mb-6 rounded border border-red-500/40 bg-red-500/10 p-4"
        >
          <p className="text-sm font-semibold text-foreground">
            No exact matches for your must-have requirements. Showing the
            closest options — adjust a hard requirement to see exact matches.
          </p>
          {dto.awaitingUser && (
            <p className="mt-1 text-xs text-muted">
              Your OS, condition, or minimum-budget requirement was kept as-is.
              The engine never relaxes those automatically.
            </p>
          )}
        </div>
      )}

      <ResultsHero item={top} rank={1} total={dto.items.length} />
      <WhyThisOne item={top} />
      <Tradeoffs item={top} />
      <WhyAbove top={top} second={second} />
      <MoreOptions items={dto.items} />

      <section aria-labelledby="how-matched-heading" className="mb-6 space-y-4">
        <h2
          id="how-matched-heading"
          className="text-lg font-bold text-foreground"
        >
          How we matched you
        </h2>
        <ConfidenceDetails item={top} />
        <MatchingLedger relaxed={dto.relaxed} ledger={dto.relaxationLedger} />
        <Contradictions items={dto.contradictions} />
      </section>

      <ResultsActions profile={profile} />
    </div>
  );
}
