import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PACTTag } from './extract.js'

export type PACTSession = {
  id: string
  timestamp: string
  tags: PACTTag[]
}

function sessionsDir(projectDir: string): string {
  return join(projectDir, '.pact', 'sessions')
}

function sessionPath(projectDir: string, id: string): string {
  return join(sessionsDir(projectDir), `${id}.json`)
}

export function writeSession(projectDir: string, id: string, tags: PACTTag[]): void {
  const dir = sessionsDir(projectDir)
  mkdirSync(dir, { recursive: true })
  const session: PACTSession = { id, timestamp: new Date().toISOString(), tags }
  writeFileSync(sessionPath(projectDir, id), JSON.stringify(session, null, 2))
}

export function readSession(projectDir: string, id: string): PACTSession | null {
  const p = sessionPath(projectDir, id)
  if (!existsSync(p)) return null
  try { return JSON.parse(readFileSync(p, 'utf8')) as PACTSession } catch { return null }
}

export function listSessions(projectDir: string): string[] {
  const dir = sessionsDir(projectDir)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort()
}
