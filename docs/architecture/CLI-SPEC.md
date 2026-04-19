# CLI-SPEC — pact-cc Command Line Interface

> Entry point: `src/cli.ts` → compiled to `dist/cli.js` → registered as `pact-cc` binary.

---

## Install & Invocation

```bash
# One-time install
npm install -g pact-cc

# Or zero-install
npx pact-cc <command>
```

`package.json` bin field:
```json
{
  "bin": {
    "pact-cc": "./dist/cli.js"
  }
}
```

`dist/cli.js` must have shebang: `#!/usr/bin/env node`

---

## Commands

### `pact-cc install`

Registers the PACT hook in the current project's Claude Code settings.

```
pact-cc install [--threshold <0-1>] [--model <model-id>]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--threshold` | `0.80` | Compress when context reaches this fraction of max |
| `--model` | `claude-haiku-4-5-20251001` | Model used for compression calls |

**Output on success:**
```
✓ PACT installed in /path/to/project/.claude/settings.json
✓ Hook script written to /path/to/project/.pact/hook.js
  Token compression activates at 80% context usage.
  Run 'pact-cc status' to monitor.
```

**Output if already installed:**
```
✓ PACT already installed. Nothing changed.
  Use 'pact-cc uninstall' first to reinstall with new options.
```

---

### `pact-cc uninstall`

Removes PACT hook and cleans up generated files.

```
pact-cc uninstall
```

**Output:**
```
✓ Hook removed from .claude/settings.json
✓ .pact/ directory deleted
  PACT uninstalled.
```

---

### `pact-cc compress`

Compresses text input to PACT syntax. Reads from stdin or argument.

```
pact-cc compress [text]
pact-cc compress < context.txt
echo "..." | pact-cc compress
```

**Output (stdout only, pipe-safe):**
```
session = { goal: 'refactor auth', files: {...} }
. sjson(session)
```

**With `--stats` flag:**
```
# tokens before: 3420
# tokens after: 98
# ratio: 34.9x
<pact code below>
session = { ... }
```

**Error (stderr, non-zero exit):**
```
Error: Compression failed — Claude API returned 429
```

Exit codes: `0` success, `1` user error (bad args), `2` compression error.

---

### `pact-cc decompress`

Rehydrates PACT syntax back to natural language.

```
pact-cc decompress [pact-code]
pact-cc decompress < state.pact
cat .pact/state.json | pact-cc decompress
```

**Output (stdout only):**
Natural language expansion of the PACT program.

---

### `pact-cc status`

Shows compression stats for the current session.

```
pact-cc status
```

**Output:**
```
PACT Status
───────────
Installed:           yes
Hook active:         yes
Threshold:           80%
Compression model:   claude-haiku-4-5-20251001

Session Stats
─────────────
Sessions compressed: 3
Avg compression:     34.2x
Last compressed at:  145,000 tokens
Tokens saved today:  ~2.1M
```

If not installed:
```
PACT not installed in this project.
Run 'pact-cc install' to get started.
```

---

### `pact-cc benchmark`

Runs the benchmark suite and outputs results.

```
pact-cc benchmark [--tasks <n>] [--output <path>]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--tasks` | all | Number of tasks to run (subset for quick tests) |
| `--output` | `benchmarks/results/` | Directory for results JSON + PNG |

**Output during run:**
```
Running PACT benchmark (20 tasks × baseline + PACT)...

[1/20] repo-refactor-auth      baseline: 45,230 tokens  pact: 1,290 tokens  ratio: 35.1x  ✓
[2/20] multi-file-debug        baseline: 38,100 tokens  pact: 1,102 tokens  ratio: 34.6x  ✓
...
[20/20] test-generation        baseline: 22,400 tokens  pact: 660 tokens    ratio: 33.9x  ✓

Results
───────
Avg token reduction:  34.8x
Task completion rate: baseline 94.1% | pact 92.3% | delta -1.8pp
Full results:         benchmarks/results/2026-04-23.json
Chart:                benchmarks/results/2026-04-23.png
```

---

## Implementation Notes (`src/cli.ts`)

**Arg parsing:** Raw `process.argv` — no external dependencies. Pattern:

```typescript
const [,, command, ...args] = process.argv
const flags = parseFlags(args)  // { '--threshold': '0.80', '--model': '...' }

switch (command) {
  case 'install': await cmdInstall(flags); break
  case 'uninstall': await cmdUninstall(); break
  case 'compress': await cmdCompress(flags, args); break
  case 'decompress': await cmdDecompress(args); break
  case 'status': await cmdStatus(); break
  case 'benchmark': await cmdBenchmark(flags); break
  default:
    console.error(`Unknown command: ${command}`)
    printHelp()
    process.exit(1)
}
```

**Stdin reading** (for `compress` and `decompress` when no arg provided):
```typescript
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}
```

**Output discipline:**
- All user-facing output: `process.stdout.write()` or `console.log()`
- All errors: `console.error()` (stderr)
- `compress` and `decompress` in pipe mode: **only** the PACT/text on stdout, nothing else

---

## Help Output

```
pact-cc — Semantic compression middleware for Claude Code

Commands:
  install     Register PACT hook in this project (60-second setup)
  uninstall   Remove PACT hook
  compress    Compress text to PACT syntax
  decompress  Expand PACT back to natural language
  status      Show compression stats for this session
  benchmark   Run the full benchmark suite

Options:
  install --threshold <0-1>   Compression threshold (default: 0.80)
  install --model <id>        Claude model for compression (default: haiku)
  compress --stats            Show token counts alongside output
  benchmark --tasks <n>       Run only the first N tasks
  benchmark --output <path>   Output directory for results

Examples:
  npx pact-cc install
  echo "refactor the auth module" | npx pact-cc compress
  npx pact-cc status
  npx pact-cc benchmark --tasks 5
```
