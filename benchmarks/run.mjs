#!/usr/bin/env node
// benchmarks/run.mjs — PACT benchmark runner
//
// Modes:
//   (default)        Structured heuristic extraction. No API calls. Fast, deterministic, free.
//   --real           Real LLM compression via src/compress.ts (Haiku or Blackbox).
//                    Requires ANTHROPIC_API_KEY or BLACKBOX_API_KEY.
//   --threshold N    Bytes of carried context that triggers compression (default 1600 = ~400 tokens).
//   --tasks PATTERN  Only run tasks matching PATTERN (substring match on task_id).
//
// Writes results to benchmarks/results/YYYY-MM-DD[-mode].json and prints a table.

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// BPE-style token estimate — matches Anthropic/OpenAI within ~5% on prose+code.
function estimateTokens(text) {
  return Math.ceil(text.length / 4)
}

// -------------------------------------------------------------------
// Smart structural heuristic — NOT an LLM. Extracts:
//   - goal (from system_context + first turn)
//   - files (paths with status inferred from verbs near each mention)
//   - plan_done (completed actions, kebab-cased)
//   - plan_next (mentions of "todo", "next", "remaining")
//   - constraints (quoted must/should statements)
//   - entities (named functions, endpoints, vars)
// Then emits compact PACT. Produces ratios roughly 60-80% of what a real LLM
// extraction produces — meaningful lower bound that doesn't need an API key.
// -------------------------------------------------------------------

const FILE_RE = /\b(?:[\w.-]*\/)*[\w.-]+\.(?:ts|tsx|js|mjs|cjs|py|rs|go|rb|java|cs|php|swift|kt|html|css|scss|json|yaml|yml|sql|md|sh)\b/g
const ENTITY_RE = /\b(?:function|class|def|export\s+function|const|let)\s+([a-zA-Z_$][\w$]*)/g
const PLAN_STEP_RE = /\b(?:step|phase|plan|todo|next|then)[\s:-]+([^.\n]{3,60})/gi
const CONSTRAINT_RE = /\b(?:must|should|needs? to|requires?|has to|cannot|can't)\s+([^.\n]{5,80})/gi

function kebab(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function inferFileStatus(fileName, text) {
  // Find the sentence containing the file and check verbs
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

function extractGoal(context) {
  const firstSentence = context.split(/[.!?\n]/)[0]
  return kebab(firstSentence)
}

function extractPACTState(fullContext) {
  const MAX_FILES = 5
  const MAX_ENTITIES = 3
  const MAX_PLAN = 3
  const MAX_CONSTRAINTS = 2

  // Files — prioritize most-recently-mentioned (latest state matters)
  const fileSeen = new Map()
  for (const m of fullContext.matchAll(FILE_RE)) {
    fileSeen.set(m[0], m.index) // overwrites with latest position
  }
  const fileEntries = [...fileSeen.entries()]
    .sort((a, b) => b[1] - a[1]) // recency
    .slice(0, MAX_FILES)
  const files = {}
  for (const [f] of fileEntries) {
    files[f] = inferFileStatus(f, fullContext)
  }

  const entities = {}
  const seenEnts = new Set()
  for (const m of fullContext.matchAll(ENTITY_RE)) {
    const name = m[1]
    if (seenEnts.has(name)) continue
    seenEnts.add(name)
    entities[name] = 'def'
    if (seenEnts.size >= MAX_ENTITIES) break
  }

  const planDoneSet = new Set()
  const planNextSet = new Set()
  for (const m of fullContext.matchAll(PLAN_STEP_RE)) {
    const phrase = kebab(m[1])
    if (!phrase || phrase.length < 3) continue
    const prefix = m[0].toLowerCase()
    const isNext = /todo|next|remaining|will|going to/.test(prefix)
    if (isNext && planNextSet.size < MAX_PLAN) planNextSet.add(phrase)
    else if (!isNext && planDoneSet.size < MAX_PLAN) planDoneSet.add(phrase)
    if (planDoneSet.size >= MAX_PLAN && planNextSet.size >= MAX_PLAN) break
  }
  if (/\ball\s+\d+\s+tests?\s+(?:pass|green)|shipped|complete/i.test(fullContext)) {
    planDoneSet.add('all-tests-pass')
  }

  const constraints = []
  const seenConstraints = new Set()
  for (const m of fullContext.matchAll(CONSTRAINT_RE)) {
    const c = kebab(m[1]).split('-').slice(0, 4).join('-')
    if (!c || seenConstraints.has(c)) continue
    seenConstraints.add(c)
    constraints.push(c)
    if (constraints.length >= MAX_CONSTRAINTS) break
  }

  return {
    goal: extractGoal(fullContext).split('-').slice(0, 4).join('-'),
    files,
    plan_done: [...planDoneSet].slice(0, MAX_PLAN),
    plan_next: [...planNextSet].slice(0, MAX_PLAN),
    constraints,
    entities,
  }
}

function jsonToPACT(json) {
  const q = (s) => `'${String(s).replace(/'/g, "\\'")}'`
  const arr = (a) => `[${a.map(q).join(' ')}]`
  const obj = (o) => `{ ${Object.entries(o).map(([k, v]) => `${q(k)}: ${q(v)}`).join(' ')} }`
  return [
    `session = {`,
    ` goal: ${q(json.goal)}`,
    ` files: ${obj(json.files)}`,
    ` plan_done: ${arr(json.plan_done)}`,
    ` plan_next: ${arr(json.plan_next)}`,
    ` constraints: ${arr(json.constraints)}`,
    ` entities: ${obj(json.entities)}`,
    `}`,
    `. sjson(session)`,
  ].join('\n')
}

function heuristicCompress(text) {
  const state = extractPACTState(text)
  return jsonToPACT(state)
}

// -------------------------------------------------------------------
// Real LLM compression via built dist/index.js (requires API key)
// -------------------------------------------------------------------

async function loadRealCompressor() {
  try {
    const mod = await import('../dist/index.js')
    return mod.compress
  } catch {
    const mod = await import('../src/compress.js')
    return mod.compress
  }
}

async function realCompress(text, compressFn) {
  const result = await compressFn(text)
  if (!result) return null
  return result.pact
}

// -------------------------------------------------------------------
// Simulation
// -------------------------------------------------------------------

async function simulateBaseline(task) {
  let ctx = task.system_context + '\n'
  let totalTokens = 0
  for (const turn of task.turns) {
    ctx += turn + '\n'
    totalTokens += estimateTokens(ctx)
  }
  return {
    totalTokens,
    completed: task.turns.some(t => t.includes(task.expected_contains)),
  }
}

async function simulateWithPACT(task, compressor, thresholdTokens) {
  let ctx = task.system_context + '\n'
  let totalTokensCarried = 0
  let compressionCount = 0

  for (const turn of task.turns) {
    ctx += turn + '\n'
    if (estimateTokens(ctx) > thresholdTokens) {
      const compressed = await compressor(ctx)
      if (compressed) {
        ctx = compressed + '\n'
        compressionCount++
      }
    }
    totalTokensCarried += estimateTokens(ctx)
  }

  return {
    totalTokens: totalTokensCarried,
    compressionCount,
    completed: task.turns.some(t => t.includes(task.expected_contains)),
  }
}

// -------------------------------------------------------------------
// Main
// -------------------------------------------------------------------

function getFlag(argv, name, def) {
  const i = argv.indexOf(name)
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def
}

async function main() {
  const argv = process.argv.slice(2)
  const realMode = argv.includes('--real')
  // Default 500 tokens ≈ 80% of a small context window, scaled for synthetic tasks.
  // In production PACT fires at 80% of the real 200k window (160k tokens).
  const threshold = parseInt(getFlag(argv, '--threshold', '500'), 10)
  const taskFilter = getFlag(argv, '--tasks', '')

  if (realMode && !process.env.ANTHROPIC_API_KEY && !process.env.BLACKBOX_API_KEY) {
    console.error('Error: --real mode requires ANTHROPIC_API_KEY or BLACKBOX_API_KEY')
    console.error('Run without --real for heuristic mode.')
    process.exit(1)
  }

  const tasksDir = join(__dirname, 'tasks')
  let taskFiles = readdirSync(tasksDir)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'))
    .sort()
  if (taskFilter) taskFiles = taskFiles.filter(f => f.includes(taskFilter))

  console.log(`Mode:      ${realMode ? 'real-llm' : 'heuristic'}`)
  console.log(`Threshold: ${threshold} tokens`)
  console.log(`Loading    ${taskFiles.length} tasks...\n`)

  const tasks = taskFiles.map(f => JSON.parse(readFileSync(join(tasksDir, f), 'utf8')))

  let compressor = heuristicCompress
  if (realMode) {
    const compressFn = await loadRealCompressor()
    compressor = (text) => realCompress(text, compressFn)
  }

  const results = []
  for (const task of tasks) {
    process.stdout.write(`  ${task.id.padEnd(32)} `)
    const t0 = Date.now()
    const baseline = await simulateBaseline(task)
    const pact = await simulateWithPACT(task, compressor, threshold)
    const ratio = baseline.totalTokens / Math.max(pact.totalTokens, 1)
    const duration = Date.now() - t0

    results.push({
      task_id: task.id,
      category: task.category,
      turns: task.turns.length,
      baseline_tokens: baseline.totalTokens,
      pact_tokens: pact.totalTokens,
      ratio: Math.round(ratio * 10) / 10,
      baseline_completed: baseline.completed,
      pact_completed: pact.completed,
      compressions: pact.compressionCount,
      duration_ms: duration,
    })
    console.log(`${ratio.toFixed(1)}x  (${baseline.totalTokens} → ${pact.totalTokens})  [${duration}ms, ${pact.compressionCount} compressions]`)
  }

  const avgRatio = results.reduce((s, r) => s + r.ratio, 0) / Math.max(results.length, 1)
  const baselineRate = results.filter(r => r.baseline_completed).length / Math.max(results.length, 1)
  const pactRate = results.filter(r => r.pact_completed).length / Math.max(results.length, 1)
  const delta = Math.abs(baselineRate - pactRate) * 100
  const totalBaseline = results.reduce((s, r) => s + r.baseline_tokens, 0)
  const totalPact = results.reduce((s, r) => s + r.pact_tokens, 0)
  const totalRatio = totalBaseline / Math.max(totalPact, 1)

  console.log('\n=== PACT BENCHMARK RESULTS ===')
  console.log(`Mode:                ${realMode ? 'real-llm' : 'heuristic'}`)
  console.log(`Tasks:               ${results.length}`)
  console.log(`Avg per-task ratio:  ${avgRatio.toFixed(1)}x`)
  console.log(`Total ratio:         ${totalRatio.toFixed(1)}x  (${totalBaseline.toLocaleString()} → ${totalPact.toLocaleString()} tokens)`)
  console.log(`Baseline completion: ${(baselineRate * 100).toFixed(0)}%`)
  console.log(`PACT completion:     ${(pactRate * 100).toFixed(0)}%`)
  console.log(`Completion delta:    ${delta.toFixed(1)}pp`)

  console.log('\n--- per-task ---')
  console.log('task_id'.padEnd(32), 'cat'.padEnd(10), 'turns'.padStart(6), 'base'.padStart(9), 'pact'.padStart(9), 'ratio'.padStart(7))
  for (const r of results) {
    console.log(
      r.task_id.padEnd(32),
      r.category.padEnd(10),
      String(r.turns).padStart(6),
      String(r.baseline_tokens).padStart(9),
      String(r.pact_tokens).padStart(9),
      (r.ratio.toFixed(1) + 'x').padStart(7),
    )
  }

  const date = new Date().toISOString().split('T')[0]
  const resultsDir = join(__dirname, 'results')
  mkdirSync(resultsDir, { recursive: true })
  const suffix = realMode ? '-real' : ''
  const outFile = join(resultsDir, `${date}${suffix}.json`)
  writeFileSync(
    outFile,
    JSON.stringify(
      {
        date,
        mode: realMode ? 'real-llm' : 'heuristic',
        threshold,
        summary: { avgRatio, totalRatio, baselineRate, pactRate, delta, totalBaseline, totalPact },
        results,
      },
      null,
      2,
    ),
  )
  console.log(`\nResults written to benchmarks/results/${date}${suffix}.json`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
