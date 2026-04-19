# 01 — Slideshow / Pitch Deck

> The spine. Judges open this, hit `→`, and the whole story lands.

## Outcome

A single self-contained `visuals/out/01-slideshow/index.html` that navigates
like a keynote: `←` / `→` / `Space` to advance, `Esc` to overview, number keys
to jump. Works offline. No deps.

Target length: **~3 minutes** at a natural read pace. 10–12 slides.

## The story arc (don't deviate)

| # | Slide | One-line takeaway | Visual |
|--:|---|---|---|
| 1 | **Cover** | `pact-cc` — semantic compression middleware for Claude Code. 3–35×. | ASCII title block, blinking cursor, `npx pact-cc install` prompt |
| 2 | **The wall** | Every long Claude Code session hits the context wall. | Terminal scrolling console output filling up, red bar climbing to 100% |
| 3 | **The choice** | Summarize (lossy) or keep everything (expensive). Both bad. | Fork diagram — two paths, both marked ✗ |
| 4 | **The insight** | ~70% of agent context is connective tissue. | Word cloud of "I was just about to...", "as I mentioned...", "continuing from..." dimming out |
| 5 | **The funnel** | Embed `02-funnel.svg` full-bleed. | Live animated funnel |
| 6 | **The receipt** | This session → this file. 352×. | Side-by-side: `session.md` (418 KB) vs `session.pact` (1.19 KB) |
| 7 | **Scaling** | Longer session = bigger win. | Embed `03-scaling-race.html` — live diverging curves |
| 8 | **Head-to-head** | Beats every semantic-memory baseline where it counts. | Horizontal bars, PACT green, others dim |
| 9 | **Cost** | $688 / team / month. Measured, not projected. | Big typography — `$8,259.20 / year` with a ticking odometer |
| 10 | **Install** | One command. Every session compresses automatically. | `npx pact-cc install` terminal cast — typed out char by char |
| 11 | **Why PACT ≠ claude-mem** | Adjacent, not competing. Compose them. | Venn diagram: within-session vs cross-session |
| 12 | **Closing** | Thank you, Boris / Cat / Thariq / Lydia / Ado / Jason. | Credits crawl, repo link, npm link |

## Technical spec

### Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>pact-cc — the deck</title>
  <style>/* see "styles" below */</style>
</head>
<body>
  <main id="deck">
    <section class="slide" data-slide="1">...</section>
    <section class="slide" data-slide="2">...</section>
    <!-- ... -->
  </main>
  <nav id="hud">
    <span id="counter">1 / 12</span>
    <span id="progress"><i style="width:8.3%"></i></span>
  </nav>
  <script>/* see "navigation" below */</script>
</body>
</html>
```

### Navigation keys

- `→` / `Space` / `PageDown` — next slide
- `←` / `PageUp` / `Backspace` — previous slide
- `Home` — first
- `End` — last
- `1`–`9` — jump to slide N
- `0` — jump to slide 10
- `Esc` — toggle overview grid (all slides thumbnailed, click to jump)
- `f` — toggle fullscreen (`document.documentElement.requestFullscreen()`)

### Styles (starter)

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; background: #0d1117; color: #f0f6fc;
  font-family: ui-monospace, "SF Mono", Menlo, monospace; overflow: hidden; }
#deck { position: relative; height: 100vh; }
.slide { position: absolute; inset: 0; padding: 6vh 8vw;
  opacity: 0; pointer-events: none; transition: opacity 240ms ease; }
.slide.active { opacity: 1; pointer-events: auto; }
.slide h1 { font-size: clamp(48px, 8vw, 128px); font-weight: 700;
  letter-spacing: -0.02em; margin-bottom: 0.4em; }
.slide h2 { font-size: clamp(24px, 3vw, 40px); color: #8b949e; }
.slide .rule { color: #30363d; margin: 1em 0; letter-spacing: 0.5em; }
#hud { position: fixed; bottom: 16px; right: 20px;
  color: #8b949e; font-size: 12px; display: flex; gap: 12px; align-items: center; }
#progress { display: inline-block; width: 120px; height: 2px;
  background: #21262d; position: relative; }
#progress i { display: block; height: 100%; background: #3fb950;
  transition: width 240ms ease; }
.blink::after { content: '▊'; color: #3fb950; animation: blink 1s steps(2) infinite; }
@keyframes blink { 50% { opacity: 0; } }
.fill { color: #58a6ff; } .out { color: #3fb950; } .warn { color: #d29922; }
.lossy { color: #f85149; }
```

Use `clamp()` for sizes so slides survive projector resolutions.

### Navigation JS (starter, ~40 lines)

```js
const slides = document.querySelectorAll('.slide');
let i = 0;
const counter = document.getElementById('counter');
const progress = document.querySelector('#progress i');
function show(n) {
  i = Math.max(0, Math.min(slides.length - 1, n));
  slides.forEach((s, k) => s.classList.toggle('active', k === i));
  counter.textContent = `${i + 1} / ${slides.length}`;
  progress.style.width = `${((i + 1) / slides.length) * 100}%`;
  history.replaceState(null, '', `#${i + 1}`);
}
const keys = {
  ArrowRight: () => show(i + 1), ' ': () => show(i + 1), PageDown: () => show(i + 1),
  ArrowLeft: () => show(i - 1), PageUp: () => show(i - 1), Backspace: () => show(i - 1),
  Home: () => show(0), End: () => show(slides.length - 1),
  f: () => document.documentElement.requestFullscreen(),
};
addEventListener('keydown', e => {
  if (e.key >= '1' && e.key <= '9') return show(+e.key - 1);
  if (e.key === '0') return show(9);
  keys[e.key]?.();
});
addEventListener('load', () => show(+location.hash.slice(1) - 1 || 0));
```

### Per-slide hints

- **Slide 1 — cover:** Big `pact-cc` in the center. Under it: `semantic compression middleware for claude code`. Under that: a fake prompt `$ npx pact-cc install` with a blinking `▊`.

- **Slide 2 — the wall:** Use a `<pre>` that visually fills line by line (CSS keyframe animating `max-height` of a long prefilled block), with a right-side gauge that grows from 0% to 100% in red.

- **Slide 5 — funnel:** `<iframe src="../02-funnel.svg" style="width:100%;height:80vh;border:0">` — let 02 do its thing.

- **Slide 7 — scaling:** `<iframe src="../03-scaling-race.html" style="width:100%;height:70vh;border:0">` — same pattern.

- **Slide 9 — cost:** Render a big `$` number animated from 0 to 8259.20 in 2.4s using `requestAnimationFrame` (no library). Under it, smaller text: `per 20-engineer team · per year · measured, not projected`.

- **Slide 10 — install cast:** Typewriter effect. Letters appear at ~40ms/char, then the output lines appear 60ms apart:
  ```
  $ npx pact-cc install
  ✓ PACT installed in /your/project/.claude/settings.json
  ✓ Hook script written to /your/project/.pact/hook.js
    Token compression activates at 80% context usage.
    Run 'pact-cc status' to monitor.
  ```

- **Slide 11 — Venn:** Two overlapping circles. Left labeled `claude-mem (cross-session)`. Right labeled `PACT (within-session)`. Overlap labeled `compose — use both`.

## Nice-to-haves (skip if short on time)

- Slide transition sound (noop — we said no sound, keep it)
- Presenter mode (`?presenter=1` query shows speaker notes) — read from `data-notes` attribute on `.slide`
- Print mode (`@media print` — stack slides vertically for PDF export)

## Acceptance

- Opens from `file://` with zero setup
- `→` advances, `←` reverses, number keys jump, `Esc` overview, `f` fullscreen
- Slides 1 through 12 exist and render on a 1920×1080 screen
- Embeds `02-funnel.svg` and `03-scaling-race.html` via iframe
- All numbers match the canonical list in `README.md`
- No external network calls (check DevTools → Network)
- Survives Cmd-R with current slide preserved via `location.hash`

## When you're done

Record a 30-second screen capture of yourself arrowing through all 12 slides
and drop it at `visuals/out/01-slideshow/preview.mov` if you have the tool.
If not, leave a note in `DELIVERY.md` asking for it.
