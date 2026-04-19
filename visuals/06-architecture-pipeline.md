# 06 — Architecture Pipeline (animated)

> The how-it-works visual. Shows the three-stage PACT pipeline with data
> actually flowing through it, end to end. More about comprehension than drama.

## Outcome

`visuals/out/06-architecture.svg` — a single animated SVG. Shows the pipeline
from "agent context" on the left to "injected back into the session" on the
right, with tokens flowing through labeled stages.

## The shot

```
  agent context              [1] Structure            [2] Semantic          PACT program           [3] Lossless
  (natural language) ──────► extraction (Haiku) ──► dedup (encoder) ──► (compact form) ──────► rehydration
                             JSON output              jsonToPACT            validated by engine      on demand
       ~107k tokens                                                           ~305 tokens              ↓
                                                                                                   natural
                                                                                                   language
                                                                                                   subgraph

                        ─── blue particles flow in ────────────────────► green particles flow out ───
```

## Technical spec

### Format

Plain SVG with SMIL. Width 1400, height 420 viewport.

### Five boxes, three edges

Five labeled nodes connected by animated edges:

1. **`agent context`** (left) — light blue node, dotted border, label
   `~107k tokens · natural language`
2. **`[1] extract structured JSON`** — inner rectangle, amber accent,
   annotation `Haiku prompt → raw JSON`
3. **`[2] encode to PACT`** — inner rectangle, amber accent,
   annotation `jsonToPACT() · deterministic · never fails`
4. **`PACT program`** (right-center) — green node, solid border,
   label `~305 tokens · engine-validated`
5. **`[3] rehydrate entity on demand`** (far right, below PACT) —
   green node, dashed edge back to PACT, annotation
   `subgraph expand → natural language at query time`

Use `<rect rx="8">` for rounded corners. `<text>` inside centered with
`text-anchor="middle"`.

### The flow

Between each pair of adjacent boxes, draw a straight path (or slightly curved
`<path d="M...Q...">`). Animate small dots along each path:

```xml
<!-- Particle flowing along path id="edge1" -->
<circle r="3" fill="#58a6ff">
  <animateMotion dur="1.8s" repeatCount="indefinite">
    <mpath href="#edge1"/>
  </animateMotion>
  <animate attributeName="opacity" values="0;1;1;0" dur="1.8s" repeatCount="indefinite"/>
</circle>
```

Stagger 3–5 particles per edge with offset `begin` times so the flow looks
continuous.

Edges 1 and 2 (input side) use blue particles (`#58a6ff`). Edge 3 (output →
PACT) uses amber (`#d29922`) — this is where compression happens. Edge 4
(PACT → rehydration) uses green (`#3fb950`), dashed, showing "pulled on
demand" not "always on."

### The numbers

Each box has a small corner label showing token count at that stage:

- `agent context` → `107,013 tokens`
- after `[1] extract`   → `~2,100 tokens (JSON intermediate)`
- after `[2] encode`    → `305 tokens`
- `PACT program`        → `305 tokens · 351× smaller`
- after `[3] rehydrate` → `~580 tokens of specific entity prose`

These numbers are referenced from the testimony measurement. Cite them
accurately — these are real.

### Annotation layer

Below the pipeline, thin 10pt labels in `#8b949e`:

- Under stage [1]: `~100ms · Haiku API call`
- Under stage [2]: `~2ms · pure function · zero deps`
- Under stage [3]: `only when agent asks for detail`

### Branding strip (bottom)

```
├─ pact-cc · semantic compression middleware ─────── v0.1 ─── MIT ─┤
```

Set in 9pt mono, `#30363d` — subtle credit.

## Palette

Re-use the palette from `02-funnel`. Gradients:

```xml
<linearGradient id="nodeBlue" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#58a6ff" stop-opacity="0.9"/>
  <stop offset="1" stop-color="#1f6feb" stop-opacity="0.9"/>
</linearGradient>
<linearGradient id="nodeGreen" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#3fb950" stop-opacity="0.9"/>
  <stop offset="1" stop-color="#238636" stop-opacity="0.9"/>
</linearGradient>
<linearGradient id="nodeAmber" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#d29922" stop-opacity="0.85"/>
  <stop offset="1" stop-color="#9e6a1a" stop-opacity="0.85"/>
</linearGradient>
```

Background `#0d1117`. Node borders `#30363d`, 1.5px.

## Acceptance

- Renders as animated SVG at `1400 × 420` viewport
- Particles flow continuously through each edge
- All 5 nodes labeled with the correct token counts
- File size < 20 KB
- Readable at 1920px (judges' laptop) and 640px (thumbnail) widths
- Accessible — each `<g>` for a node has a `<title>` child with node name

## Reference

Loosely based on the ASCII pipeline already in `SUBMISSION.md` and
`docs/index.html` (search "Structure Extraction ... Semantic Dedup ... PACT
Program ... Lossless Rehydration"). This is the animated version.
