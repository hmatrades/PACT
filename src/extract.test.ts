import { describe, it, expect } from 'vitest'
import { extractTags, PACTTag } from './extract.js'

const SAMPLE = `
Here is my analysis.

[PACT:decision] Use injected context over API polling — simpler, no mid-conv latency
[PACT:task] Update install.ts to wire Stop hook
[PACT:artifact] src/inject.ts — new injection block generator
[PACT:blocker] Stop hook not yet supported in Claude Code desktop

Normal prose continues here.

[PACT:insight] Inline tagging is more reliable than post-hoc summarization
`

describe('extractTags', () => {
  it('parses all five tag types', () => {
    const tags = extractTags(SAMPLE)
    const types = tags.map((t) => t.type)
    expect(types).toContain('decision')
    expect(types).toContain('task')
    expect(types).toContain('artifact')
    expect(types).toContain('blocker')
    expect(types).toContain('insight')
  })

  it('preserves tag content exactly', () => {
    const tags = extractTags(SAMPLE)
    const decision = tags.find((t) => t.type === 'decision')
    expect(decision?.content).toBe('Use injected context over API polling — simpler, no mid-conv latency')
  })

  it('returns empty array for transcript with no tags', () => {
    expect(extractTags('no tags here at all')).toEqual([])
  })

  it('ignores malformed tags', () => {
    const tags = extractTags('[PACT:unknown] something\n[PACT:task] valid task')
    expect(tags).toHaveLength(1)
    expect(tags[0].type).toBe('task')
  })
})
