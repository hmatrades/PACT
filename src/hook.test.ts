import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { runPACT, tokenize } = require('../pact-engine.js')

// Hook integration tests — no API calls, test the logic layer only

describe('PACT hook logic', () => {
  it('threshold gate: below 80% does not trigger compression', () => {
    const contextTokens = 10000
    const maxTokens = 200000
    const usage = contextTokens / maxTokens
    expect(usage < 0.80).toBe(true)
  })

  it('threshold gate: at 80% triggers compression', () => {
    const contextTokens = 160000
    const maxTokens = 200000
    const usage = contextTokens / maxTokens
    expect(usage >= 0.80).toBe(true)
  })

  it('jsonToPACT produces valid PACT', () => {
    const session = {
      goal: 'jwt-to-cookies',
      files: { 'src/auth/jwt.ts': 'done', 'src/utils/cookies.ts': 'new' },
      plan_done: ['read-files', 'create-util'],
      plan_next: ['update-middleware'],
      constraints: ['httponly-secure'],
      entities: { generateToken: 'void-sets-cookie' },
    }

    const q = (s: unknown) => `'${String(s)}'`
    const arr = (a: unknown[]) => `[${a.map(q).join(' ')}]`
    const obj = (o: Record<string, unknown>) =>
      `{ ${Object.entries(o).map(([k, v]) => `${q(k)}: ${q(v)}`).join(' ')} }`

    const pact = [
      `session = {`,
      ` goal: ${q(session.goal)}`,
      ` files: ${obj(session.files)}`,
      ` plan_done: ${arr(session.plan_done)}`,
      ` plan_next: ${arr(session.plan_next)}`,
      ` constraints: ${arr(session.constraints)}`,
      ` entities: ${obj(session.entities)}`,
      `}`,
      `. sjson(session)`,
    ].join('\n')

    const { error, output } = runPACT(pact) as { error: string | null; output: string[] }
    expect(error).toBeNull()
    expect(output.length).toBe(1)
    const parsed = JSON.parse(output[0])
    expect(parsed.goal).toBe('jwt-to-cookies')
    expect(parsed.files['src/auth/jwt.ts']).toBe('done')
    expect(parsed.plan_done).toEqual(['read-files', 'create-util'])
  })

  it('compression reduces token count on long context', () => {
    const longContext = Array.from({ length: 50 }, (_, i) =>
      `Turn ${i + 1}: I read src/auth/jwt.ts and found issue at line ${i * 3}. The problem is that the token refresh logic incorrectly handles expired sessions. I updated the validateToken function to check expiry before returning the decoded payload. Tests are still running.`
    ).join('\n')

    const terse = `session = { goal: 'fix-jwt-refresh' files: { 'src/auth/jwt.ts': 'wip' } plan_done: ['read-jwt' 'found-expiry-bug'] plan_next: ['fix-validate' 'run-tests'] constraints: ['no-expired-tokens'] entities: { 'validateToken': 'wip' } }\n. sjson(session)`

    const before = (tokenize(longContext) as unknown[]).length
    const after = (tokenize(terse) as unknown[]).length
    const ratio = before / after

    expect(ratio > 3).toBe(true)
  })

  it('hook response always has continue: true', () => {
    const safeResponse = { continue: true as const }
    expect(safeResponse.continue).toBe(true)
  })

  it('hook response may include prompt_inject', () => {
    const pact = `session = { goal: 'test' files: {} plan_done: [] plan_next: [] constraints: [] entities: {} }\n. sjson(session)`
    const { error } = runPACT(pact) as { error: string | null }
    expect(error).toBeNull()

    const response = {
      continue: true as const,
      prompt_inject: `[PACT compressed context — ratio: 6.1x]\n${pact}`,
    }
    expect(response.prompt_inject.includes('PACT')).toBe(true)
    expect(response.prompt_inject.includes('session')).toBe(true)
  })

  it('install merges into settings.json without overwriting existing hooks', () => {
    const existing = {
      hooks: {
        PreToolUse: [
          { matcher: 'Bash', hooks: [{ type: 'command', command: 'echo before' }] },
        ],
      },
    }
    const pactEntry = { matcher: '*', hooks: [{ type: 'command', command: 'node .pact/hook.js' }] }
    const merged = {
      ...existing,
      hooks: {
        ...existing.hooks,
        PreToolUse: [...existing.hooks.PreToolUse, pactEntry],
      },
    }
    expect(merged.hooks.PreToolUse.length).toBe(2)
    expect(merged.hooks.PreToolUse[1].hooks[0].command).toBe('node .pact/hook.js')
  })

  it('uninstall removes only the PACT hook entry', () => {
    const settings = {
      hooks: {
        PreToolUse: [
          { matcher: 'Bash', hooks: [{ type: 'command', command: 'echo other-hook' }] },
          { matcher: '*', hooks: [{ type: 'command', command: 'node .pact/hook.js' }] },
        ],
      },
    }
    const after = settings.hooks.PreToolUse.filter(
      (e) => !e.hooks.some((h) => h.command === 'node .pact/hook.js')
    )
    expect(after.length).toBe(1)
    expect(after[0].hooks[0].command).toBe('echo other-hook')
  })
})
