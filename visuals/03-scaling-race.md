# 03 — Scaling Race · O(N²) baseline vs O(N) PACT

> The math slide you can feel. Two curves start even, then the baseline
> *detonates* while PACT stays flat. This is the kinetic version of
> `docs/chart-scaling.svg`.

## Outcome

`visuals/out/03-scaling-race.html` — a self-contained HTML page that renders
a live, animated line race. Opens from `file://`. Embeddable in slideshow via
`<iframe>`. Auto-loops.

The visceral moment: a tick clock counts turns from `1 → 200`. Two lines
trace out in real time. For the first ~15 turns they look similar. Then the
baseline curve launches skyward while PACT stays low.

## The shot

```
token cost (cumulative)
│                                                                    ╱
│                                                                   ╱
│                                                                 ╱
│  BASELINE (grows as O(N²))                                    ╱
│                                                            ╱
│                                                       ╱
│                                                ╱
│                                       ╱
│                              ╱                    ← lines diverge here
│                    ╱
│          ╱
│     ╱
│ ╱________________________________________________________________  turns
│  PACT (grows as O(N))
│─────────────────────────────────────────────────────────────────────
  0    20    40    60    80    100    120    140    160    180    200

                        turns elapsed: 147 / 200
                        ratio at 147 turns: 12.6×
                        projected at 200 turns: ~17×
```

## Technical spec

### Tech choice

**Canvas 2D** or **SVG with JS-built polylines** — your pick. Canvas is
simpler for the point-per-frame draw. SVG is friendlier to inspect. Either
is fine — just no libraries.

### Data model

Compute at load time (no precomputed arrays — the math is cheap and makes
the demo honest):

```js
// Cumulative input tokens at turn N.
// Baseline: each turn carries the full accumulated context →
//   ctx(i) = i * avgTurnTokens  →  cumulativeCost = sum(ctx(i)) ≈ O(N²)
// PACT: each turn carries a compressed fixed-size state →
//   ctx(i) ≈ COMPRESSED_SIZE  →  cumulativeCost ≈ COMPRESSED_SIZE * N = O(N)

const AVG_TURN_TOKENS = 400;      // typical agent turn in tokens
const COMPRESSED_SIZE = 300;      // PACT carried size

function baselineCost(n) {
  // Σ i * AVG_TURN_TOKENS for i = 1..n = AVG * n(n+1)/2
  return AVG_TURN_TOKENS * n * (n + 1) / 2;
}
function pactCost(n) {
  // First ~10 turns uncompressed (threshold hasn't hit), then compressed
  const THRESHOLD_TURN = 10;
  if (n <= THRESHOLD_TURN) return baselineCost(n);
  return baselineCost(THRESHOLD_TURN) + (n - THRESHOLD_TURN) * COMPRESSED_SIZE;
}
```

The real benchmark at 50 turns lands on ~4.3×. That exact number must match
within 10% at the 50-turn tick — tune constants if you have to.

### Animation loop

```js
const MAX_TURNS = 200;
const TICK_MS = 40;   // 8-second total sweep
let turn = 0;

function tick() {
  turn = Math.min(turn + 1, MAX_TURNS);
  redraw();
  if (turn < MAX_TURNS) setTimeout(tick, TICK_MS);
  else setTimeout(() => { turn = 0; tick(); }, 2000); // pause then loop
}
```

Keep the curves always visible — draw *completed* segments in full opacity
and the *current tip* with a soft glow (small filled circle at the head).

### Layout

- Canvas/SVG fills 95% viewport width, 60vh height.
- Baseline curve red (`#f85149`), 2px, with filled area underneath at `#f85149` / opacity 0.06
- PACT curve green (`#3fb950`), 2px, with filled area at `#3fb950` / opacity 0.12
- Axes in `#30363d`. Tick labels in `#8b949e`, 11px mono.
- Gridlines subtle (`#21262d`, 0.5px dashed).

### HUD (bottom-left)

```
turns elapsed:      147 / 200
baseline cost:       5,903,200 tokens
PACT cost:             469,100 tokens
compression ratio:       12.6×
projected @ 200:         ~17×
```

Update every tick. Ratio displayed as `baseline / pact`.

### Annotations (overlaid on curves)

- **@ turn 10:** draw a vertical dotted line with tiny label `threshold fires`
- **@ turn 50:** small badge `4.3× measured`
- **@ turn 150:** small badge `~14× projected`

These are static — don't animate their appearance.

## Copy

- Page title: `<title>PACT scales — O(N) vs O(N²)</title>`
- Header (top): `PACT compression scales with session length`
- Subheader: `baseline cost grows as the sum of per-turn context (O(N²)) · PACT stays flat after threshold (O(N)) · the gap widens the longer you stay`

## Acceptance

- Opens from `file://`, starts animating immediately
- Tick clock reaches 200, pauses 2s, restarts
- Ratio at turn 50 reads between 3.8× and 4.7× (honors the measured 4.3×)
- HUD updates every tick without layout shift
- File size < 20 KB
- Works in Chrome, Safari, Firefox

## Nice-to-haves

- Pause with spacebar. Press `r` to restart.
- Tooltip on hover over a curve — shows exact tokens at that turn
- Responsive to window resize (re-layout axes on `resize` event, no rerun)

## Reference source

`docs/chart-scaling.svg` is the static version — same data, same story. This
visual adds the *time dimension* so the divergence lands emotionally.
