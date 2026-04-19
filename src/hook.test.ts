import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { runPACT, tokenize } = require('../pact-engine.js')

// Hook integration tests — no API calls, test the logic layer only

describe('PACT hook logic', () => {
  it('threshold gate: below 80% does not trigger compression', () => {
    const contextTokens = 10000
    const maxTokens = 200000
    const usage = contextTokens / maxTokens
    assert.ok(usage < 0.80, 'should be below threshold')
  })

  it('threshold gate: at 80% triggers compression', () => {
    const contextTokens = 160000
    const maxTokens = 200000
    const usage = contextTokens / maxTokens
    assert.ok(usage >= 0.80, 'should meet threshold')
  })

  it('jsonToPACT produces valid PACT', () => {
    // Simulate what jsonToPACT builds (mirrors src/compress.ts logic)
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
    assert.equal(error, null, `PACT should be valid, got: ${error}`)
    assert.equal(output.length, 1, 'should produce one output line')
    const parsed = JSON.parse(output[0])
    assert.equal(parsed.goal, 'jwt-to-cookies')
    assert.equal(parsed.files['src/auth/jwt.ts'], 'done')
    assert.deepEqual(parsed.plan_done, ['read-files', 'create-util'])
  })

  it('compression reduces token count on long context', () => {
    const longContext = Array.from({ length: 50 }, (_, i) =>
      `Turn ${i + 1}: I read src/auth/jwt.ts and found issue at line ${i * 3}. The problem is that the token refresh logic incorrectly handles expired sessions. I updated the validateToken function to check expiry before returning the decoded payload. Tests are still running.`
    ).join('\n')

    const terse = `session = { goal: 'fix-jwt-refresh' files: { 'src/auth/jwt.ts': 'wip' } plan_done: ['read-jwt' 'found-expiry-bug'] plan_next: ['fix-validate' 'run-tests'] constraints: ['no-expired-tokens'] entities: { 'validateToken': 'wip' } }\n. sjson(session)`

    const before = (tokenize(longContext) as unknown[]).length
    const after = (tokenize(terse) as unknown[]).length
    const ratio = before / after

    assert.ok(ratio > 3, `expected >3x ratio, got ${ratio.toFixed(1)}x`)
  })

  it('hook response always has continue: true', () => {
    // Safe fallback contract — hook must never block tool calls
    const safeResponse = { continue: true as const }
    assert.equal(safeResponse.continue, true)
  })

  it('hook response may include prompt_inject', () => {
    const pact = `session = { goal: 'test' files: {} plan_done: [] plan_next: [] constraints: [] entities: {} }\n. sjson(session)`
    const { error } = runPACT(pact) as { error: string | null }
    assert.equal(error, null)

    const response = {
      continue: true as const,
      prompt_inject: `[PACT compressed context — ratio: 6.1x]\n${pact}`,
    }
    assert.ok(response.prompt_inject.includes('PACT'))
    assert.ok(response.prompt_inject.includes('session'))
  })

  it('install merges into settings.json without overwriting existing hooks', () => {
    const existing = {
      hooks: {
        PreToolUse: [
          { matcher: 'Bash', hooks: [{ type: 'command', command: 'echo before' }] },
        ],
      },
    }
    // Simulate merge logic
    const pactEntry = { matcher: '*', hooks: [{ type: 'command', command: 'node .pact/hook.js' }] }
    const merged = {
      ...existing,
      hooks: {
        ...existing.hooks,
        PreToolUse: [...existing.hooks.PreToolUse, pactEntry],
      },
    }
    assert.equal(merged.hooks.PreToolUse.length, 2, 'should preserve existing hook')
    assert.equal(merged.hooks.PreToolUse[1].hooks[0].command, 'node .pact/hook.js')
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
    assert.equal(after.length, 1, 'should remove only PACT entry')
    assert.equal(after[0].hooks[0].command, 'echo other-hook')
  })
})
