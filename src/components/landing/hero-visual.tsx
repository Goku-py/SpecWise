/**
 * Hero visual placeholder (P0). Stable aspect container with a blueprint
 * grid background and static SVG laptop line-art. No 3D, no animation.
 * Art is aria-hidden with a text equivalent; content is fully usable now.
 */
export function HeroVisual() {
  return (
    <figure className="overflow-hidden rounded border border-border bg-card" style={{ boxShadow: "var(--shadow-elev-1)" }}>
      <div
        className="relative flex aspect-[4/3] min-h-64 items-center justify-center lg:aspect-square"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(255 255 255 / 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.04) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 320 200"
          className="h-2/3 w-2/3 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          {/* screen */}
          <rect x="80" y="30" width="160" height="100" rx="6" />
          {/* screen content lines */}
          <line x1="96" y1="52" x2="224" y2="52" strokeWidth="1.5" />
          <line x1="96" y1="66" x2="190" y2="66" strokeWidth="1.5" />
          <line x1="96" y1="80" x2="208" y2="80" strokeWidth="1.5" />
          <line x1="96" y1="94" x2="172" y2="94" strokeWidth="1.5" />
          {/* spec ticks */}
          <line x1="112" y1="112" x2="112" y2="118" stroke="var(--electric)" />
          <line x1="160" y1="112" x2="160" y2="118" stroke="var(--electric)" />
          <line x1="208" y1="112" x2="208" y2="118" stroke="var(--electric)" />
          {/* base */}
          <path d="M60 150 L260 150 L272 168 L48 168 Z" />
          <line x1="140" y1="158" x2="180" y2="158" strokeWidth="1.5" />
          {/* corner marks */}
          <path d="M40 40 h12 M40 40 v12" stroke="var(--electric)" />
          <path d="M280 40 h-12 M280 40 v12" stroke="var(--electric)" />
          <path d="M40 160 h12 M40 160 v-12" stroke="var(--electric)" />
          <path d="M280 160 h-12 M280 160 v-12" stroke="var(--electric)" />
        </svg>
        <span className="sr-only">Line-art illustration of a laptop with hardware spec callouts.</span>
      </div>
      <figcaption className="border-t border-border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
        Interactive 3D arrives in P2 — content fully usable now.
      </figcaption>
    </figure>
  )
}
