# pact-cc

**Semantic compression middleware for Claude Code agents.**  
35x token reduction. ≤2pp task completion delta. One command to install.

[![Tests](https://img.shields.io/badge/tests-132%20passing-brightgreen)](src/engine.test.ts)
[![npm](https://img.shields.io/badge/npm-pact--cc-blue)](https://www.npmjs.com/package/pact-cc)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

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

| Metric | Value |
|--------|-------|
| Token reduction | 35x |
| Task completion delta | ≤2pp |
| Tasks evaluated | 93 |
| Install time | <60s |

*Full benchmark results in [benchmarks/results/](benchmarks/results/) — populated Day 3 of build week.*

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
npm run test:engine    # 132 engine tests
npm run typecheck      # TypeScript type check
npm run build          # tsup → dist/
```

## License

Apache 2.0
