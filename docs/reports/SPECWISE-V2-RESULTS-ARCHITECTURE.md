# SPECWISE V2 — RESULTS ARCHITECTURE (Phase 1)

> Every block maps to a verified v3.1 engine field. Anything the engine cannot support is
> flagged CANNOT-SUPPORT. No implementation. Full engine reference: `SPECWISE-V2-RECOMMENDATION-AUDIT.md`.

## The 7 questions → engine fields → blocks

| User question | Engine field(s) | Block |
|---|---|---|
| (1) Best match? | `overall`, slice-12 best-first, price line, image | Best-match hero card |
| (2) Why? (score proof) | `W/C/V` (V nullable), `overall` | Score strip in hero (donut + W/C/V) |
| (3) Strengths? | `strengths` (top-3 raw-cap dims + verbatim evidence strings) | Strengths list (max 3) |
| (4) Weaknesses / given up? | `compromises` (lowest-2 weight×cap) + `missedPreferred` (wanted-vs-has) | Trade-offs block |
| (5) Engine trade-offs for me? | `relaxationLedger` + `contradictions` + `notes` | "How we matched you" strip (ledger only if non-empty; contradictions always when present) |
| (6) Why above alternatives? | `whyAbove` (deltas >0.02, top-2 won / bottom-2 lost) | Why-above-next (best vs #2 only) |
| (7) What if priorities change? | CANNOT-SUPPORT natively — no re-score endpoint verified; `K + tier + factors` partially informs | What-if = CTA back to quiz (re-run) + confidence note; interactive re-rank is OUT for Phase 1 |

## Section order (decided)

1. **Best match hero** (verdict sentence + donut + W/C/V + ConfidenceBadge + price + modest confirming image) — answers (1)+(2). Decision confidence comes from pick + score first.
2. **Why this one** (strengths-first WhyBlock, max 3, evidence quoted verbatim) — (3). Strengths before weaknesses (loss-aversion ordering).
3. **Trade-offs & compromises** (`compromises` + `missedPreferred` as "You wanted X, this has Y") — (4)+(5), while comparison context is hot.
4. **Why above the next pick** (vs #2 only, max 2 won + 2 lost incl. bottom-2-lost for honesty) — (6).
5. **More options grid (#2–#12)** — compact cards (image, name, score, 1-line why). Keeps existing mental model.
6. **Confidence + How we matched you** (K+tier+factors, ledger, contradictions, notes; collapsible) — (5) detail for trust skeptics.
7. **What-if / next actions** — re-take/fine-tune CTA + Compare top-3 entry + Detail entry (+ share-stretch, URL state only). Labeled as actions, not scores.

## "Why this laptop?" explanation model

- **WHY THIS ONE** (feeds: `overall`, `W/C/V`, `strengths`): "[Model] scores [overall] — [W]/[C]/[V]. Strongest in [dim1 + evidence], [dim2 + evidence]." Rule: every adjective traces to a top-3 strengths dim; no strengths → score only.
- **WHAT ARE THE TRADE-OFFS** (feeds: `compromises`, `missedPreferred`, `contradictions`): "To hit [strengths], it gives up [compromises]. You wanted [wanted], this has [has]. [Contradiction note]." Rule: compromises always shown, even beside high scores.
- **WHY ABOVE NEXT** (feeds: `whyAbove`, overall gap): "Beats [#2] on [top-2 won + deltas], trails on [bottom-2 lost]. Net +[gap]." Rule: deltas ≤0.02 never mentioned; never claim victory outside the won list.
- V-nullable: omit V line with footnote, never render as failure. Evidence strings verbatim, never paraphrased.

### Forbidden claims (unbackable — NEVER render)

1. "Best laptop for video editing under ₹80k." — engine scores 12 sliced items, not the market. Only "best match for your answers."
2. "Future-proof for 5 years / will handle any AAA title." — no longevity or title-benchmark field exists.
3. "Perfect match — no compromises." — `compromises` is non-empty by construction; below-top-tier confidence forbids absolute language ("closest match" + badge instead).

## Alternatives decided

- **D1 single-best hero vs top-3 podium → A (single hero).** Engine outputs one ranked winner with pairwise deltas, not co-winners; low confidence handled by badge + More options.
- **D2 compare entry: "Compare top 3" button vs per-card checkboxes → A (single button + rivals path).** Cheapest path unifying compares with scored context guaranteed; custom selection deferred to Phase 2 if usage justifies.
- **D3 quiz step model: frozen "Step N of 4" + Advanced branch vs dynamic count vs mega-form → A (frozen + branch).** Progress stability beats precision; dynamic totals punish users for answers.
- **Homepage proof: real sample output vs illustrative catalog → real sample.** Illustrative proof teaches distrust; one real WhyBlock miniature outperforms glow.
