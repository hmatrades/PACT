import { readFileSync } from 'node:fs'
import { compress, decompress } from './compress.js'
import { installPACT, uninstallPACT, readState } from './install.js'

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const cmd = args[0]

  switch (cmd) {
    case 'install': {
      const threshold = parseFloat(getFlag(args, '--threshold') ?? '0.80')
      const model = getFlag(args, '--model') ?? 'claude-haiku-4-5-20251001'
      const projectDir = process.cwd()
      const existing = readState(projectDir)
      if (existing.installed) {
        console.log('✓ PACT already installed. Nothing changed.')
        console.log("  Use 'pact-cc uninstall' first to reinstall with new options.")
        break
      }
      await installPACT(projectDir, { threshold, model })
      console.log(`✓ PACT installed in ${projectDir}/.claude/settings.json`)
      console.log(`✓ Hook script written to ${projectDir}/.pact/hook.js`)
      console.log(`  Token compression activates at ${Math.round(threshold * 100)}% context usage.`)
      console.log("  Run 'pact-cc status' to monitor.")
      break
    }

    case 'uninstall': {
      await uninstallPACT(process.cwd())
      console.log('✓ Hook removed from .claude/settings.json')
      console.log('✓ .pact/ directory deleted')
      console.log('  PACT uninstalled.')
      break
    }

    case 'compress': {
      const statsFlag = args.includes('--stats')
      let text = args.filter(a => !a.startsWith('--') && a !== 'compress').join(' ')
      if (!text) {
        try { text = readFileSync('/dev/stdin', 'utf8') } catch { text = '' }
      }
      if (!text.trim()) {
        console.error('Error: provide text as argument or via stdin')
        process.exit(1)
      }
      const result = await compress(text)
      if (!result) {
        console.error('Error: compression failed')
        process.exit(1)
      }
      if (statsFlag) {
        console.log(`# tokens before: ${result.tokens.before}`)
        console.log(`# tokens after:  ${result.tokens.after}`)
        console.log(`# ratio: ${result.ratio.toFixed(1)}x`)
      }
      process.stdout.write(result.pact + '\n')
      break
    }

    case 'decompress': {
      let pact = args.filter(a => !a.startsWith('--') && a !== 'decompress').join(' ')
      if (!pact) {
        try { pact = readFileSync('/dev/stdin', 'utf8') } catch { pact = '' }
      }
      const result = await decompress(pact)
      process.stdout.write(result + '\n')
      break
    }

    case 'status': {
      const state = readState(process.cwd())
      const jsonFlag = args.includes('--json')
      if (jsonFlag) {
        process.stdout.write(JSON.stringify(state) + '\n')
        break
      }
      if (!state.installed) {
        console.log('PACT not installed in this project.')
        console.log("Run 'pact-cc install' to get started.")
        break
      }
      console.log('PACT status:')
      console.log(`  installed:          yes`)
      console.log(`  threshold:          ${Math.round(state.threshold * 100)}%`)
      console.log(`  model:              ${state.model}`)
      console.log(`  sessions compressed: ${state.sessionsCompressed}`)
      console.log(`  avg ratio:          ${state.avgRatio.toFixed(1)}x`)
      console.log(`  tokens saved:       ${state.tokensSaved.toLocaleString()}`)
      break
    }

    case 'benchmark': {
      console.log('Benchmark runner coming Day 3. Run `node benchmarks/runner.ts` directly.')
      break
    }

    default: {
      console.log('pact-cc — semantic compression middleware for Claude Code')
      console.log('')
      console.log('Commands:')
      console.log('  install    [--threshold 0-1] [--model model-id]')
      console.log('  uninstall')
      console.log('  compress   [text] [--stats]')
      console.log('  decompress [pact-code]')
      console.log('  status')
      console.log('  benchmark  [--tasks N] [--output path]')
    }
  }
}

function getFlag(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag)
  return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err)
  console.error('Error:', msg)
  process.exit(1)
})
