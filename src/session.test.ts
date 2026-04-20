import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeSession, readSession, listSessions } from './session.js'
import type { PACTTag } from './extract.js'

let dir: string
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'pact-test-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const TAGS: PACTTag[] = [
  { type: 'decision', content: 'Use injected context' },
  { type: 'task', content: 'Wire Stop hook' },
]

describe('session persistence', () => {
  it('writes and reads back a session', () => {
    const id = 'test-session-001'
    writeSession(dir, id, TAGS)
    const session = readSession(dir, id)
    expect(session).not.toBeNull()
    expect(session!.tags).toHaveLength(2)
    expect(session!.tags[0].type).toBe('decision')
  })

  it('lists saved session ids', () => {
    writeSession(dir, 'sess-a', TAGS)
    writeSession(dir, 'sess-b', TAGS)
    const ids = listSessions(dir)
    expect(ids).toContain('sess-a')
    expect(ids).toContain('sess-b')
  })

  it('returns null for missing session', () => {
    expect(readSession(dir, 'nope')).toBeNull()
  })
})
