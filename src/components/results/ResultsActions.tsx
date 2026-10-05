"use client";

import { useState } from "react";
import Link from "next/link";
import { buildV3SharePath } from "@/lib/share";
import { removeStored, StorageKey } from "@/lib/storage";
import { buildResultsCompareContext } from "@/components/results/CompareContract";
import { usePersonalizationSnapshot } from "@/components/compare/compare-personalization";
import { compareHref } from "@/lib/compare-select";
import type { CanonicalProfile } from "@/lib/recommend/v3/types";
import { buttonVariants } from "@/components/ui/button";

/**
 * Result actions: Change my priorities (/quiz — answers restore via the
 * existing refine hydration) + Copy answers link (absolute URL built from
 * the stored profile via window.location.origin — no env dependency) +
 * Compare top two (/compare?ids= for the top-2 engine-order ids, rendered
 * only when the stored DTO has ≥2 items) + Start over (clears v3 results +
 * profile + binding, then /quiz where the step-0 Start over resets the
 * rest — same pattern as StaleNotice).
 */
export function ResultsActions({ profile }: { profile: CanonicalProfile | null }) {
  const [copied, setCopied] = useState(false);
  // Compare entry reads the stored DTO via the shared subscription (ids only
  // — engine order is never re-sorted here). SSR/hydration see no link.
  const snap = usePersonalizationSnapshot();
  const compareIds =
    snap.dto && snap.dto.items.length >= 2
      ? buildResultsCompareContext(snap.dto, 2).ids
      : [];

  async function copyLink() {
    if (!profile) return;
    const url = `${window.location.origin}${buildV3SharePath(profile)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API unavailable (permissions/insecure context) — fallback.
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        // Best-effort only; the link stays visible via Change my priorities.
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
  }

  function startOver() {
    removeStored(StorageKey.V3Results);
    removeStored(StorageKey.V3Profile);
    removeStored(StorageKey.Binding);
  }

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <Link href="/quiz" className={buttonVariants()}>
        Change my priorities
      </Link>
      {profile && (
        <button
          type="button"
          onClick={copyLink}
          className={buttonVariants({ variant: "outline" })}
        >
          {copied ? "Answers link copied" : "Copy answers link"}
        </button>
      )}
      {compareIds.length >= 2 && (
        <Link
          href={compareHref(compareIds)}
          className={buttonVariants({ variant: "outline" })}
        >
          Compare top two
        </Link>
      )}
      <Link
        href="/quiz"
        onClick={startOver}
        className={buttonVariants({ variant: "ghost" })}
      >
        Start over
      </Link>
    </div>
  );
}
