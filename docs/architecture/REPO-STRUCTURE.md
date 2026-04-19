# REPO-STRUCTURE — Public Repository Layout

> This is the target layout for the public `pact-cc` repo submitted to the hackathon.
> Every file listed here must exist by Apr 26 submission deadline.

---

## Full Tree

```
pact-cc/
│
├── pact-engine.js              ← PACT language interpreter (frozen, do not modify)
│
├── src/
│   ├── index.ts                ← TypeScript SDK public API
│   ├── cli.ts                  ← CLI entry point (pact-cc commands)
│   ├── hook.ts                 ← Claude Code hook handler
│   ├── compress.ts             ← context → PACT compression pipeline
│   └── rehydrate.ts            ← PACT → natural language rehydration
│
├── python/
│   └── pact_cc/
│       ├── __init__.py         ← Python SDK (compress / decompress / install / uninstall)
│       └── py.typed            ← PEP 561 marker
│   └── pyproject.toml          ← Python package config (hatchling)
│
├── benchmarks/
│   ├── runner.ts               ← Benchmark orchestrator
│   ├── baseline.ts             ← Baseline runner (no PACT)
│   └── tasks/
│       ├── 001-repo-refactor.json
│       ├── 002-multi-file-debug.json
│       ├── ...                 ← 20+ task definitions
│       └── README.md           ← Task format spec + methodology
│
├── benchmarks/results/         ← .gitignored — generated during benchmark runs
│   ├── YYYY-MM-DD.json
│   └── YYYY-MM-DD.png
│
├── .pact/                      ← .gitignored — created by `pact-cc install` per-project
│   ├── hook.js                 ← Hook script (auto-generated)
│   └── state.json              ← Session compression state (auto-generated)
│
├── .claude/
│   └── settings.json           ← Example hook registration (committed)
│
├── docs/
│   └── architecture/
│       ├── ENGINE-API.md       ← pact-engine.js API reference
│       ├── REPO-STRUCTURE.md   ← This file
│       ├── HOOK-INTEGRATION.md ← Claude Code hook spec
│       ├── CLI-SPEC.md         ← pact-cc CLI commands
│       ├── SDK-TYPESCRIPT.md   ← TypeScript SDK design
│       ├── SDK-PYTHON.md       ← Python SDK design
│       └── BENCHMARK-SPEC.md  ← Benchmark runner design
│
├── README.md                   ← Public-facing entry point
├── APPLICATION.md              ← Hackathon application copy (public-safe)
├── JUDGE_QA.md                 ← Pre-read for judges / technical FAQ
├── package.json                ← npm package: name=pact-cc
├── tsconfig.json               ← TypeScript config
├── LICENSE                     ← PolyForm Noncommercial 1.0.0
└── .gitignore
```

---

## Entry Points by Audience

### First-time user (install in 60 seconds)
1. `README.md` — one-liner, install command, what changes immediately
2. `npx pact-cc install` — writes hook, done
3. `pact-cc status` — confirm it's working

### Engineer (wants to understand the code)
1. `pact-engine.js` — the language interpreter, start here
2. `docs/architecture/ENGINE-API.md` — how to use the engine
3. `src/compress.ts` → `src/hook.ts` → `src/index.ts`
4. `docs/architecture/HOOK-INTEGRATION.md` — hook design decisions

### Benchmark skeptic (wants to verify the 35x claim)
1. `benchmarks/tasks/README.md` — methodology (what "35x" means, how measured)
2. `benchmarks/runner.ts` — the actual measurement code
3. `benchmarks/results/` — pre-run results (committed as JSON + PNG)
4. Run it yourself: `npx pact-cc benchmark`

### Judge (Boris/Cat — will test it live)
1. `README.md` — install + run
2. `pact-engine.js` — read the engine in 3 minutes
3. `docs/architecture/HOOK-INTEGRATION.md` — understand the hook mechanism
4. `benchmarks/tasks/README.md` — methodology

### Judge (Lydia/Ado — DX focused)
1. `README.md` — install experience is the demo
2. `npx pact-cc install` → `pact-cc status` — live DX test
3. TypeScript types in `src/index.ts`

### Judge (Thariq/Jason — infrastructure)
1. `docs/architecture/` — full architecture docs
2. `benchmarks/` — cluster methodology
3. `APPLICATION.md` — technical Q&A answers

---

## What is NOT in this repo

| Excluded | Why |
|----------|-----|
| `MASTER_PLAN.md` | Internal — contains budget, risk register, private strategy |
| `AGENT_PROMPT.md` | Internal — subagent prompt, not for public consumption |
| `.pact/state.json` | Per-session generated file, gitignored |
| `benchmarks/results/*.json` | Pre-run results committed, live runs gitignored |
| Any `~/Developer/` paths | This repo is self-contained, no cross-project refs |

---

## File Responsibilities (one sentence each)

| File | Owns |
|------|------|
| `pact-engine.js` | PACT language: tokenize, parse, evaluate |
| `src/compress.ts` | Convert natural-language context to PACT (calls Claude API) |
| `src/rehydrate.ts` | Convert PACT back to natural language (calls Claude API) |
| `src/hook.ts` | Hook entry point: check threshold, call compress, respond |
| `src/cli.ts` | CLI: parse args, route to install/compress/status/benchmark |
| `src/index.ts` | TypeScript SDK: typed wrappers over compress/rehydrate/install |
| `benchmarks/runner.ts` | Orchestrate N tasks × baseline/pact, collect metrics, write results |

---

## Build Outputs

| Source | Output | Tool |
|--------|--------|------|
| `src/*.ts` | `dist/*.js` + `dist/*.d.ts` | `tsup` |
| `dist/cli.js` | `pact-cc` binary (via package.json `bin`) | npm |
| `python/pact_cc/` | `pact-cc` PyPI package | `hatchling` |

---

## Day-by-Day Creation Order

| Day | Files created |
|-----|--------------|
| Apr 19–20 (now) | `docs/architecture/*.md`, `package.json`, `tsconfig.json`, `.gitignore` |
| Apr 21 (Day 1) | `src/compress.ts`, `src/rehydrate.ts`, `src/hook.ts`, `src/cli.ts` (install cmd) |
| Apr 22 (Day 2) | `src/index.ts` SDK, `src/cli.ts` full, `.claude/settings.json` example |
| Apr 23 (Day 3) | `benchmarks/runner.ts`, `benchmarks/tasks/*.json` (20+), results |
| Apr 24 (Day 4) | `python/pact_cc/`, `README.md` final polish |
| Apr 25 (Day 5) | Final assembly, open-source, tag v1.0.0 |
