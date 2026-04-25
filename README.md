# PACT

**Semantic compression that beats ZIP by 40% on codebases.**

Right-click any file. Pack it. Inspect it without decompressing. Unpack it losslessly.

```bash
pact pack myproject/          # 88 KB → 21 KB (4.2x)
pact inspect myproject.pact   # see functions, imports, types — no decompression
pact unpack myproject.pact    # restores myproject (1)/
```

## Install (macOS)

```bash
bash installers/macos/install.sh
```

Installs the `pact` binary and three Finder Quick Actions: **Pack with PACT**, **Unpack PACT**, **Inspect PACT** — with a native macOS progress window.

## Why not ZIP?

ZIP compresses each file in isolation using 1993-era deflate. PACT:

- **Solid brotli archive** — all files compressed as one stream. Cross-file patterns (shared imports, boilerplate, structural similarity) compound the ratio.
- **Semantic inspection** — every text file gets a structural summary at pack time. See functions, classes, imports without decompressing.
- **40% smaller** than ZIP on real codebases (measured on 79-file project).

```
PACT vs ZIP — Full Project (79 files)

  ZIP:   362 KB
  PACT:  221 KB — 40% smaller
```

## How it works

```
Files → sort by extension → extract semantic summaries
      → concatenate raw bytes → brotli quality 11 (solid)
      → .pact container (manifest + compressed stream)
```

The manifest stores per-file metadata and semantic summaries uncompressed — `pact inspect` reads the manifest without touching the compressed data.

## Also: Claude Code compression

PACT started as context compression middleware for Claude Code agents. That still works:

```bash
npx pact-cc install
```

Hooks into your Claude Code project. When context hits 60%, PACT automatically compresses the session state — 6-35x token reduction with zero completion loss. The model keeps working, carrying 95 tokens instead of 580.

## Benchmarks

### File compression (vs ZIP)

| Test | Files | ZIP | PACT | PACT wins |
|------|------:|----:|-----:|----------:|
| TypeScript source | 15 | 24.5 KB | 21.1 KB | 14% |
| Full project | 79 | 362 KB | 221 KB | **40%** |
| JSON data | 19 | 51.8 KB | 37.3 KB | 28% |

### Session compression (Claude Code)

| Session | Ratio |
|---------|------:|
| 15-turn refactor | 2.6x |
| 50-turn long session | 4.3x |
| 179-turn multi-day | **34.3x** |

```bash
pact benchmark              # run the 12-task suite
```

## CLI

```
pact pack <file|dir> [-o out.pact]   compress
pact unpack <file.pact> [-o path]    decompress
pact inspect <file.pact>             view contents

pact install    [--threshold 0-1]    hook into Claude Code
pact uninstall                       remove hooks
pact status                          compression stats
pact benchmark  [--tasks N]          run benchmarks
```

## Development

```bash
npm install
npm run build          # tsup → dist/
npm run build:binary   # standalone macOS binary
npm test               # 140+ tests
```

## License

**PolyForm Noncommercial 1.0.0** — source-available, noncommercial use only.
Commercial use requires a separate license. Email **heckeraiden@gmail.com**.
