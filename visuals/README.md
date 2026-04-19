# PACT — Visuals Dispatch (for Sonnet 4.6)

> **Read this first.** You are Sonnet 4.6 building the visual/presentation layer
> for PACT's hackathon submission. Opus 4.7 (the architect) has already shipped
> the engine, benchmarks, docs, and tests. Your job is the show.

## Who the audience is

**The judges** — Boris, Cat, Thariq, Lydia, Ado, Jason. They built Claude Code.
They know the context wall firsthand, they skim submissions fast, and they will
open the pitch deck on a laptop, hit arrow keys, and decide in 3 minutes whether
PACT is interesting.

Build for that person. Nothing that requires reading. Everything that rewards
a glance.

## The aesthetic

**C++/terminal/hacker.** Think matrix-rain-but-tasteful, Ghost in the Shell,
`htop` at 120 columns, old-school demoscene. The rest of the repo already
commits to this aesthetic — match it, don't invent a new one.

Palette — lock these exact values, they're already used across the site:

| Token | Hex | Use |
|---|---|---|
| bg | `#0d1117` | page background |
| panel | `#161b22` | card/panel bg |
| border | `#30363d` / `#21262d` | dividers |
| text | `#f0f6fc` | primary |
| dim | `#8b949e` | secondary |
| blue | `#58a6ff` → `#1f6feb` | input / baseline |
| green | `#3fb950` → `#238636` | PACT / savings / output |
| amber | `#d29922` | warnings / annotations / funnels |
| red | `#f85149` | lossy strategies |
| pink | `#a371f7` | accent (use sparingly) |

**Typography:** `ui-monospace, SF Mono, Menlo, monospace` for everything.
Any sans-serif breaks the spell. Variable weight is allowed (400 / 600 / 700).

**Motion:** SVG SMIL for static-file animations. CSS keyframes for HTML.
Canvas/JS only when SVG can't express it (e.g., high-density particle fields).
**No external JS dependencies.** Everything self-contained, works offline from
a `file://` URL. Judges may open files directly — no dev server assumption.

**Sound:** no sound. Judges are on mute.

## Your deliverables

Six numbered briefs. Start with `01-slideshow` — it's the spine that embeds
everything else. The others stand alone but get linked from slides.

| # | File | What | Priority |
|--:|---|---|---|
| 01 | `01-slideshow.md` | Navigable pitch deck, 10–12 slides | **must ship** |
| 02 | `02-funnel-animation.md` | Upgraded compression funnel (particles, motion) | **must ship** |
| 03 | `03-scaling-race.md` | O(N²) baseline vs O(N) PACT diverging live | **must ship** |
| 04 | `04-hook-terminal.md` | Terminal sim: session fills, hook fires, compresses | nice to have |
| 05 | `05-savings-odometer.md` | Matrix-rain counter that ticks tokens/dollars saved | nice to have |
| 06 | `06-architecture-pipeline.md` | Animated pipeline with particles flowing | nice to have |

**Ship 01–03 first.** If time remains, pick up 04–06.

## Data sources

Treat these as read-only. Do not refit numbers — use what's measured.

| File | What |
|---|---|
| `visuals/assets/data/2026-04-19.json` | 11-task PACT benchmark run |
| `visuals/assets/data/2026-04-19-compare.json` | PACT vs sliding / summary / obs-log |
| `docs/testimony/session.md` | 420 KB rendered build session |
| `docs/testimony/session.pact` | 1.19 KB PACT output from same session |
| `SUBMISSION.md` | authoritative narrative — copy phrasing from here |

Key numbers to cite (all measured, no asterisks):

- **2.86×** total ratio across 11-task suite (heuristic, 227 turns)
- **4.3×** on the 50-turn long-session task (representative of 4-hour Claude Code session)
- **6.1×** measured LLM compression (Haiku) on 14-turn refactor
- **35×** Rust reference impl on entity-dense sessions
- **100%** completion parity vs baseline (no task regressions)
- **352×** size reduction on this build session: 420 KB session.md → 1.19 KB session.pact
- **$0.32** input-token savings on that single session at Sonnet 4.6 pricing
- **$8,259 / yr** projected for a 20-engineer team (25 sessions/wk/eng)

## Output directory

Write your deliverables to `visuals/out/` as self-contained files:

```
visuals/out/
├── 01-slideshow/
│   ├── index.html
│   └── assets/
├── 02-funnel.svg            (or funnel.html if animation needs JS)
├── 03-scaling-race.html
├── 04-hook-terminal.html
├── 05-savings-odometer.html
└── 06-architecture.svg
```

When slide 01 embeds 02/03/..., use relative iframes (`<iframe src="../02-funnel.svg">`).
That keeps each deliverable independently viewable.

## Quality bar

A visual is shippable when:

- [ ] It runs from `file://` with zero setup
- [ ] It loads in under 1 second on a laptop
- [ ] It reads at a glance — no paragraphs to decode
- [ ] It uses only the palette / typography above
- [ ] It cites measured numbers, never invented ones
- [ ] It still reads correctly if screenshotted (motion is garnish, not load-bearing)

## What NOT to do

- Don't add new benchmark claims — the numbers are the numbers.
- Don't build anything that requires a build step, bundler, or npm install.
- Don't use stock icons, emoji, or clipart.
- Don't use Google Fonts, CDNs, or any external network call.
- Don't over-explain — a slide with 3 lines beats one with 30.
- Don't change the story. The narrative is fixed in `SUBMISSION.md`.

## When you're done

Append your work summary to `visuals/DELIVERY.md` with: what shipped, what
didn't, open questions. Commit your work on a feature branch — don't push to
`main` unless explicitly told.

Now go. `01-slideshow.md` is the entry point.
