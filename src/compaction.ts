import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'

const FILE_RE = /\b(?:[\w.-]*\/)*[\w.-]+\.(?:ts|tsx|js|mjs|cjs|py|rs|go|rb|java|cs|php|swift|kt|html|css|scss|json|yaml|yml|sql|md|sh)\b/g
const ENTITY_RE = /\b(?:function|class|def|export\s+function|const|let)\s+([a-zA-Z_$][\w$]*)/g
const PLAN_STEP_RE = /\b(?:step|phase|plan|todo|next|then)[\s:-]+([^.\n]{3,60})/gi
const CONSTRAINT_RE = /\b(?:must|should|needs? to|requires?|has to|cannot|can't)\s+([^.\n]{5,80})/gi

function kebab(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

function inferFileStatus(fileName: string, text: string): string {
  const idx = text.indexOf(fileName)
  if (idx < 0) return 'read'
  const window = text.slice(Math.max(0, idx - 100), Math.min(text.length, idx + 100))
  if (/\b(creat|wrote|added|scaffold|new)/i.test(window)) return 'new'
  if (/\b(updat|modif|change|refactor|fix)/i.test(window)) {
    if (/\b(pass|done|complete|ship|merge|commit)/i.test(window)) return 'done'
    return 'wip'
  }
  if (/\b(done|complete|shipped|merged)/i.test(window)) return 'done'
  if (/\b(todo|need|will|going to)/i.test(window)) return 'todo'
  return 'read'
}

export function heuristicCompress(context: string): { pact: string; ratio: number; tokens: { before: number; after: number } } {
  const MAX_FILES = 8
  const MAX_ENTITIES = 6
  const MAX_PLAN = 5
  const MAX_CONSTRAINTS = 4

  const goalSentence = context.split(/[.!?\n]/)[0]
  const goal = kebab(goalSentence).split('-').slice(0, 4).join('-')

  const fileSeen = new Map<string, number>()
  for (const m of context.matchAll(FILE_RE)) {
    fileSeen.set(m[0], m.index!)
  }
  const fileEntries = [...fileSeen.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_FILES)
  const files: Record<string, string> = {}
  for (const [f] of fileEntries) {
    files[f] = inferFileStatus(f, context)
  }

  const entities: Record<string, string> = {}
  const seenEnts = new Set<string>()
  for (const m of context.matchAll(ENTITY_RE)) {
    const name = m[1]
    if (seenEnts.has(name)) continue
    seenEnts.add(name)
    entities[name] = 'def'
    if (seenEnts.size >= MAX_ENTITIES) break
  }

  const planDoneSet = new Set<string>()
  const planNextSet = new Set<string>()
  for (const m of context.matchAll(PLAN_STEP_RE)) {
    const phrase = kebab(m[1])
    if (!phrase || phrase.length < 3) continue
    const prefix = m[0].toLowerCase()
    const isNext = /todo|next|remaining|will|going to/.test(prefix)
    if (isNext && planNextSet.size < MAX_PLAN) planNextSet.add(phrase)
    else if (!isNext && planDoneSet.size < MAX_PLAN) planDoneSet.add(phrase)
  }

  const constraints: string[] = []
  const seenC = new Set<string>()
  for (const m of context.matchAll(CONSTRAINT_RE)) {
    const c = kebab(m[1]).split('-').slice(0, 4).join('-')
    if (!c || seenC.has(c)) continue
    seenC.add(c)
    constraints.push(c)
    if (constraints.length >= MAX_CONSTRAINTS) break
  }

  const q = (s: unknown) => `'${String(s).replace(/'/g, "\\'")}'`
  const arr = (a: string[]) => `[${a.map(q).join(' ')}]`
  const obj = (o: Record<string, unknown>) =>
    `{ ${Object.entries(o).map(([k, v]) => `${q(k)}: ${q(v)}`).join(' ')} }`

  const pact = [
    `session = {`,
    ` goal: ${q(goal)}`,
    ` files: ${obj(files)}`,
    ` plan_done: ${arr([...planDoneSet])}`,
    ` plan_next: ${arr([...planNextSet])}`,
    ` constraints: ${arr(constraints)}`,
    ` entities: ${obj(entities)}`,
    `}`,
    `. sjson(session)`,
  ].join('\n')

  const before = Math.ceil(context.length / 4)
  const after = Math.ceil(pact.length / 4)
  return { pact, ratio: after > 0 ? before / after : 0, tokens: { before, after } }
}

const COMPACTION_HOOK_SCRIPT = `#!/usr/bin/env node
// PACT compaction hook — heuristic mode, zero API calls.
// Installed globally. Fires on every tool call. Compresses when context > threshold.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'

const THRESHOLD = 0.50
const STATE_FILE = '.pact/compaction-state.json'

const FILE_RE = /\\b(?:[\\w.-]*\\/)*[\\w.-]+\\.(?:ts|tsx|js|mjs|cjs|py|rs|go|rb|java|cs|php|swift|kt|html|css|scss|json|yaml|yml|sql|md|sh)\\b/g
const ENTITY_RE = /\\b(?:function|class|def|export\\s+function|const|let)\\s+([a-zA-Z_$][\\w$]*)/g
const PLAN_STEP_RE = /\\b(?:step|phase|plan|todo|next|then)[\\s:-]+([^.\\n]{3,60})/gi
const CONSTRAINT_RE = /\\b(?:must|should|needs? to|requires?|has to|cannot|can't)\\s+([^.\\n]{5,80})/gi

function kebab(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

function inferFileStatus(fileName, text) {
  const idx = text.indexOf(fileName)
  if (idx < 0) return 'read'
  const w = text.slice(Math.max(0, idx - 100), Math.min(text.length, idx + 100))
  if (/\\b(creat|wrote|added|scaffold|new)/i.test(w)) return 'new'
  if (/\\b(updat|modif|change|refactor|fix)/i.test(w)) {
    if (/\\b(pass|done|complete|ship|merge|commit)/i.test(w)) return 'done'
    return 'wip'
  }
  if (/\\b(done|complete|shipped|merged)/i.test(w)) return 'done'
  if (/\\b(todo|need|will|going to)/i.test(w)) return 'todo'
  return 'read'
}

function compress(context) {
  const goal = kebab(context.split(/[.!?\\n]/)[0]).split('-').slice(0, 4).join('-')
  const fileSeen = new Map()
  for (const m of context.matchAll(FILE_RE)) fileSeen.set(m[0], m.index)
  const files = {}
  for (const [f] of [...fileSeen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8))
    files[f] = inferFileStatus(f, context)
  const entities = {}
  const seenE = new Set()
  for (const m of context.matchAll(ENTITY_RE)) {
    if (seenE.has(m[1])) continue; seenE.add(m[1]); entities[m[1]] = 'def'
    if (seenE.size >= 6) break
  }
  const planDone = new Set(), planNext = new Set()
  for (const m of context.matchAll(PLAN_STEP_RE)) {
    const p = kebab(m[1]); if (!p || p.length < 3) continue
    if (/todo|next|remaining/.test(m[0].toLowerCase())) planNext.add(p)
    else planDone.add(p)
  }
  const constraints = []
  const seenC = new Set()
  for (const m of context.matchAll(CONSTRAINT_RE)) {
    const c = kebab(m[1]).split('-').slice(0, 4).join('-')
    if (!c || seenC.has(c)) continue; seenC.add(c); constraints.push(c)
    if (constraints.length >= 4) break
  }
  const q = (s) => "'" + String(s).replace(/'/g, "\\\\'") + "'"
  const arr = (a) => '[' + [...a].map(q).join(' ') + ']'
  const obj = (o) => '{ ' + Object.entries(o).map(([k,v]) => q(k)+': '+q(v)).join(' ') + ' }'
  return [
    'session = {', ' goal: '+q(goal), ' files: '+obj(files),
    ' plan_done: '+arr(planDone), ' plan_next: '+arr(planNext),
    ' constraints: '+arr(constraints), ' entities: '+obj(entities),
    '}', '. sjson(session)'
  ].join('\\n')
}

function respond(obj) { process.stdout.write(JSON.stringify(obj) + '\\n') }

function loadState() {
  if (existsSync(STATE_FILE)) {
    try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')) } catch { return {} }
  }
  return {}
}

function saveState(state) {
  mkdirSync('.pact', { recursive: true })
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

async function main() {
  let input
  try { input = JSON.parse(readFileSync('/dev/stdin', 'utf8')) } catch {
    respond({ continue: true }); return
  }
  const ctx = input.context_tokens ?? 0
  const max = input.max_tokens ?? 200000
  const usage = max > 0 ? ctx / max : 0
  if (usage < THRESHOLD) { respond({ continue: true }); return }
  const history = input.conversation_history ?? ''
  if (!history.trim()) { respond({ continue: true }); return }

  const pact = compress(history)
  const before = Math.ceil(history.length / 4)
  const after = Math.ceil(pact.length / 4)
  const ratio = after > 0 ? before / after : 0

  const state = loadState()
  state.compressions = (state.compressions ?? 0) + 1
  state.tokensSaved = (state.tokensSaved ?? 0) + (before - after)
  saveState(state)

  respond({
    continue: true,
    prompt_inject: '[PACT ' + ratio.toFixed(1) + 'x — lossless structural compression]\\n' + pact
  })
}

main().catch(() => respond({ continue: true }))
`

export function getGlobalSettingsPath(): string {
  return join(homedir(), '.claude', 'settings.json')
}

function getGlobalPactDir(): string {
  return join(homedir(), '.pact')
}

export function installCompaction(): { hookPath: string; settingsPath: string } {
  const pactDir = getGlobalPactDir()
  mkdirSync(pactDir, { recursive: true })

  const hookPath = join(pactDir, 'compaction-hook.mjs')
  writeFileSync(hookPath, COMPACTION_HOOK_SCRIPT)

  const settingsPath = getGlobalSettingsPath()
  let settings: Record<string, unknown> = {}
  if (existsSync(settingsPath)) {
    try { settings = JSON.parse(readFileSync(settingsPath, 'utf8')) } catch { /* fresh */ }
  }

  const hookEntry = { type: 'command', command: `node ${hookPath}` }
  const hooks = (settings.hooks ?? {}) as Record<string, unknown>
  const preToolUse = (hooks.PreToolUse ?? []) as Array<{ matcher: string; hooks: unknown[] }>

  const alreadyInstalled = preToolUse.some(
    (entry) => Array.isArray(entry.hooks) && entry.hooks.some(
      (h: unknown) => typeof h === 'object' && h !== null && (h as Record<string, string>).command?.includes('compaction-hook')
    )
  )

  if (!alreadyInstalled) {
    preToolUse.push({ matcher: '*', hooks: [hookEntry] })
    hooks.PreToolUse = preToolUse
    settings.hooks = hooks
    mkdirSync(dirname(settingsPath), { recursive: true })
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n')
  }

  return { hookPath, settingsPath }
}

export function uninstallCompaction(): void {
  const settingsPath = getGlobalSettingsPath()
  if (!existsSync(settingsPath)) return

  let settings: Record<string, unknown>
  try { settings = JSON.parse(readFileSync(settingsPath, 'utf8')) } catch { return }

  const hooks = settings.hooks as Record<string, unknown> | undefined
  if (!hooks) return

  const preToolUse = hooks.PreToolUse as Array<{ matcher: string; hooks: unknown[] }> | undefined
  if (!preToolUse) return

  hooks.PreToolUse = preToolUse.filter(
    (entry) => !(Array.isArray(entry.hooks) && entry.hooks.some(
      (h: unknown) => typeof h === 'object' && h !== null && (h as Record<string, string>).command?.includes('compaction-hook')
    ))
  )
  settings.hooks = hooks
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n')
}
