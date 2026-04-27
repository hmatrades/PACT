# PACT

**Semantic compression that beats ZIP by 40% on codebases.**

[**pact.zip**](https://pact.zip) · [Demo video](./PACT_demo.mp4) · [Explainer](./pact-explainer.mp4)

https://github.com/hmatrades/PACT/raw/main/PACT_demo.mp4

---

```bash
npx pact-cc setup     # one command. right-click + Claude Code compaction. done.
```

## Quick start

```bash
pact pack myproject/          # 88 KB → 21 KB (4.2x)
pact inspect myproject.pact   # see functions, imports, types — no decompression
pact unpack myproject.pact    # restores myproject (1)/
```

## Install

```bash
npx pact-cc setup
```

One command. Detects your OS. Installs everything:

- **macOS** — Finder Quick Actions (right-click → Pack with PACT) + native Swift progress UI
- **Windows** — right-click context menu via registry
- **Linux** — Nautilus, Dolphin, Nemo, Thunar scripts
- **All platforms** — Claude Code auto-compaction at 50% context

## Why not ZIP?

ZIP compresses each file in isolation using 1993-era deflate. PACT:

- **Solid brotli archive** — all files compressed as one stream. Cross-file patterns compound the ratio.
- **Semantic inspection** — see functions, classes, imports without decompressing.
- **40% smaller** than ZIP on real codebases.

```
ZIP:   362 KB
PACT:  221 KB — 40% smaller (79 files, measured)
```

## Claude Code compaction

```bash
pact install --global     # auto-compresses every session at 50% context
```

| | PACT | /compact |
|---|---:|---:|
| Compression | **18.4x** | 4.0x |
| Retention | **92%** | 68% |
| Lossy? | **no** | yes |
| API calls | **0** | 0 |

12-task benchmark. Reproducible: `node benchmarks/compaction-benchmark.mjs`

## BARUTU SNAKE

Task 012: PACT compressed the session that built PACT. 179 turns, 1.6M → 46K tokens, **34.3x lossless.**

```bash
node benchmarks/run.mjs --tasks 012-barutu-snake
```

## CLI

```
pact setup                           install everything, one command
pact pack <file|dir> [-o out.pact]   compress
pact unpack <file.pact> [-o path]    decompress
pact inspect <file.pact>             view contents
pact install --global                Claude Code auto-compaction
pact compact [text]                  compress context (no API)
pact --version                       version
```

## Demo videos

| Video | Description |
|-------|-------------|
| [`PACT_demo.mp4`](./PACT_demo.mp4) | Full demo — `pact pack`, `pact inspect`, `pact unpack`, right-click integration, `/pact` slash command |
| [`pact-explainer.mp4`](./pact-explainer.mp4) | Animated explainer — what PACT does and why it beats ZIP |

## Development

```bash
npm install
npm run build          # tsup → dist/
npm test               # 150 tests (vitest)
npm run build:binary   # standalone macOS binary
```

## Architecture

```
Files on disk
  → collect + sort by extension (similar files adjacent)
  → extract semantic summary per text file (functions, imports, types)
  → concatenate raw bytes into single buffer
  → brotli quality 11 (solid stream — sees patterns across all files)
  → .pact container
       PACT magic + version + manifest (uncompressed) + payload
```

The manifest stores per-file metadata and semantic summaries uncompressed —
`pact inspect` reads the manifest without touching the brotli stream.

## License

**PolyForm Noncommercial 1.0.0** — source-available, noncommercial use only.
Commercial license: **heckeraiden@gmail.com**

---

**[pact.zip](http://pact.zip)** · Built with Claude Code · 150 tests passing
