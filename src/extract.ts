export type TagType = 'decision' | 'task' | 'artifact' | 'blocker' | 'insight'

export type PACTTag = {
  type: TagType
  content: string
}

const VALID_TYPES = new Set<string>(['decision', 'task', 'artifact', 'blocker', 'insight'])
const TAG_RE = /^\[PACT:(\w+)\]\s+(.+)$/

export function extractTags(transcript: string): PACTTag[] {
  const tags: PACTTag[] = []
  for (const line of transcript.split('\n')) {
    const m = line.trim().match(TAG_RE)
    if (!m) continue
    const [, type, content] = m
    if (!VALID_TYPES.has(type)) continue
    tags.push({ type: type as TagType, content: content.trim() })
  }
  return tags
}
