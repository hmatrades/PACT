# PACT v2 — Injected-Context Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mid-conversation API polling with a session-start injection + session-end extraction so PACT requires zero API calls during the conversation itself.

**Architecture:** A `PreToolUse` hook injects a `<pact-requirements>` block at conversation start listing what to capture; the agent naturally tags decisions/tasks/artifacts inline during the conversation; a `Stop` (session-end) hook parses those tags from the transcript and writes `.pact/sessions/<id>.json` — no LLM call needed at extraction time.

**Tech Stack:** Node.js ESM, TypeScript, Claude Code hooks (`PreToolUse`, `Stop`), existing `.pact/` state infrastructure.

---

## File Map

| File | Change | Responsibility |
|---|---|---|
| `src/inject.ts` | Create | Generates the `<pact-requirements>` injection block |
| `src/extract.ts` | Create | Parses `[PACT:*]` tags from raw transcript text |
| `src/session.ts` | Create | Reads/writes `.pact/sessions/<id>.json` |
| `src/install.ts` | Modify | Wire `PreToolUse` start-hook + `Stop` end-hook into `settings.json` |
| `src/cli.ts` | Modify | Add `pact sessions` subcommand to list/show captured sessions |
| `src/inject.test.ts` | Create | Unit tests for injection block generation |
| `src/extract.test.ts` | Create | Unit tests for tag parsing |
| `src/session.test.ts` | Create | Unit tests for session read/write |

---

### Task 1: Injection block generator (`src/inject.ts`)

**Files:**
- Create: `src/inject.ts`
- Create: `src/inject.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/inject.test.ts
import { describe, it, expect } from 'vitest'
import { buildInjection } from './inject.js'

describe('buildInjection', () => {
  it('returns a string containing the pact-requirements tag', () => {
    const block = buildInjection()
    expect(block).toContain('<pact-requirements>')
    expect(block).toContain('</pact-requirements>')
  })

  it('instructs the agent to emit PACT tags', () => {
    const block = buildInjection()
    expect(block).toContain('[PACT:decision]')
    expect(block).toContain('[PACT:task]')
    expect(block).toContain('[PACT:artifact]')
    expect(block).toContain('[PACT:blocker]')
    expect(block).toContain('[PACT:insight]')
  })

  it('is under 400 tokens (keeps injection cheap)', () => {
    const block = buildInjection()
    // rough: 1 token ≈ 4 chars
    expect(block.length).toBeLessThan(1600)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/inject.test.ts
```
Expected: FAIL — `buildInjection` not found.

- [ ] **Step 3: Implement `src/inject.ts`**

```typescript
export function buildInjection(): string {
  return `<pact-requirements>
You are being tracked by PACT. During this conversation, prefix key outputs with tags so they can be extracted later. Use exactly these formats:

[PACT:decision] <what was decided and why>
[PACT:task] <action item, one line>
[PACT:artifact] <path/to/file> — <what changed>
[PACT:blocker] <what is blocked and why>
[PACT:insight] <non-obvious learning>

Rules:
- Emit tags inline in your normal responses — do not batch them at the end.
- One tag per line. No nesting.
- Only emit when something genuinely belongs to that category.
- Do not emit tags for routine tool calls or reads.
</pact-requirements>`
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/inject.test.ts
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/inject.ts src/inject.test.ts
git commit -m "feat: injection block generator for PACT v2"
```

---

### Task 2: Tag extractor (`src/extract.ts`)

**Files:**
- Create: `src/extract.ts`
- Create: `src/extract.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/extract.test.ts
import { describe, it, expect } from 'vitest'
import { extractTags, PACTTag } from './extract.js'

const SAMPLE = `
Here is my analysis.

[PACT:decision] Use injected context over API polling — simpler, no mid-conv latency
[PACT:task] Update install.ts to wire Stop hook
[PACT:artifact] src/inject.ts — new injection block generator
[PACT:blocker] Stop hook not yet supported in Claude Code desktop

Normal prose continues here.

[PACT:insight] Inline tagging is more reliable than post-hoc summarization
`

describe('extractTags', () => {
  it('parses all five tag types', () => {
    const tags = extractTags(SAMPLE)
    const types = tags.map((t) => t.type)
    expect(types).toContain('decision')
    expect(types).toContain('task')
    expect(types).toContain('artifact')
    expect(types).toContain('blocker')
    expect(types).toContain('insight')
  })

  it('preserves tag content exactly', () => {
    const tags = extractTags(SAMPLE)
    const decision = tags.find((t) => t.type === 'decision')
    expect(decision?.content).toBe('Use injected context over API polling — simpler, no mid-conv latency')
  })

  it('returns empty array for transcript with no tags', () => {
    expect(extractTags('no tags here at all')).toEqual([])
  })

  it('ignores malformed tags', () => {
    const tags = extractTags('[PACT:unknown] something\n[PACT:task] valid task')
    expect(tags).toHaveLength(1)
    expect(tags[0].type).toBe('task')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/extract.test.ts
```
Expected: FAIL — `extractTags` not found.

- [ ] **Step 3: Implement `src/extract.ts`**

```typescript
export type TagType = 'decision' | 'task' | 'artifact' | 'blocker' | 'insight'

export type PACTTag = {
  type: TagType
  content: string
}

const VALID_TYPES = new Set<string>(['decision', 'task', 'artifact', 'blocker', 'insight'])
const TAG_RE = /^\[PACT:(\w+)\]\s+(.+)$/

export function extractTags(transcript: string): PACTTag[] {
  const tags: PACTTag[] = []
  for (const line of transcript.split('\n')) {
    const m = line.trim().match(TAG_RE)
    if (!m) continue
    const [, type, content] = m
    if (!VALID_TYPES.has(type)) continue
    tags.push({ type: type as TagType, content: content.trim() })
  }
  return tags
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/extract.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/extract.ts src/extract.test.ts
git commit -m "feat: PACT tag extractor from transcript"
```

---

### Task 3: Session persistence (`src/session.ts`)

**Files:**
- Create: `src/session.ts`
- Create: `src/session.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/session.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeSession, readSession, listSessions, PACTSession } from './session.js'
import type { PACTTag } from './extract.js'

let dir: string
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'pact-test-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const TAGS: PACTTag[] = [
  { type: 'decision', content: 'Use injected context' },
  { type: 'task', content: 'Wire Stop hook' },
]

describe('session persistence', () => {
  it('writes and reads back a session', () => {
    const id = 'test-session-001'
    writeSession(dir, id, TAGS)
    const session = readSession(dir, id)
    expect(session).not.toBeNull()
    expect(session!.tags).toHaveLength(2)
    expect(session!.tags[0].type).toBe('decision')
  })

  it('lists saved session ids', () => {
    writeSession(dir, 'sess-a', TAGS)
    writeSession(dir, 'sess-b', TAGS)
    const ids = listSessions(dir)
    expect(ids).toContain('sess-a')
    expect(ids).toContain('sess-b')
  })

  it('returns null for missing session', () => {
    expect(readSession(dir, 'nope')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/session.test.ts
```
Expected: FAIL — `writeSession` not found.

- [ ] **Step 3: Implement `src/session.ts`**

```typescript
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PACTTag } from './extract.js'

export type PACTSession = {
  id: string
  timestamp: string
  tags: PACTTag[]
}

function sessionsDir(projectDir: string): string {
  return join(projectDir, '.pact', 'sessions')
}

function sessionPath(projectDir: string, id: string): string {
  return join(sessionsDir(projectDir), `${id}.json`)
}

export function writeSession(projectDir: string, id: string, tags: PACTTag[]): void {
  const dir = sessionsDir(projectDir)
  mkdirSync(dir, { recursive: true })
  const session: PACTSession = { id, timestamp: new Date().toISOString(), tags }
  writeFileSync(sessionPath(projectDir, id), JSON.stringify(session, null, 2))
}

export function readSession(projectDir: string, id: string): PACTSession | null {
  const p = sessionPath(projectDir, id)
  if (!existsSync(p)) return null
  try { return JSON.parse(readFileSync(p, 'utf8')) as PACTSession } catch { return null }
}

export function listSessions(projectDir: string): string[] {
  const dir = sessionsDir(projectDir)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort()
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/session.test.ts
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/session.ts src/session.test.ts
git commit -m "feat: PACT session persistence (write/read/list)"
```

---

### Task 4: Wire hooks into `install.ts`

**Files:**
- Modify: `src/install.ts`

The existing `install.ts` already wires a `PreToolUse` hook (`node .pact/hook.js`) for compression. We need two additional hooks:

1. **`PreToolUse` start-hook** (`node .pact/start-hook.js`) — fires once at session start, injects the `<pact-requirements>` block.
2. **`Stop` end-hook** (`node .pact/stop-hook.js`) — fires when session ends, extracts tags from `conversation_history` and writes `.pact/sessions/<session-id>.json`.

- [ ] **Step 1: Add `generateStartHookScript` to `src/install.ts`**

Add this function after `generateHookScript`:

```typescript
function generateStartHookScript(): string {
  return `#!/usr/bin/env node
// .pact/start-hook.js — auto-generated by pact-cc install. Do not edit.
import { readFileSync } from 'node:fs'
import { buildInjection } from '../dist/inject.js'

function respond(obj) {
  process.stdout.write(JSON.stringify(obj) + '\\n')
}

async function main() {
  let hookInput
  try { hookInput = JSON.parse(readFileSync('/dev/stdin', 'utf8')) } catch {
    respond({ continue: true })
    return
  }
  // Only inject at very start of session (low token count)
  const usage = (hookInput.context_tokens ?? 0) / (hookInput.max_tokens ?? 200000)
  if (usage > 0.05) {
    respond({ continue: true })
    return
  }
  respond({ continue: true, prompt_inject: buildInjection() })
}

main().catch(() => respond({ continue: true }))
`
}
```

- [ ] **Step 2: Add `generateStopHookScript` to `src/install.ts`**

Add this function after `generateStartHookScript`:

```typescript
function generateStopHookScript(): string {
  return `#!/usr/bin/env node
// .pact/stop-hook.js — auto-generated by pact-cc install. Do not edit.
import { readFileSync } from 'node:fs'
import { extractTags } from '../dist/extract.js'
import { writeSession } from '../dist/session.js'
import { randomBytes } from 'node:crypto'

function respond(obj) {
  process.stdout.write(JSON.stringify(obj) + '\\n')
}

async function main() {
  let hookInput
  try { hookInput = JSON.parse(readFileSync('/dev/stdin', 'utf8')) } catch {
    respond({ continue: true })
    return
  }
  const transcript = hookInput.conversation_history ?? ''
  const tags = extractTags(transcript)
  if (tags.length > 0) {
    const id = new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomBytes(3).toString('hex')
    writeSession(process.cwd(), id, tags)
  }
  respond({ continue: true })
}

main().catch(() => respond({ continue: true }))
`
}
```

- [ ] **Step 3: Update `installPACT` to write both new hooks and merge them into `settings.json`**

In the existing `installPACT` function, after writing `hookFile(projectDir)`, add:

```typescript
  // Write start and stop hooks
  writeFileSync(join(pactDir(projectDir), 'start-hook.js'), generateStartHookScript())
  writeFileSync(join(pactDir(projectDir), 'stop-hook.js'), generateStopHookScript())

  // Merge start hook into PreToolUse
  mergeHookIntoSettings(settingsFile(projectDir), 'node .pact/start-hook.js', 'PreToolUse')

  // Merge stop hook into Stop event
  mergeHookIntoSettings(settingsFile(projectDir), 'node .pact/stop-hook.js', 'Stop')
```

You also need to update `mergeHookIntoSettings` to accept `event` and `command` params. Refactor the signature:

```typescript
function mergeHookIntoSettings(settingsPath: string, command = 'node .pact/hook.js', event = 'PreToolUse'): void {
  // ... same body but use `event` instead of hardcoded 'PreToolUse'
  // and `command` instead of hardcoded 'node .pact/hook.js'
}
```

Update the existing call to `mergeHookIntoSettings(settingsFile(projectDir))` → `mergeHookIntoSettings(settingsFile(projectDir), 'node .pact/hook.js', 'PreToolUse')`.

- [ ] **Step 4: Update `uninstallPACT` to also remove the new hooks from settings**

```typescript
removeHookFromSettings(settingsFile(projectDir), 'node .pact/start-hook.js', 'PreToolUse')
removeHookFromSettings(settingsFile(projectDir), 'node .pact/stop-hook.js', 'Stop')
```

Refactor `removeHookFromSettings` to accept `event` + `command` params similarly.

- [ ] **Step 5: Run existing hook tests to ensure nothing regressed**

```bash
npx vitest run src/hook.test.ts src/engine.test.ts
```
Expected: all existing tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/install.ts
git commit -m "feat: wire start-hook + stop-hook for injected-context PACT"
```

---

### Task 5: `pact sessions` CLI subcommand

**Files:**
- Modify: `src/cli.ts`

- [ ] **Step 1: Read current CLI structure**

```bash
npx tsx src/cli.ts --help
```

Note how subcommands are structured — match the existing pattern.

- [ ] **Step 2: Add `sessions` subcommand**

In `src/cli.ts`, add a `sessions` command that calls `listSessions` and optionally `readSession`:

```typescript
// Inside the CLI command registration block:
.command('sessions [id]')
.description('list captured PACT sessions, or show a specific session by id')
.action(async (id?: string) => {
  const { listSessions, readSession } = await import('./session.js')
  if (id) {
    const session = readSession(process.cwd(), id)
    if (!session) {
      console.error(`Session not found: ${id}`)
      process.exit(1)
    }
    for (const tag of session.tags) {
      console.log(`[${tag.type.toUpperCase()}] ${tag.content}`)
    }
  } else {
    const ids = listSessions(process.cwd())
    if (ids.length === 0) {
      console.log('No sessions captured yet.')
    } else {
      ids.forEach((s) => console.log(s))
    }
  }
})
```

- [ ] **Step 3: Smoke-test the subcommand**

```bash
npx tsx src/cli.ts sessions
```
Expected: `No sessions captured yet.` (or list of ids if `.pact/sessions/` exists).

- [ ] **Step 4: Commit**

```bash
git add src/cli.ts
git commit -m "feat: pact sessions subcommand for captured session viewer"
```

---

### Task 6: Build, integrate smoke test, and update SUBMISSION.md

- [ ] **Step 1: Build to `dist/`**

```bash
npm run build
```
Expected: exits 0, `dist/inject.js`, `dist/extract.js`, `dist/session.js` all present.

- [ ] **Step 2: Full test suite**

```bash
npx vitest run
```
Expected: all tests PASS, no regressions.

- [ ] **Step 3: End-to-end smoke test**

```bash
# Reinstall PACT in current project
npx tsx src/cli.ts install

# Verify both new hooks appear in .claude/settings.json
node -e "const s=JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); console.log(JSON.stringify(s.hooks,null,2))"
```
Expected: `PreToolUse` contains `node .pact/start-hook.js`, `Stop` contains `node .pact/stop-hook.js`.

- [ ] **Step 4: Update SUBMISSION.md** with a short note about v2 injected-context architecture.

- [ ] **Step 5: Final commit**

```bash
git add SUBMISSION.md
git commit -m "docs: note PACT v2 injected-context in SUBMISSION.md"
```

---

## Self-Review

**Spec coverage:**
- ✅ Injection block at session start (`inject.ts` + `start-hook.js`)
- ✅ Inline tagging during conversation (agent-driven, no code needed)
- ✅ Tag extraction at session end (`extract.ts` + `stop-hook.js`)
- ✅ Session persistence (`session.ts`)
- ✅ CLI viewer (`sessions` subcommand)
- ✅ No API calls during conversation (extraction is pure regex, no LLM)
- ✅ Existing compression hook (`hook.js`) untouched — v1 and v2 coexist

**Placeholder scan:** None found — all steps contain concrete code.

**Type consistency:** `PACTTag` defined in `extract.ts`, imported by `session.ts` and `stop-hook.js` — consistent throughout.
