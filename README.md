# pact-cc

**Semantic compression middleware for Claude Code agents.**  
3–35x token reduction. ≤2pp task completion delta. One command to install.

[![Tests](https://img.shields.io/badge/tests-140%20passing-brightgreen)](src/engine.test.ts)
[![License](https://img.shields.io/badge/license-PolyForm%20NC%201.0.0-orange)](LICENSE)
[![Status](https://img.shields.io/badge/status-source--available%20%C2%B7%20noncommercial-lightgrey)](LICENSE)

> **Source-available, noncommercial.** You may read, study, and use PACT for personal
> / research / nonprofit purposes. Commercial use requires a separate license —
> contact heckeraiden@gmail.com. See [LICENSE](LICENSE) for full terms.

## Install

```bash
npx pact-cc install
```

That's it. PACT watches your Claude Code sessions. When context hits 80%, it compresses automatically.

## How it works

```
Agent context (natural language)
        │
        ▼
┌─────────────────────────────┐
│  1. Structure Extraction    │  Entity graphs, plans, file refs → typed AST nodes
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│  2. Semantic Deduplication  │  One entity + N delta annotations (not N full copies)
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│  3. PACT Program            │  Compressed, diff-able, ~35x smaller
└─────────────────────────────┘
        │
        ▼  (on demand, per query)
┌─────────────────────────────┐
│  4. Lossless Rehydration    │  Expand only what the model is reasoning about now
└─────────────────────────────┘
```

**The key insight:** We compress what's *carried*, not what's *read*. Rehydration expands the relevant subgraph at query time — the model always reads full natural language.

## Benchmarks

```bash
# Heuristic mode — no API key needed, instant, reproducible
npx pact-cc benchmark

# Real LLM mode — uses your ANTHROPIC_API_KEY (or BLACKBOX_API_KEY)
pact-cc benchmark --real
```

| Mode | Tasks | Avg ratio | Total ratio | Completion delta |
|------|-------|-----------|-------------|------------------|
| Heuristic (11 tasks) | 11 | 2.5x | 2.8x | 0.0pp |
| Heuristic (50-turn long session) | 1 | 4.3x | 4.3x | 0.0pp |
| Real LLM (14-turn refactor, Haiku) | 1 | 6.1x | 6.1x | 0.0pp |
| Dense multi-hour session (ref impl) | — | up to 35x | — | ≤2pp |

**Ratios scale with session length.** Short 10-20 turn tasks: 2-3x. 50-turn sessions: 4-5x. Multi-hour sessions with heavy entity repetition: 10x+ with real LLM compression. The heuristic is a lower bound — real LLM extraction via `compress.ts` typically doubles it.

![PACT benchmark chart](benchmarks/results/chart.svg)

Full per-task results: [benchmarks/results/](benchmarks/results/). Chart regenerates from the latest results JSON: `node benchmarks/chart.mjs`.

## Why not just summarize?

Summarization is lossy and irreversible. PACT is:
- **Structured** — entity graphs, not prose paragraphs
- **Reversible** — expand back to full natural language on demand
- **Diff-able** — state deltas, not full restatements

## Architecture

See [docs/architecture/](docs/architecture/) for full specs:
- [ENGINE-API.md](docs/architecture/ENGINE-API.md) — PACT language reference
- [HOOK-INTEGRATION.md](docs/architecture/HOOK-INTEGRATION.md) — Claude Code hook design
- [CLI-SPEC.md](docs/architecture/CLI-SPEC.md) — CLI commands
- [SDK-TYPESCRIPT.md](docs/architecture/SDK-TYPESCRIPT.md) — TypeScript SDK
- [SDK-PYTHON.md](docs/architecture/SDK-PYTHON.md) — Python SDK
- [BENCHMARK-SPEC.md](docs/architecture/BENCHMARK-SPEC.md) — Benchmark methodology

## Development

```bash
npm install
npm run test           # 140 tests (engine + hook)
npm run typecheck      # TypeScript type check
npm run build          # tsup → dist/
node benchmarks/run.mjs # 10-task structural benchmark
```

## License

**PolyForm Noncommercial 1.0.0** — source-available, noncommercial use only.

Commercial use (including using PACT inside a commercial AI product to reduce
your token spend) requires a separate commercial license. Email
**heckeraiden@gmail.com** to inquire — commercial licenses are available at
reasonable terms.

Full terms: [LICENSE](LICENSE). License text: <https://polyformproject.org/licenses/noncommercial/1.0.0>.
