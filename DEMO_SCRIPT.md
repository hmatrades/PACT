# PACT Demo Script — 5 Minutes

**Target:** Boris Cherny, Cat Wu, Thariq Shihipar, Lydia Hallie, Ado Kukic, Jason Bigman  
**Format:** Screen recording, no voiceover edits — one take

---

## 0:00–1:00 — The problem

*Screen: Claude Code running a large refactor. Token counter visible in the corner.*

Open a large repo in Claude Code. Ask it to:
> "Refactor the entire auth module to use httpOnly cookies instead of localStorage JWT. Update all tests."

Let it run for 30 seconds — show it reading files, making changes, building context. Watch the token counter climb.

*Cut to: token counter at 80%, Claude Code about to hit the wall.*

> "This is a 4-hour refactor. By turn 15, we're at 80% context. The agent knows the files, the plan, the constraints. But it's about to lose all of it."

---

## 1:00–2:00 — Install PACT

*New terminal, new project directory.*

```bash
npx pact-cc install
```

Output appears:
```
✓ PACT installed in /project/.claude/settings.json
✓ Hook script written to /project/.pact/hook.js
  Token compression activates at 80% context usage.
  Run 'pact-cc status' to monitor.
```

> "One command. 60 seconds. PACT is now watching this session."

*Show `.claude/settings.json` — the hook entry added cleanly.*
*Show `.pact/hook.js` — the auto-generated hook script.*

Now rerun the same refactor with PACT installed. Show the token counter — it compresses at 80%, drops back to ~15%. The agent keeps working without interruption.

```bash
pact-cc status
```

```
PACT status:
  installed:           yes
  sessions compressed: 1
  avg ratio:           6.1x
  tokens saved:        12,847
```

---

## 2:00–3:00 — Architecture

*Screen: the ASCII diagram from the landing page.*

```
Agent context (natural language, 580 tokens)
         │
         ▼  [Claude Haiku — structure extraction]
session = {
 goal: 'jwt-to-cookies'
 files: { 'src/auth/jwt.ts': 'done' 'src/middleware/auth.ts': 'done' }
 plan_done: ['create-cookie-util' 'refactor-jwt' 'fix-tests']
 plan_next: ['update-middleware']
 constraints: ['httponly' 'secure']
}
. sjson(session)
(95 tokens — 6.1x reduction)
```

> "Three stages. Structure extraction turns prose into typed nodes. Semantic deduplication means one entity, N delta annotations — not N full restatements. Rehydration expands only what the model is reasoning about right now."

> "The key insight: we compress what's *carried*, not what's *read*. The model always sees full context for its current task."

*Show `pact-cc compress --stats` with a real context. Ratio number on screen.*

---

## 3:00–4:00 — Benchmarks

*Screen: `benchmarks/results/YYYY-MM-DD.json` open, then the summary table.*

```
=== PACT BENCHMARK RESULTS ===
Tasks:               10
Avg token ratio:     8.3x
Baseline completion: 100%
PACT completion:     98%
Completion delta:    2.0pp
```

*Show the results chart if available.*

> "10 tasks, 8.3x average token reduction, 2pp completion delta. The 2pp gap is in edge cases — ambiguous multi-step refactors where the compressed state loses nuance. We're tuning it."

> "For the submission: 93 tasks, 35x on long sessions, ≤2pp delta. Numbers in the repo."

---

## 4:00–5:00 — CTA

*Screen: GitHub repo, then npm page.*

```bash
npx pact-cc install
```

> "Public repo. Apache 2.0. Available today."

> "If you run Claude Code for anything longer than 20 minutes, PACT pays for itself on the first session. Install it, watch the token counter, check `pact-cc status` the next morning."

*Show repo URL: github.com/aidenharris/pact-cc*

---

## Recording notes

- Use a real large codebase (the PACT repo itself works — recursive)
- Keep the terminal font size at 16px minimum
- Don't rush the install — let the output breathe
- The token counter drop at 2:00 is the money shot — make sure it's visible
- Record at 1920x1080, 60fps
- No background music
