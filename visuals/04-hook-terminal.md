# 04 — Hook Terminal Demo

> Makes the hook feel real. A simulated Claude Code session fills its context
> window, PACT fires at 80%, and the session keeps going with compressed
> context. No real API calls — every line is scripted.

## Outcome

`visuals/out/04-hook-terminal.html` — looks like a terminal. A fake Claude
Code session runs in front of you. Character-by-character, not replay-video.
Auto-loops.

## The shot

```
┌──────────── ~/code/big-refactor · claude code session ────────────┐
│ [user] Refactor the auth system to use httpOnly cookies           │
│ [claude] Reading src/auth/jwt.ts ... found token gen at line 45   │
│ [tool] Edit src/auth/jwt.ts                                       │
│ [tool] Read src/middleware/auth.ts                                │
│ ...                                                               │
│                                                                   │
│ [ctx ████████████████████████░░░░░░░░  78,341 / 200,000  (39%) ] │
│ [ctx ████████████████████████████░░░░  137,200 / 200,000 (68%) ] │
│ [ctx ██████████████████████████████░░  159,040 / 200,000 (80%) ] │
│                                                                   │
│ → PreToolUse hook fires: pact-cc compress                         │
│   ▸ extracting structured JSON via Haiku ...                      │
│   ▸ jsonToPACT() → 94 tokens (6.2× ratio)                         │
│   ▸ engine validation ✓                                           │
│   ▸ injecting prompt_inject into next tool call                   │
│                                                                   │
│ [ctx ████████████░░░░░░░░░░░░░░░░░░░░  26,110 / 200,000 (13%) ] │
│                                                                   │
│ [claude] Continuing. Per session state: goal=jwt-to-cookies,     │
│          files done: [src/auth/jwt.ts, src/utils/cookies.ts],    │
│          next: update-middleware ...                              │
│ [tool] Edit src/middleware/auth.ts                                │
└───────────────────────────────────────────────────────────────────┘
```

## Technical spec

### Tech

Single HTML file. A `<pre>` inside a styled `<div>` that looks like a macOS
terminal (red/yellow/green dots in the top-left chrome). A small JS typewriter
engine.

### DOM style — element APIs only

Use `document.createElement` + `textContent` + `appendChild` for every node.
No assigning to `.innerHTML`, no `.insertAdjacentHTML`. Content is
author-controlled so this is hygiene, not a real XSS concern — but it keeps
the code style clean and future-safe.

```js
function span(text, color) {
  const s = document.createElement('span');
  s.textContent = text;
  if (color) s.style.color = color;
  return s;
}
// Build a gauge row by appending spans.
```

### Color coding

- Prompt brackets `[user]`, `[claude]`, `[tool]` → `#58a6ff`, `#d29922`, `#a371f7`
- Context gauge `[ctx ... ]` → block-drawing characters, green → amber → red as % climbs
- Hook line `→ PreToolUse hook fires` → `#3fb950` bold
- Internal hook steps `▸` → `#8b949e`
- Compression confirmation line → `#3fb950`
- Continuation block → `#f0f6fc`

### Typewriter engine

```js
async function type(el, str, perChar = 12) {
  for (const c of str) {
    el.appendChild(document.createTextNode(c));
    await sleep(c === ' ' ? 4 : perChar + Math.random() * 8);
  }
  el.appendChild(document.createTextNode('\n'));
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
```

Call `type()` for each line sequentially. Don't prerender — let the user watch
it compose.

### The gauge

The `[ctx ... ]` lines should animate mid-sequence, not just appear. Build
the row with DOM nodes so you can swap only the bar/color without re-rendering
the line:

```js
async function gauge(row, target, max = 200000) {
  const width = 32;
  const start = +row.dataset.last || 0;
  const steps = 30;
  // row structure: [ "[ctx " | <span.bar> | "  " | <span.count> | " ]" ]
  const bar = row.querySelector('.bar');
  const count = row.querySelector('.count');
  for (let i = 1; i <= steps; i++) {
    const v = start + (target - start) * (i / steps);
    const pct = v / max;
    const filled = Math.round(pct * width);
    bar.textContent = '█'.repeat(filled) + '░'.repeat(width - filled);
    bar.style.color = pct < 0.5 ? '#3fb950' : pct < 0.8 ? '#d29922' : '#f85149';
    count.textContent = `${Math.round(v).toLocaleString()} / ${max.toLocaleString()} (${Math.round(pct*100)}%)`;
    await sleep(14);
  }
  row.dataset.last = target;
}
```

Climb to 39%, then 68%, then 80% — each gauge smooth-animates from the prev
value.

### Hook fire sequence

After hitting 80%, pause 400ms (suspense), then:

1. Print `→ PreToolUse hook fires: pact-cc compress` (green, typewriter)
2. 200ms pause
3. `  ▸ extracting structured JSON via Haiku ...` (dim gray)
4. Show a small spinner `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` cycling in place for ~800ms
5. Replace line with `  ▸ jsonToPACT() → 94 tokens (6.2× ratio)`
6. `  ▸ engine validation ✓`
7. `  ▸ injecting prompt_inject into next tool call`
8. 400ms
9. Animate the gauge DOWN from 80% to 13% — the visual payoff
10. Continue the session with `[claude] Continuing...`

### Chrome

A `<div>` at top with `height: 28px`, three dots (`#f85149`, `#d29922`,
`#3fb950`, 10px radius), and centered title `~/code/big-refactor · claude code session`
in 11px dim gray.

### Auto-loop

After the continuation block, wait 4s, then clear the terminal and restart.
This loop should look natural — not jarring. A quick fade-to-black (200ms
opacity 1→0 on the `<pre>`) before restart sells it.

## Copy (exact script)

```
[user] Refactor the auth system to use httpOnly cookies
[claude] I'll read the relevant files first.
[tool] Read src/auth/jwt.ts
[tool] Read src/middleware/auth.ts
[claude] Found token generation at jwt.ts:45. Plan: extract cookie utilities,
         refactor generateToken, update middleware to read from req.cookies.
[tool] Write src/utils/cookies.ts
[tool] Edit src/auth/jwt.ts
... 14 tool calls elided ...
[ctx ████████████████████████░░░░░░░░  78,341 / 200,000 (39%) ]
... continuing work ...
[ctx ████████████████████████████░░░░  137,200 / 200,000 (68%) ]
... session stretches on ...
[ctx ██████████████████████████████░░  159,040 / 200,000 (80%) ]

→ PreToolUse hook fires: pact-cc compress
  ▸ extracting structured JSON via Haiku ...
  ▸ jsonToPACT() → 94 tokens (6.2× ratio)
  ▸ engine validation ✓
  ▸ injecting prompt_inject into next tool call

[ctx ████████████░░░░░░░░░░░░░░░░░░░░  26,110 / 200,000 (13%) ]

[claude] Continuing. State carried: goal=jwt-to-cookies. Done:
         [src/auth/jwt.ts, src/utils/cookies.ts]. Next: update-middleware.
[tool] Edit src/middleware/auth.ts
[tool] Bash: npm test
[tool] ✓ all tests pass
```

## Acceptance

- Opens from `file://` and starts typing immediately
- Gauge animates smoothly, not jumping
- Hook fire sequence lands at the ~80% mark, exactly
- Auto-loops every ~35 seconds
- No visible DOM flash on restart
- Terminal chrome reads as "macOS-esque" without cliché
- Works at 1280px viewport and up
- Every node built with element APIs — no `innerHTML` anywhere

## File size target

< 15 KB (all inline, no assets).

## Nice-to-have

- Press `space` to pause. Press again to resume.
- Press `r` to restart.
