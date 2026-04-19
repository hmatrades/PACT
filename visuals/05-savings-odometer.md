# 05 — Savings Odometer

> A huge green number that ticks. Judges walk by, glance, and the ticker
> is counting dollars saved across a whole team. Emotional, not analytical.

## Outcome

`visuals/out/05-savings-odometer.html` — fullscreen dark page. One giant
animated number. Matrix-rain background, tasteful. Looping math.

## The shot

```
                               (matrix rain, dim, in background)

                    ┌─────────────────────────────────────────┐
                    │                                         │
                    │      $ 8,259.20                         │
                    │                                         │
                    │      team of 20 · per year              │
                    │      (25 sessions/wk/eng · $3/1M tok)   │
                    │                                         │
                    │      ─── cumulatively saved ───         │
                    │      tokens: 2,294,222,000              │
                    │      bytes:  8.39 GB                    │
                    │                                         │
                    │      → 106,708 tokens / $0.32           │
                    │        per session — measured           │
                    │                                         │
                    └─────────────────────────────────────────┘
```

## Technical spec

### Tech

Canvas 2D for matrix rain in the background. HTML over it for the readable
numbers. No libraries. Single file.

### The numbers (computed live)

```js
const PER_SESSION_TOKENS = 106708;  // measured
const PER_SESSION_USD = PER_SESSION_TOKENS / 1e6 * 3.0;  // $0.32
const SESSIONS_PER_WEEK = 25;
const TEAM = 20;
const WEEKS_PER_YEAR = 52;

const yearlyTokens = PER_SESSION_TOKENS * SESSIONS_PER_WEEK * TEAM * WEEKS_PER_YEAR;
// = 2,774,408,000 (use ≈ 2.29B — match the SUBMISSION.md 4.3 weeks/mo math)
```

Use the docs/index.html calculator math, not fresh constants — keep numbers
in lockstep. Cross-check: team-year USD ≈ `$8,259.20`.

### The ticker

One big number at center. On page load, animate from 0 → `$8,259.20` over
2.8 seconds using `requestAnimationFrame` with an easeOutCubic curve:

```js
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function tick(el, target, duration = 2800, prefix = '$', decimals = 2) {
  const start = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const v = target * easeOutCubic(t);
    el.textContent = prefix + v.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
```

Call it for the big USD, for the tokens number, and for the bytes number
(format bytes as GB/MB — `(n / 1e9).toFixed(2) + ' GB'`).

### After the initial tick

After finish, keep the number "alive" with a slow drift: every ~300ms,
recompute as if an additional partial session had occurred (`target +=
PER_SESSION_USD * 0.02`) and retick. The effect: the number keeps slowly
ascending, like a live odometer.

### Matrix rain background

Canvas at 100vw × 100vh, z-index 0. Characters — use pact-themed glyphs:
`{ } [ ] session plan_done files entities sjson goal constraints`. Draw
vertical columns:

```js
const canvas = document.getElementById('rain');
const ctx = canvas.getContext('2d');
const GLYPHS = '{}[]()=:.,abcdef01'.split('');
// sparse columns at random intervals, each trailing 20-ish glyphs that fade
// out. opacity 0.08 max — background, not foreground
```

Don't let rain compete with the number. Keep it dim. Use `#0d1117` page bg
and `#3fb950` rain at `opacity: 0.08` — barely-there green shimmer.

Palette: rain glyphs `#3fb950` at 8% opacity. Main number `#3fb950` at 100%,
glowing via `text-shadow: 0 0 24px rgba(63, 185, 80, 0.3)`. Secondary text
`#8b949e`.

### Font sizing

```css
.big { font-size: clamp(72px, 14vw, 240px); font-weight: 700; letter-spacing: -0.03em; }
.mid { font-size: clamp(18px, 2vw, 28px); color: #8b949e; }
.stats { font-size: clamp(14px, 1.3vw, 18px); color: #8b949e; }
```

The big number should dominate — if a judge sees it from 6 feet away they
should still read "$8,259.20".

### Interactivity (minimal)

- Click anywhere → reset and tick again from 0
- Press any key → same

## Copy (exact)

- Title element (hidden on page, in `<title>`): `PACT savings — live`
- Big number: `$ 8,259.20` (always 2 decimals, en-US commas)
- Under: `team of 20 · per year`
- Small: `(25 sessions/wk/eng · $3/1M input tokens · Sonnet 4.6 pricing)`
- Section: `─── cumulatively saved ───`
- Line: `tokens: <live number>`
- Line: `bytes:  <live number> GB`
- Footer: `→ 106,708 tokens / $0.32 per session — measured this build`

## Acceptance

- Full-viewport black background with subtle green rain
- Number ticks from 0 to `$8,259.20` on load
- Numbers remain legible at laptop, projector, and phone widths
- No libraries, no network calls
- Click/key resets the ticker
- File size < 10 KB

## Nice-to-have

- Query param `?sessions=50&team=100` overrides defaults live
- `?print=1` stops the animation on the final number (for screenshots)
