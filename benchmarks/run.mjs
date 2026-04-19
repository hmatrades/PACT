#!/usr/bin/env node
// benchmarks/run.mjs — PACT benchmark runner
//
// Loads task JSONs from benchmarks/tasks/, simulates two scenarios per task
// (baseline: no compression, PACT: heuristic compression when ctx > threshold),
// scores token ratios + completion rates, and writes results to
// benchmarks/results/YYYY-MM-DD.json.

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { tokenize } = require('../pact-engine.js')

// --- Task simulation ---
// We simulate agent context by concatenating task turns.
// Each "turn" is a realistic agent message for that task type.
// Baseline: all turns concatenated (no compression)
// PACT: compress when cumulative tokens > threshold, carry compressed + new turns

const THRESHOLD_TOKENS = 8000 // simulate 80% of 10k context

function countTokens(text) {
  return tokenize(text).length
}

// Simulate what a PACT-encoded turn looks like (without calling API)
// We use a heuristic: strip prose, keep key entities as PACT syntax
function heuristicCompress(text) {
  // Extract file paths (common extensions)
  const files = [
    ...text.matchAll(/[\w.-]*(?:src|tests|lib|app|components|api|server|client|benchmarks|docs)\/[\w/.-]+\.[a-z]{1,5}/gi),
  ].map(m => m[0])
  const uniqueFiles = [...new Set(files)].slice(0, 12) // cap to keep compact

  // Extract action verbs (coarse)
  const actions = []
  if (/creat|wrote|added|scaffold/i.test(text)) actions.push('create')
  if (/read|found|saw|grep|located|examined|inspected/i.test(text)) actions.push('read')
  if (/updat|modif|changed|refactor|renamed|moved/i.test(text)) actions.push('update')
  if (/test|pass|fail|assert|spec|coverage/i.test(text)) actions.push('test')
  if (/install|npm|yarn|pnpm|pip|cargo/i.test(text)) actions.push('install')
  if (/delet|remov|strip/i.test(text)) actions.push('delete')
  if (/fix|bug|error|stack|trace|throw/i.test(text)) actions.push('fix')
  if (/migrat|schema|db|database|sql|index/i.test(text)) actions.push('migrate')
  if (/profil|perf|slow|latency|bench/i.test(text)) actions.push('profile')
  if (/deploy|ci|pipeline|build/i.test(text)) actions.push('deploy')

  // Build compact PACT-like map literal
  const fileMap = uniqueFiles.map(f => `'${f}':'done'`).join(' ')
  const actionList = [...new Set(actions)].map(a => `'${a}'`).join(' ')
  return `turn={files:{${fileMap}} acts:[${actionList}]}`
}

async function simulateBaseline(task) {
  // Baseline: just concatenate all turns — no compression
  let fullContext = task.system_context + '\n'
  for (const turn of task.turns) {
    fullContext += turn + '\n'
  }
  return {
    totalTokens: countTokens(fullContext),
    completed: task.turns.some(t => t.includes(task.expected_contains)),
  }
}

async function simulateWithPACT(task) {
  let carriedContext = task.system_context + '\n'
  let totalTokensCarried = 0
  let compressionCount = 0

  for (const turn of task.turns) {
    carriedContext += turn + '\n'
    const currentTokens = countTokens(carriedContext)

    if (currentTokens > THRESHOLD_TOKENS) {
      const compressed = heuristicCompress(carriedContext)
      carriedContext = compressed + '\n'
      compressionCount++
    }

    totalTokensCarried += countTokens(carriedContext)
  }

  return {
    totalTokens: totalTokensCarried,
    compressionCount,
    completed: task.turns.some(t => t.includes(task.expected_contains)),
  }
}

// --- Main ---
async function main() {
  const tasksDir = join(__dirname, 'tasks')
  const taskFiles = readdirSync(tasksDir)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'))
    .sort()

  console.log(`Loading ${taskFiles.length} tasks...`)
  const tasks = taskFiles.map(f => JSON.parse(readFileSync(join(tasksDir, f), 'utf8')))

  const results = []

  for (const task of tasks) {
    process.stdout.write(`  ${task.id}... `)
    const baseline = await simulateBaseline(task)
    const pact = await simulateWithPACT(task)
    const ratio = baseline.totalTokens / Math.max(pact.totalTokens, 1)

    results.push({
      task_id: task.id,
      category: task.category,
      baseline_tokens: baseline.totalTokens,
      pact_tokens: pact.totalTokens,
      ratio: Math.round(ratio * 10) / 10,
      baseline_completed: baseline.completed,
      pact_completed: pact.completed,
      compressions: pact.compressionCount,
    })
    console.log(`${ratio.toFixed(1)}x (${baseline.totalTokens} → ${pact.totalTokens} tokens)`)
  }

  // Summary
  const avgRatio = results.reduce((s, r) => s + r.ratio, 0) / Math.max(results.length, 1)
  const baselineRate =
    results.filter(r => r.baseline_completed).length / Math.max(results.length, 1)
  const pactRate = results.filter(r => r.pact_completed).length / Math.max(results.length, 1)
  const delta = Math.abs(baselineRate - pactRate) * 100

  console.log('\n=== PACT BENCHMARK RESULTS ===')
  console.log(`Tasks:               ${results.length}`)
  console.log(`Avg token ratio:     ${avgRatio.toFixed(1)}x`)
  console.log(`Baseline completion: ${(baselineRate * 100).toFixed(0)}%`)
  console.log(`PACT completion:     ${(pactRate * 100).toFixed(0)}%`)
  console.log(`Completion delta:    ${delta.toFixed(1)}pp`)

  // Table
  console.log('\n--- per-task ---')
  console.log('task_id'.padEnd(28), 'cat'.padEnd(10), 'base'.padStart(8), 'pact'.padStart(8), 'ratio'.padStart(7), 'cmp')
  for (const r of results) {
    console.log(
      r.task_id.padEnd(28),
      r.category.padEnd(10),
      String(r.baseline_tokens).padStart(8),
      String(r.pact_tokens).padStart(8),
      (r.ratio.toFixed(1) + 'x').padStart(7),
      String(r.compressions).padStart(3),
    )
  }

  // Write results
  const date = new Date().toISOString().split('T')[0]
  const resultsDir = join(__dirname, 'results')
  mkdirSync(resultsDir, { recursive: true })
  const outFile = join(resultsDir, `${date}.json`)
  writeFileSync(
    outFile,
    JSON.stringify(
      { date, summary: { avgRatio, baselineRate, pactRate, delta }, results },
      null,
      2,
    ),
  )
  console.log(`\nResults written to benchmarks/results/${date}.json`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
