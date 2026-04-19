# SDK-TYPESCRIPT — TypeScript SDK Design

> Entry: `src/index.ts` → compiled to `dist/index.js` + `dist/index.d.ts` via `tsup`.

---

## Public API

```typescript
// Named exports from 'pact-cc'
export { compress, decompress, install, uninstall, status }
export type { CompressResult, StatusResult }
```

---

## Function Signatures

### `compress`

```typescript
async function compress(
  context: string,
  opts?: { threshold?: number; model?: string }
): Promise<CompressResult | null>

type CompressResult = {
  pact: string                          // the PACT program string
  ratio: number                         // compression ratio (nlTokens / pactTokens)
  tokens: { before: number; after: number }
}
```

Returns `null` if compression fails (caller keeps original context).

**Implementation:**
1. Count `before` tokens: `tokenize(context).length` (from pact-engine.js)
2. Call Claude API (Haiku by default) with compression system prompt
3. Validate response: `runPACT(pactString).error === null`
4. Count `after` tokens: `tokenize(pactString).length`
5. Return `{ pact, ratio, tokens }`

---

### `decompress`

```typescript
async function decompress(pact: string): Promise<string>
```

Expands PACT back to natural language. If the PACT program is invalid, returns
the raw PACT string (safe fallback — the model can still reason over it).

---

### `install`

```typescript
async function install(projectDir?: string): Promise<void>
```

Same as `pact-cc install`. `projectDir` defaults to `process.cwd()`.
Idempotent — safe to call multiple times.

---

### `uninstall`

```typescript
async function uninstall(projectDir?: string): Promise<void>
```

Same as `pact-cc uninstall`. `projectDir` defaults to `process.cwd()`.

---

### `status`

```typescript
async function status(projectDir?: string): Promise<StatusResult>

type StatusResult = {
  installed: boolean
  threshold: number
  model: string
  sessionsCompressed: number
  avgRatio: number
  tokensSaved: number
}
```

Reads `.pact/state.json` from `projectDir`. Returns zero-values if not installed.

---

## Internal Modules

These are not exported from `index.ts`. They implement the SDK functions.

### `src/compress.ts`

```typescript
// Exports (internal only):
export function buildCompressionPrompt(context: string): string
export async function callCompressionModel(prompt: string, model: string): Promise<string>
export function validatePACT(code: string): boolean
export function countTokens(text: string): number  // wraps pact-engine tokenize
```

`buildCompressionPrompt` inserts the system prompt from HOOK-INTEGRATION.md.
`callCompressionModel` makes the Anthropic API call.
`validatePACT` runs `runPACT` and checks `error === null`.

**API client setup:**
```typescript
import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic()  // reads ANTHROPIC_API_KEY from env
```

### `src/rehydrate.ts`

```typescript
export async function rehydrate(pact: string, focusEntity?: string): Promise<string>
```

If `focusEntity` provided, expands only that entity. Otherwise expands full state.

### `src/hook.ts`

```typescript
export async function runHook(hookInput: HookInput): Promise<HookResponse>

type HookInput = {
  tool_name: string
  context_tokens: number
  max_tokens: number
  conversation_history: string
}

type HookResponse = {
  continue: true
  prompt_inject?: string
}
```

### `src/install.ts` (called by both `src/cli.ts` and `src/index.ts`)

```typescript
export async function installPACT(projectDir: string, opts: InstallOpts): Promise<void>
export async function uninstallPACT(projectDir: string): Promise<void>
export function readState(projectDir: string): PACTState
export function writeState(projectDir: string, state: PACTState): void
```

---

## Build Config (`tsup`)

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  target: 'node18',
  clean: true,
  banner: { js: '#!/usr/bin/env node' },  // cli only — tsup handles per-entry
})
```

**Output:**
```
dist/
├── index.js       ← ESM
├── index.cjs      ← CJS
├── index.d.ts     ← TypeScript types
├── cli.js         ← ESM (has shebang via tsup banner)
└── cli.cjs        ← CJS
```

---

## `package.json` exports field

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

---

## TypeScript Config (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "dist",
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

---

## Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.52.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tsup": "^8.0.0",
    "@types/node": "^22.0.0"
  }
}
```

No runtime deps beyond the Anthropic SDK. `pact-engine.js` is bundled directly.

---

## Usage Examples

```typescript
import { compress, decompress, install, status } from 'pact-cc'

// Install in current project
await install()

// Compress a context string
const result = await compress(longAgentContext)
if (result) {
  console.log(`${result.ratio}x compression`)
  console.log(`${result.tokens.before} → ${result.tokens.after} tokens`)
}

// Check status
const s = await status()
console.log(`Installed: ${s.installed}, avg ratio: ${s.avgRatio}x`)

// Decompress for inspection
const expanded = await decompress(result.pact)
```
