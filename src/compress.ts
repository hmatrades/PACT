import Anthropic from '@anthropic-ai/sdk'
// Import pact-engine.js - it's a CJS/ESM dual export
// Use createRequire since tsconfig uses ESNext modules
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { tokenize, runPACT } = require('../pact-engine.js')

export type CompressResult = {
  pact: string
  ratio: number
  tokens: { before: number; after: number }
}

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'

// JSON extraction prompt — model outputs JSON, we convert to PACT programmatically.
// This is more reliable than asking the model to output PACT syntax directly.
const COMPRESSION_SYSTEM_PROMPT = `You are a session-state extractor. Compress an AI agent's conversation into a terse JSON object.

Output ONLY a raw JSON object — no markdown, no backticks, no explanation.

Required fields:
- "goal": 2-4 word kebab string. "jwt-to-cookies" NOT "Refactor authentication system"
- "files": object mapping file paths to status codes: "done" | "wip" | "new" | "read" | "todo"
- "plan_done": array of 2-3 word kebab strings for completed steps
- "plan_next": array of 2-3 word kebab strings for remaining steps
- "constraints": array of terse constraint codes
- "entities": object mapping entity names to terse state codes

Strip ALL prose. Strip line numbers. Only codes and paths.`

const REHYDRATION_SYSTEM_PROMPT = `You are a PACT decoder. The following PACT program encodes an AI agent's session state. Expand it into clear, complete natural language that an AI assistant can reason over. Be specific and complete. Output only the expanded text, no preamble.`

export function countTokens(text: string): number {
  return (tokenize(text) as unknown[]).length
}

export function buildCompressionPrompt(context: string): string {
  return context
}

export function validatePACT(code: string): boolean {
  const { error } = runPACT(code) as { error: string | null }
  return error === null
}

async function callOpenAICompat(context: string, model: string, baseURL: string, apiKey: string, systemPrompt: string): Promise<string> {
  const resp = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context },
      ],
    }),
  })
  if (!resp.ok) throw new Error(`API error ${resp.status}`)
  const data = await resp.json() as { choices: Array<{ message: { content: string } }> }
  return data.choices[0].message.content.trim()
}

function jsonToPACT(json: Record<string, unknown>): string {
  const q = (s: unknown) => `'${String(s).replace(/'/g, "\\'")}'`
  const arr = (a: unknown[]) => `[${a.map(q).join(' ')}]`
  const obj = (o: Record<string, unknown>) =>
    `{ ${Object.entries(o).map(([k, v]) => `${q(k)}: ${q(v)}`).join(' ')} }`

  const goal = q(json.goal ?? 'unknown')
  const files = obj((json.files ?? {}) as Record<string, unknown>)
  const planDone = arr((json.plan_done ?? []) as unknown[])
  const planNext = arr((json.plan_next ?? []) as unknown[])
  const constraints = arr((json.constraints ?? []) as unknown[])
  const entities = obj((json.entities ?? {}) as Record<string, unknown>)

  return [
    `session = {`,
    ` goal: ${goal}`,
    ` files: ${files}`,
    ` plan_done: ${planDone}`,
    ` plan_next: ${planNext}`,
    ` constraints: ${constraints}`,
    ` entities: ${entities}`,
    `}`,
    `. sjson(session)`,
  ].join('\n')
}

async function extractSessionJSON(context: string, model: string): Promise<Record<string, unknown>> {
  const bbKey = process.env.BLACKBOX_API_KEY
  let raw: string
  if (bbKey) {
    const bbModel = process.env.BLACKBOX_MODEL ?? 'blackboxai/minimax/minimax-m2.5'
    raw = await callOpenAICompat(context, bbModel, 'https://api.blackbox.ai/v1', bbKey, COMPRESSION_SYSTEM_PROMPT)
  } else {
    const client = new Anthropic()
    const message = await client.messages.create({
      model,
      max_tokens: 1024,
      system: COMPRESSION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: context }],
    })
    const block = message.content[0]
    if (block.type !== 'text') throw new Error('unexpected response type')
    raw = block.text.trim()
  }
  // Strip markdown fences if model adds them anyway
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(cleaned) as Record<string, unknown>
}

export async function callCompressionModel(context: string, model: string): Promise<string> {
  const json = await extractSessionJSON(context, model)
  return jsonToPACT(json)
}

export async function compress(
  context: string,
  opts?: { threshold?: number; model?: string }
): Promise<CompressResult | null> {
  const model = opts?.model ?? DEFAULT_MODEL
  try {
    const before = countTokens(context)
    const pact = await callCompressionModel(context, model)
    if (!validatePACT(pact)) return null
    const after = countTokens(pact)
    const ratio = after === 0 ? 0 : before / after
    return { pact, ratio, tokens: { before, after } }
  } catch {
    return null
  }
}

export async function decompress(pact: string): Promise<string> {
  try {
    const bbKey = process.env.BLACKBOX_API_KEY
    if (bbKey) {
      const bbModel = process.env.BLACKBOX_MODEL ?? 'blackboxai/minimax/minimax-m2.5'
      return await callOpenAICompat(`PACT:\n${pact}`, bbModel, 'https://api.blackbox.ai/v1', bbKey, REHYDRATION_SYSTEM_PROMPT)
    }
    const client = new Anthropic()
    const message = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      system: REHYDRATION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `PACT:\n${pact}` }],
    })
    const block = message.content[0]
    if (block.type !== 'text') return pact
    return block.text.trim()
  } catch {
    return pact // safe fallback — raw PACT is still readable
  }
}
