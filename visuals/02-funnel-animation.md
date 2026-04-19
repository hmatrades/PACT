# 02 — Compression Funnel (animated)

> The hero visual. Makes "352× smaller" tangible in one glance.

## Outcome

`visuals/out/02-funnel.svg` — a self-contained animated SVG. Open it in a
browser and it moves. Drop it in an `<iframe>` and it moves. Screenshot it
and the still frame still reads.

**Reference** — there's a static v1 at [`docs/funnel.svg`](../docs/funnel.svg).
You're upgrading it: more motion, tighter composition, screen-proof at 4K.

## The shot

```
┌────────────────────────────────────────────────────────────────────┐
│ pact compression funnel · session.md → session.pact · 352× smaller │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   ┌─────────────┐      ╲                                           │
│   │ session.md  │       ╲_____________                             │
│   │ ░░░░░░░░░░░ │       /   HAIKU   / ─────►  [session.pact]       │
│   │ 418 KB      │ ───► /  jsonToPACT│                              │
│   │ ░░░░░░░░░░░ │      ╲____________╲                              │
│   └─────────────┘                                                  │
│                       ~70% connective                              │
│                         tissue dropped                             │
│                                                                    │
│              [ 352× smaller · lossless structural ]                │
└────────────────────────────────────────────────────────────────────┘
```

## What should move

1. **Input file feeds into the funnel.** A tall `.md` document at the left
   has faint horizontal bars representing lines of prose. Those bars detach
   one at a time (staggered 60ms apart) and slide rightward into the funnel
   mouth. The .md stays put; only "tokens" peel off and flow.

2. **Inside the funnel, prose fragments swirl.** Short ghost-text snippets
   (`## user`, `## assistant`, `"reading files..."`, `commit abf5fea`,
   `benchmarks/run.mjs`, `## tool_use`, `"continuing from..."`) drift from
   the wide mouth toward the neck, fading as they concentrate. Most die in
   the walls — that's the "70% connective tissue" visual.

3. **At the neck, green particles shoot out.** Small dots emerge in a tight
   stream — these are the survivors, the structural state. 4–6 particles in
   flight at any moment, 1.6s loop, slightly randomized vertical jitter.

4. **On the right, `session.pact` pulses.** The output file glows with a
   slow (2s) opacity pulse. Below it, a live PACT snippet:
   ```
   session = {
    goal: 'ship-pact-hackathon'
    files: { 12 paths }
    plan_done: [12 steps]
    ...
   }
   . sjson(session)
   ```

5. **The "352× smaller" pill at the bottom has a subtle glow.** Gentle
   `<animate>` on a drop-shadow filter's `stdDeviation` from 2 → 4 → 2 over 3s.

## Technical spec

- **Format:** plain SVG with SMIL animations. No JS. No CSS animations
  (SMIL degrades more gracefully when the SVG is `<img>` embedded vs iframed).
- **Viewbox:** `0 0 1400 600` — wider than v1 so the narrative reads left-to-right.
- **No external fonts.** Use `font-family="ui-monospace, SF Mono, Menlo, monospace"`
  on the root `<svg>`.
- **Gradients & filters go in `<defs>`** — don't inline per-element.
- **Every animated element** must have a `<title>` child for screen readers
  and static screenshot context.

## Concrete bits you'll need

### Detaching prose lines (input side)

```xml
<g id="prose-line">
  <rect x="78" y="0" width="70" height="3" fill="#0d1117" opacity="0.5">
    <animate attributeName="x" from="78" to="500" dur="1.2s"
             begin="0s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.5;0.8;0" dur="1.2s"
             begin="0s" repeatCount="indefinite"/>
  </rect>
</g>
```

Duplicate 8 of these with `begin` offsets `0s`, `0.15s`, `0.3s`, ... `1.05s`
and staggered y-coordinates inside the .md icon.

### Drifting fragments (funnel interior)

Prose text labels with `<animateTransform>` moving them along a path, opacity
fading `1 → 0` as they approach the neck. Put 10–14 of them. Pick phrases
that feel authentically agentic:

```
"## user", "build it my love", "## assistant", "Reading files...",
"Edit src/cli.ts", "npm test", "140 tests pass", "## tool_use",
"commit abf5fea", "continuing...", "benchmarks/run.mjs",
"chart-compare.svg", "as I mentioned", "going back to"
```

### Particle stream (output)

The static v1 already has 4 circles shooting through the neck. Keep that
pattern but:
- Increase to 6 particles with staggered `begin` offsets (`0`, `0.26s`, `0.53s`, `0.8s`, `1.06s`, `1.33s`)
- Add a faint trail: each particle gets a second `<circle>` with `r=3.5`, `opacity=0.3`, same animation with `dur` 0.08s later

### Pulsing output file

```xml
<rect x="1250" y="280" width="80" height="24" rx="4" fill="url(#pactGrad)" filter="url(#glow)">
  <animate attributeName="opacity" values="0.88;1;0.88" dur="2.2s" repeatCount="indefinite"/>
</rect>
```

## Palette / reference

Gradients already defined in v1 — reuse:

```xml
<linearGradient id="mdGrad" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#58a6ff"/>
  <stop offset="1" stop-color="#1f6feb"/>
</linearGradient>
<linearGradient id="pactGrad" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#3fb950"/>
  <stop offset="1" stop-color="#238636"/>
</linearGradient>
<linearGradient id="funnelGrad" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#21262d" stop-opacity="0.9"/>
  <stop offset="1" stop-color="#161b22" stop-opacity="0.95"/>
</linearGradient>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
  <feGaussianBlur stdDeviation="3" result="blur"/>
  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
```

## Copy (exact strings to use)

- Title: `PACT compression funnel · session.md → session.pact`
- Subtitle: `418 KB of live conversation reduced to 1.19 KB of structured state · 352× smaller · engine-validated`
- Funnel top annotation: `[ Haiku: extract structured JSON ]` / `↓ jsonToPACT() · deterministic encoder`
- Funnel bottom: `~70% connective tissue dropped` / `lossless on files · plan · entities · constraints`
- Output label: `1.19 KB` / `structured state` / `~305 BPE tokens`
- Input label: `418 KB` / `rendered conversation` / `~107,013 BPE tokens`
- Pill: `352× smaller · lossless structural`

## Acceptance

- Viewable by double-clicking the `.svg` in Finder — movement visible in browser
- No network calls
- < 30 KB file size
- Still reads as a static image if opened in a viewer that strips SMIL
- Tested in Safari + Chrome + Firefox
- Title/subtitle legible at 1200px viewport width and at 600px

## Reference source

Study `docs/funnel.svg` for the composition baseline. Keep the left-to-right
flow and the general shot, but commit fully to motion this time. The v1 is
80% dead frame — the v2 should feel alive even in peripheral vision.
