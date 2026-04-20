import { describe, it, expect } from 'vitest'
import { buildInjection } from './inject.ts'

describe('buildInjection', () => {
  it('returns a string containing the pact-requirements tag', () => {
    const block = buildInjection()
    expect(block.includes('<pact-requirements>')).toBe(true)
    expect(block.includes('</pact-requirements>')).toBe(true)
  })

  it('instructs the agent to emit PACT tags', () => {
    const block = buildInjection()
    expect(block.includes('[PACT:decision]')).toBe(true)
    expect(block.includes('[PACT:task]')).toBe(true)
    expect(block.includes('[PACT:artifact]')).toBe(true)
    expect(block.includes('[PACT:blocker]')).toBe(true)
    expect(block.includes('[PACT:insight]')).toBe(true)
  })

  it('is under 400 tokens (keeps injection cheap)', () => {
    const block = buildInjection()
    expect(block.length).toBeLessThan(1600)
  })
})
