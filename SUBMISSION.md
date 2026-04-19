# PACT — Hackathon Submission Write-Up

**Category:** Built with Claude Code  
**Submitter:** Aiden Hecker  
**Repo:** github.com/aidenharris/pact-cc  
**npm:** npmjs.com/package/pact-cc  

---

## What it does

PACT is semantic compression middleware for Claude Code agents. When a session approaches its context limit, PACT intercepts, compresses the conversation history into PACT syntax (a compact scripting language), and injects the compressed version as context. The model carries 6–35x fewer tokens without losing task state.

One command to install:

```bash
npx pact-cc install
```

After that, every Claude Code session in that project automatically compresses when context hits 80%.

---

## The problem

Extended Claude Code sessions are expensive. A 4-hour refactor across a large codebase fills your context window. At that point you have two bad choices:

1. **Summarize** — cheap, but lossy. The model forgets constraints, file states, what it already tried.
2. **Keep everything** — preserves fidelity, but you're paying for 200k tokens on every tool call.

The root cause: ~70% of agent context is connective tissue — prose narrative, repeated entity descriptions, turn-by-turn restatement of what the agent already knows. None of that is load-bearing for task completion.

---

## The solution

Three-stage pipeline:

**1. Structure extraction** — agent context gets parsed into a typed structure. File states, plan steps, entity relationships, constraints become first-class fields instead of embedded prose.

**2. Semantic deduplication** — instead of re-stating "we're working on the auth module" 40 times, PACT stores one entity record and N delta annotations.

**3. Lossless rehydration** — when the model needs full context on a specific entity, the relevant subgraph expands back to natural language. Compression is for what's *carried*, not what's *read*.

---

## Architecture

```
Agent context (natural language, ~580 tokens / 10 turns)
         │
         ▼  [Claude Haiku — extract structured JSON]
{
  "goal": "jwt-to-cookies",
  "files": { "src/auth/jwt.ts": "done", ... },
  "plan_done": ["create-cookie-util", "refactor-jwt"],
  "plan_next": ["update-middleware"],
  "constraints": ["httponly", "secure"],
  "entities": { "generateToken": "void-sets-cookie" }
}
         │
         ▼  [jsonToPACT() — deterministic encoder]
session = {
 goal: 'jwt-to-cookies'
 files: { 'src/auth/jwt.ts': 'done' ... }
 plan_done: ['create-cookie-util' 'refactor-jwt']
 plan_next: ['update-middleware']
 constraints: ['httponly' 'secure']
 entities: { 'generateToken': 'void-sets-cookie' }
}
. sjson(session)
(~95 tokens — 6.1x reduction)
         │
         ▼  [injected as prompt_inject via PreToolUse hook]
Model carries 95 tokens instead of 580.
On the next tool call, context is already compressed.
```

---

## Benchmarks

Measured on 10-task benchmark suite (see `benchmarks/results/`):

| Metric | Value |
|--------|-------|
| Avg token reduction | 6–35x (scales with session length) |
| Task completion delta | ≤2pp |
| Engine tests | 140/140 |
| Install time | <60s |

**Why 6–35x range:** Short sessions (1–5 turns) see 3–6x. Long sessions (20+ turns with entity repetition) see 15–35x. The headline 35x comes from real multi-hour agent runs where the same entities get re-described dozens of times.

**Token counting note:** Benchmarks use the PACT lexer for structural ratios. Production token savings (BPE model tokens) are measured via `usage.input_tokens` from the Anthropic API — those numbers are in `benchmarks/results/`.

---

## Install story

```bash
# In any Claude Code project:
npx pact-cc install

# Output:
# ✓ PACT installed in /your/project/.claude/settings.json
# ✓ Hook script written to /your/project/.pact/hook.js
#   Token compression activates at 80% context usage.
#   Run 'pact-cc status' to monitor.
```

The hook fires on `PreToolUse` — before every tool call. When context hits 80%, PACT compresses silently. The model keeps working. No interruption.

```bash
pact-cc status
# PACT status:
#   installed:           yes
#   threshold:           80%
#   sessions compressed: 47
#   avg ratio:           8.3x
#   tokens saved:        1,284,930
```

---

## Why it matters for Anthropic

Every Claude Code user hits the context wall eventually. PACT makes long agentic sessions economically viable — lower cost per task, higher completion rates on complex multi-hour work. It's deployable today, works with any model, and requires zero changes to the agent's behavior or the user's workflow.

---

## What's in the repo

```
pact-engine.js          Frozen PACT language interpreter (819 lines)
src/
  compress.ts           Compression core (JSON extraction + PACT encoding)
  rehydrate.ts          Rehydration (expand PACT subgraph → natural language)
  hook.ts               Claude Code PreToolUse hook handler
  install.ts            install/uninstall/status — file system ops
  cli.ts                pact-cc CLI (install/uninstall/compress/decompress/status)
  engine.test.ts        132 PACT engine tests
  hook.test.ts          8 hook integration tests
python/
  pact_cc/__init__.py   Python SDK (subprocess wrapper)
benchmarks/
  run.mjs               Benchmark runner
  tasks/                10 SWE-bench-style tasks
  results/              Benchmark output (JSON)
docs/
  index.html            Landing page
  architecture/         7 architecture spec docs
```

---

## Technical choices

**Why a custom scripting language?** JSON would work, but PACT's compact syntax (space-separated arrays, no commas, short keywords) produces smaller output for the same structural information. The PACT engine is also self-contained, no dependencies, works in any Node.js environment.

**Why JSON extraction → PACT encoding (not direct PACT generation)?** Early testing showed models consistently produce invalid PACT when asked to output it directly — wrong quote styles, comma-separated arrays, wrong keyword syntax. Having the model output JSON (which it's excellent at) and converting programmatically to PACT guarantees valid output every time. The compression ratio is the same.

**Why PreToolUse?** Claude Code doesn't expose a `context-approaching-limit` event directly. PreToolUse fires before every tool call, giving reliable checkpoints to measure and compress. The hook is designed to never block — any error falls through with `{ continue: true }`.

**Why Haiku for compression?** Fast and cheap. The compression call adds ~100ms latency before a tool call that's already taking seconds. Haiku is good enough for structure extraction. Reserve Opus/Sonnet for the actual agent work.

---

## Judges

Boris, Cat, Thariq, Lydia, Ado, Jason — you built Claude Code. You know the context wall firsthand. PACT is the thing I wanted to exist every time a long session hit the limit and I had to start over. It's a real tool, available today, with real benchmarks. Thank you for the platform to build it.
