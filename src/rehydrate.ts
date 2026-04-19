import Anthropic from '@anthropic-ai/sdk'

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'

export async function rehydrate(pact: string, focusEntity?: string): Promise<string> {
  const client = new Anthropic()
  const system = focusEntity
    ? `You are a PACT decoder. Expand ONLY the '${focusEntity}' section of the PACT program below into complete natural language. Output only the expanded text.`
    : `You are a PACT decoder. Expand the full PACT program below into complete natural language that an AI assistant can reason over. Output only the expanded text.`

  try {
    const message = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      system,
      messages: [{ role: 'user', content: `PACT:\n${pact}` }],
    })
    const block = message.content[0]
    if (block.type !== 'text') return pact
    return block.text.trim()
  } catch {
    return pact
  }
}
