export type HookInput = {
  tool_name: string
  context_tokens: number
  max_tokens: number
  conversation_history: string
}

export type HookResponse = {
  continue: true
  prompt_inject?: string
}

import { compress } from './compress.js'
import { readState, writeState } from './install.js'

// runHook is called programmatically (not the auto-generated .pact/hook.js)
// The real hook runs as a subprocess via .pact/hook.js
// This function is for testing and SDK consumers who want to call it directly.
export async function runHook(hookInput: HookInput): Promise<HookResponse> {
  const threshold = 0.80
  const usage = hookInput.context_tokens / hookInput.max_tokens

  if (usage < threshold) {
    return { continue: true }
  }

  try {
    const state = readState(process.cwd())
    const result = await compress(hookInput.conversation_history, { model: state.model })
    if (!result) return { continue: true }

    // Update stats
    const n = state.sessionsCompressed + 1
    state.sessionsCompressed = n
    state.avgRatio = (state.avgRatio * (n - 1) + result.ratio) / n
    state.tokensSaved += result.tokens.before - result.tokens.after
    writeState(process.cwd(), state)

    return {
      continue: true,
      prompt_inject: `[PACT compressed context — ratio: ${result.ratio.toFixed(1)}x]\n${result.pact}`
    }
  } catch {
    return { continue: true }
  }
}
