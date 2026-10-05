# SPECWISE V2 — WHAT-IF TRACEABILITY (Phase 5, as implemented)

> For every change: USER ACTION → PROFILE CHANGE → SERVER CALL → ENGINE INPUT →
> ENGINE OUTPUT → VISIBLE CHANGE. No client scoring exists anywhere in these paths.

| USER ACTION | PROFILE CHANGE | SERVER CALL | ENGINE INPUT | ENGINE OUTPUT | VISIBLE CHANGE |
|---|---|---|---|---|---|
| Click "Change my priorities" | none (store hydrates last-submitted profile on mount) | none | — | — | Navigate `/results` → `/quiz`, all answers restored |
| Edit priority / must-have / budget | store mutator (Phase 2 semantics: prune-on-deselect, range guard) | none yet | — | — | Quiz UI updates; review step reflects interpretation |
| Confirm review → submit | profile POSTed verbatim | `POST /api/quiz {schemaVersion:v3,profile}` (existing) | CanonicalProfile → buildRequirements → runV3 | New RecommendationDTO (full pipeline) | Blobs + binding replaced → `/results` renders new ranking |
| Click "Start over" | store reset (region kept) + keys cleared incl. binding | none | — | — | `/quiz` empty; old results unreachable |
| Revisit `/results` after profile edit elsewhere | stored profile ≠ binding fingerprint | none | — | — | StaleNotice (existing UI): continue or restart |
| Revisit `/results` (pre-Phase-5 data) | no binding present | none | — | — | Legacy region-drift behavior (unbound; never dead-ends) |
| Copy answers link | none | none | — | — | `?s=` profile link copied (answers-only, unchanged) |

Binding internals: `fingerprintProfile` = recursive sorted-key canonical JSON → FNV-1a hex.
`writeBinding` stores `{ fingerprint }` via existing v2 envelope under `specwise-v3-binding`
(new `StorageKey.Binding`; envelope format untouched). `bindingStateFor`: bound iff equal;
stale iff binding exists but profile missing/mismatched; unbound iff no binding.
Engine files: zero diff. Scoring semantics created: none.
