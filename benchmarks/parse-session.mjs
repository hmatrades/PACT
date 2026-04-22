#!/usr/bin/env node
// benchmarks/parse-session.mjs
// Converts docs/testimony/session.md into benchmarks/tasks/012-barutu-snake.json
// BARUTU SNAKE: PACT eats the session that built PACT.

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sessionPath = join(__dirname, '../docs/testimony/session.md')
const outPath = join(__dirname, 'tasks/012-barutu-snake.json')

const raw = readFileSync(sessionPath, 'utf8')

// Split on section headers
const sections = raw.split(/\n## /)

const SKIP_TYPES = new Set([
  'queue-operation', 'attachment', 'file-history-snapshot',
  'last-prompt', 'ai-title',
])

function cleanContent(text) {
  return text
    // Strip XML/HTML-like tags and their content for command metadata
    .replace(/<local-command-caveat>[\s\S]*?<\/local-command-caveat>/g, '')
    .replace(/<command-name>[\s\S]*?<\/command-name>/g, '')
    .replace(/<command-message>[\s\S]*?<\/command-message>/g, '')
    .replace(/<command-args>[\s\S]*?<\/command-args>/g, '')
    .replace(/<local-command-stdout>[\s\S]*?<\/local-command-stdout>/g, '')
    .replace(/<[^>]+>/g, '')
    // Strip JSON thinking blocks (huge base64 signatures)
    .replace(/\{"type":"thinking"[^}]*"signature":"[^"]{20,}"[^}]*\}/g, '')
    // Strip tool_use JSON lines (keep the command text within)
    .replace(/\{"type":"tool_use","id":"[^"]+","name":"([^"]+)","input":\{"(?:command|description)":"([^"]{0,200})[^}]*\}[^}]*\}/g,
      (_, name, input) => `[tool: ${name}] ${input}`)
    // Strip tool_result JSON blocks
    .replace(/\{"type":"tool_result"[\s\S]{0,2000}?\}/g, '')
    // Strip remaining JSON-heavy lines (lines starting with {)
    .split('\n')
    .filter(line => {
      const t = line.trim()
      if (!t) return false
      if (t.startsWith('{"type":')) return false
      if (t.startsWith('[{"type":')) return false
      if (/^[A-Za-z0-9+/]{60,}={0,2}$/.test(t)) return false // base64
      return true
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const turns = []

for (const section of sections) {
  const newline = section.indexOf('\n')
  if (newline === -1) continue
  const header = section.slice(0, newline).trim().toLowerCase()
  const body = section.slice(newline + 1)

  if (SKIP_TYPES.has(header)) continue
  if (header !== 'user' && header !== 'assistant') continue

  const cleaned = cleanContent(body)
  if (!cleaned || cleaned.length < 20) continue

  // Cap turn length to keep task file reasonable
  const capped = cleaned.length > 900 ? cleaned.slice(0, 900) + '…' : cleaned
  turns.push(capped)
}

const task = {
  id: '012-barutu-snake',
  category: 'meta',
  description: 'BARUTU SNAKE — PACT compresses the session that built PACT. The ouroboros benchmark. Session: ship-pact-hackathon, 2026-04-19.',
  system_context: 'You are Claude Opus working on pact-cc, a semantic compression middleware for Claude Code. This session is the actual conversation that produced your own codebase. Goal: ship-pact-hackathon. Stack: TypeScript, Node.js, pact-engine.js (frozen), Claude Haiku for LLM extraction, jsonToPACT for deterministic encoding, PreToolUse hook for automatic compression. Files include: src/compress.ts, src/hook.ts, src/install.ts, src/cli.ts, src/rehydrate.ts, pact-engine.js, benchmarks/run.mjs, benchmarks/compare.mjs, docs/index.html, SUBMISSION.md, README.md.',
  turns,
  expected_contains: 'session.pact',
  max_turns: turns.length + 10,
}

writeFileSync(outPath, JSON.stringify(task, null, 2))
console.log(`✓ BARUTU SNAKE task written: ${outPath}`)
console.log(`  turns: ${turns.length}`)
console.log(`  total chars: ${turns.reduce((a, t) => a + t.length, 0).toLocaleString()}`)
console.log(`  estimated baseline tokens: ${Math.ceil(turns.reduce((a, t) => a + t.length, 0) * turns.length / 2 / 4).toLocaleString()} (O(N²))`)
