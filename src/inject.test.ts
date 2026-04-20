import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildInjection } from './inject.ts'

describe('buildInjection', () => {
  it('returns a string containing the pact-requirements tag', () => {
    const block = buildInjection()
    assert(block.includes('<pact-requirements>'), 'should contain opening tag')
    assert(block.includes('</pact-requirements>'), 'should contain closing tag')
  })

  it('instructs the agent to emit PACT tags', () => {
    const block = buildInjection()
    assert(block.includes('[PACT:decision]'), 'should mention decision tag')
    assert(block.includes('[PACT:task]'), 'should mention task tag')
    assert(block.includes('[PACT:artifact]'), 'should mention artifact tag')
    assert(block.includes('[PACT:blocker]'), 'should mention blocker tag')
    assert(block.includes('[PACT:insight]'), 'should mention insight tag')
  })

  it('is under 400 tokens (keeps injection cheap)', () => {
    const block = buildInjection()
    // Rough estimate: ~4 chars per token
    assert(block.length < 1600, `injection should be under 1600 chars, got ${block.length}`)
  })
})
