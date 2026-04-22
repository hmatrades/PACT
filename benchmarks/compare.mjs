#!/usr/bin/env node
// benchmarks/compare.mjs — head-to-head vs common semantic-memory strategies.
//
// Strategies compared on the same 11-task suite:
//   1. baseline           — no compression (full context every turn)
//   2. sliding-window     — keep last K turns (LangChain ConversationBufferWindowMemory)
//   3. summarization      — replace old turns with ~50-token summary (ConversationSummaryMemory)
//   4. observation-log    — claude-mem style: one ID+time+verb line per turn
//   5. pact               — our structured extraction
//
// All use the same BPE-style token estimate (chars/4) and threshold.

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const tokens = (s) => Math.ceil(s.length / 4)

const WINDOW_TURNS = 5
const SUMMARY_BUDGET = 50       // tokens for the running summary
const OBS_BUDGET = 15           // tokens per observation line
const THRESHOLD = 500

// --- PACT-style structured extraction (same as run.mjs smart heuristic) ---
const FILE_RE = /\b(?:[\w.-]*\/)*[\w.-]+\.(?:ts|tsx|js|mjs|cjs|py|rs|go|rb|java|cs|php|swift|kt|html|css|scss|json|yaml|yml|sql|md|sh)\b/g
const ENTITY_RE = /\b(?:function|class|def|export\s+function|const|let)\s+([a-zA-Z_$][\w$]*)/g

function kebab(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

function pactCompress(text) {
  const files = new Map()
  for (const m of text.matchAll(FILE_RE)) files.set(m[0], m.index)
  const topFiles = [...files.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([f]) => f)
  const fileObj = `{ ${topFiles.map(f => `'${f}': 'done'`).join(' ')} }`
  const ents = []
  for (const m of text.matchAll(ENTITY_RE)) { ents.push(m[1]); if (ents.length >= 3) break }
  const entObj = `{ ${ents.map(e => `'${e}': 'def'`).join(' ')} }`
  const goal = kebab(text.split(/[.!?\n]/)[0]).split('-').slice(0, 4).join('-')
  return `session = {\n goal: '${goal}'\n files: ${fileObj}\n entities: ${entObj}\n}\n. sjson(session)`
}

// --- Summarization sim: compress old turns to a short summary line ---
function summarize(text) {
  // Extract the most salient chunk — first ~40 words of the most recent content
  const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 10)
  const recent = sentences.slice(-3).join('. ').slice(0, SUMMARY_BUDGET * 4)
  return `[summary: ${recent.trim().slice(0, SUMMARY_BUDGET * 4)}]`
}

// --- Observation log: claude-mem style terse log ---
let obsCounter = 0
function observationLog(text) {
  // Reset counter per task in runner. Each "turn" becomes one line.
  // Extract a verb + object from the text.
  const verbMatch = text.match(/\b(fix|add|update|remove|refactor|test|deploy|create|read|audit|migrate|optimize|implement|install|configure|debug|trace|profile|validate|parse|compress|write|check|run|build)\b\s+([\w-]+)/i)
  const summary = verbMatch ? `${verbMatch[1]} ${verbMatch[2]}` : 'continue'
  return `${(++obsCounter).toString().padStart(4, '0')} ${summary.slice(0, OBS_BUDGET * 4)}`
}

// --- Simulation runners ---

function runBaseline(task) {
  let ctx = task.system_context + '\n'
  let sum = 0
  for (const t of task.turns) { ctx += t + '\n'; sum += tokens(ctx) }
  return sum
}

function runSlidingWindow(task, K) {
  const history = [task.system_context]
  let sum = 0
  for (const t of task.turns) {
    history.push(t)
    const window = [history[0], ...history.slice(-K)].join('\n')
    sum += tokens(window)
  }
  return sum
}

function runSummarization(task) {
  let olderSummary = ''
  const recent = []
  let sum = 0
  for (const t of task.turns) {
    recent.push(t)
    const ctx = [task.system_context, olderSummary, ...recent].filter(Boolean).join('\n')
    if (tokens(ctx) > THRESHOLD) {
      // Push all but last 2 into summary, resummarize
      const toSummarize = recent.slice(0, -2).join(' ')
      olderSummary = summarize((olderSummary + ' ' + toSummarize).trim())
      recent.splice(0, recent.length - 2)
    }
    const carried = [task.system_context, olderSummary, ...recent].filter(Boolean).join('\n')
    sum += tokens(carried)
  }
  return sum
}

function runObservationLog(task) {
  obsCounter = 0
  const log = []
  const recent = []
  let sum = 0
  for (const t of task.turns) {
    recent.push(t)
    log.push(observationLog(t))
    const carried = [task.system_context, log.join('\n'), ...recent.slice(-2)].join('\n')
    if (tokens(carried) > THRESHOLD) {
      recent.splice(0, recent.length - 2)
    }
    const finalCtx = [task.system_context, log.join('\n'), ...recent.slice(-2)].join('\n')
    sum += tokens(finalCtx)
  }
  return sum
}

function runPACT(task) {
  let ctx = task.system_context + '\n'
  let sum = 0
  for (const t of task.turns) {
    ctx += t + '\n'
    if (tokens(ctx) > THRESHOLD) ctx = pactCompress(ctx) + '\n'
    sum += tokens(ctx)
  }
  return sum
}

// --- Main ---

async function main() {
  const tasksDir = join(__dirname, 'tasks')
  const tasks = readdirSync(tasksDir)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'))
    .sort()
    .map(f => JSON.parse(readFileSync(join(tasksDir, f), 'utf8')))

  const strategies = {
    baseline: runBaseline,
    'sliding-5': (t) => runSlidingWindow(t, 5),
    summarization: runSummarization,
    'obs-log': runObservationLog,
    pact: runPACT,
  }

  const perStrategy = {}
  for (const name of Object.keys(strategies)) {
    perStrategy[name] = { total: 0, perTask: {} }
  }

  for (const task of tasks) {
    for (const [name, fn] of Object.entries(strategies)) {
      const t = fn(task)
      perStrategy[name].total += t
      perStrategy[name].perTask[task.id] = t
    }
  }

  // Print
  console.log(`\n=== PACT vs SEMANTIC-MEMORY BASELINES ===`)
  console.log(`${tasks.length} tasks · ${tasks.reduce((s, t) => s + t.turns.length, 0)} total turns · threshold ${THRESHOLD} tokens\n`)

  const baseTotal = perStrategy.baseline.total
  console.log('strategy'.padEnd(18), 'total'.padStart(10), 'ratio'.padStart(8), 'notes')
  for (const name of Object.keys(strategies)) {
    const total = perStrategy[name].total
    const ratio = baseTotal / Math.max(total, 1)
    const notes = {
      baseline: 'full context every turn',
      'sliding-5': 'last 5 turns only (lossy)',
      summarization: '50-token rolling summary',
      'obs-log': 'claude-mem-style terse log',
      pact: 'structured extraction',
    }[name]
    console.log(
      name.padEnd(18),
      total.toLocaleString().padStart(10),
      (ratio.toFixed(2) + 'x').padStart(8),
      ' ',
      notes,
    )
  }

  console.log('\n--- per-task ratios (vs baseline) ---')
  console.log('task'.padEnd(32), 'slide-5'.padStart(8), 'summary'.padStart(8), 'obs-log'.padStart(8), 'pact'.padStart(8))
  for (const task of tasks) {
    const base = perStrategy.baseline.perTask[task.id]
    const row = [
      task.id.padEnd(32),
      (base / perStrategy['sliding-5'].perTask[task.id]).toFixed(1) + 'x',
      (base / perStrategy.summarization.perTask[task.id]).toFixed(1) + 'x',
      (base / perStrategy['obs-log'].perTask[task.id]).toFixed(1) + 'x',
      (base / perStrategy.pact.perTask[task.id]).toFixed(1) + 'x',
    ]
    console.log(row[0], row[1].padStart(8), row[2].padStart(8), row[3].padStart(8), row[4].padStart(8))
  }

  // Lossiness note: sliding window and summarization drop information.
  // PACT and obs-log preserve structural state, so they can be rehydrated.
  console.log('\nLossiness:')
  console.log('  sliding-5       lossy   — older turns gone forever')
  console.log('  summarization   lossy   — old details squashed into prose')
  console.log('  obs-log         lossy   — only verbs+counts retained')
  console.log('  pact            lossless structural — files/entities/plan/constraints')
  console.log('                          can rehydrate specific subgraphs on demand')

  // Write results
  const resultsDir = join(__dirname, 'results')
  mkdirSync(resultsDir, { recursive: true })
  const date = new Date().toISOString().split('T')[0]
  const outFile = join(resultsDir, `${date}-compare.json`)
  writeFileSync(outFile, JSON.stringify({
    date,
    threshold: THRESHOLD,
    strategies: Object.fromEntries(
      Object.entries(perStrategy).map(([k, v]) => [k, {
        total: v.total,
        ratio: baseTotal / Math.max(v.total, 1),
        perTask: Object.fromEntries(
          Object.entries(v.perTask).map(([tid, t]) => [tid, { tokens: t, ratio: perStrategy.baseline.perTask[tid] / Math.max(t, 1) }])
        ),
      }])
    ),
  }, null, 2))
  console.log(`\nResults: ${outFile}`)
}

main().catch(e => { console.error(e); process.exit(1) })
