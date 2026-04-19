import { readFileSync } from 'node:fs'
import { compress, decompress } from './compress.js'
import { installPACT, uninstallPACT, readState, computeSavings } from './install.js'

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
      const jsonFlag = args.includes('--json')
      let text = args.filter(a => !a.startsWith('--') && a !== 'compress').join(' ')
      if (!text) {
        try { text = readFileSync('/dev/stdin', 'utf8') } catch { text = '' }
      }
      if (!text.trim()) {
        if (jsonFlag) process.stdout.write(JSON.stringify({ ok: false, error: 'no input' }) + '\n')
        else console.error('Error: provide text as argument or via stdin')
        process.exit(1)
      }
      const model = getFlag(args, '--model')
      const result = await compress(text, model ? { model } : undefined)
      if (!result) {
        if (jsonFlag) process.stdout.write(JSON.stringify({ ok: false, error: 'compression failed' }) + '\n')
        else console.error('Error: compression failed')
        process.exit(1)
      }
      if (jsonFlag) {
        process.stdout.write(JSON.stringify({ ok: true, ...result }) + '\n')
        break
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
      const savings = computeSavings(state)
      const jsonFlag = args.includes('--json')
      if (jsonFlag) {
        process.stdout.write(JSON.stringify({ ...state, savings }) + '\n')
        break
      }
      if (!state.installed) {
        console.log('PACT not installed in this project.')
        console.log("Run 'pact-cc install' to get started.")
        break
      }
      const kb = savings.bytesSaved / 1024
      const mb = kb / 1024
      const size = mb >= 1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(1)} KB`
      console.log('PACT status:')
      console.log(`  installed:           yes`)
      console.log(`  threshold:           ${Math.round(state.threshold * 100)}%`)
      console.log(`  model:               ${state.model}`)
      console.log(`  sessions compressed: ${state.sessionsCompressed}`)
      console.log(`  avg ratio:           ${state.avgRatio.toFixed(1)}x`)
      console.log('  ─── savings ───')
      console.log(`  tokens saved:        ${savings.tokensSaved.toLocaleString()}`)
      console.log(`  bytes saved:         ${size} (${savings.bytesSaved.toLocaleString()} B)`)
      console.log(`  usd saved:           $${savings.usdSaved.toFixed(4)}  (@ $${savings.pricePerMTokens.toFixed(2)}/1M tokens)`)
      break
    }

    case 'savings': {
      // pact-cc savings [--before <file>] [--after <file>] [--price 3.0]
      // Prints tokens/bytes/usd saved for any before/after pair. If no args,
      // reads cumulative savings from this project's state.json.
      const beforeFile = getFlag(args, '--before')
      const afterFile = getFlag(args, '--after')
      const jsonFlag = args.includes('--json')
      const priceFlag = getFlag(args, '--price')
      const price = priceFlag ? Number(priceFlag) : (process.env.PACT_PRICE_PER_MTOKENS ? Number(process.env.PACT_PRICE_PER_MTOKENS) : 3.0)

      if (beforeFile && afterFile) {
        const beforeText = readFileSync(beforeFile, 'utf8')
        const afterText = readFileSync(afterFile, 'utf8')
        const bytesBefore = Buffer.byteLength(beforeText, 'utf8')
        const bytesAfter = Buffer.byteLength(afterText, 'utf8')
        const bpe = (s: string) => Math.ceil(s.length / 4)
        const tokensBefore = bpe(beforeText)
        const tokensAfter = bpe(afterText)
        const tokensSaved = tokensBefore - tokensAfter
        const bytesSaved = bytesBefore - bytesAfter
        const usdSaved = (tokensSaved / 1_000_000) * price
        const ratio = tokensAfter === 0 ? 0 : tokensBefore / tokensAfter
        const result = {
          before: { bytes: bytesBefore, tokens: tokensBefore },
          after: { bytes: bytesAfter, tokens: tokensAfter },
          saved: { bytes: bytesSaved, tokens: tokensSaved, usd: usdSaved },
          ratio,
          pricePerMTokens: price,
        }
        if (jsonFlag) { process.stdout.write(JSON.stringify(result) + '\n'); break }
        const kb = Math.abs(bytesSaved) / 1024
        const mb = kb / 1024
        const sizeStr = mb >= 1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(1)} KB`
        console.log('PACT savings (ad-hoc):')
        console.log(`  before: ${bytesBefore.toLocaleString()} B · ${tokensBefore.toLocaleString()} tokens`)
        console.log(`  after:  ${bytesAfter.toLocaleString()} B · ${tokensAfter.toLocaleString()} tokens`)
        console.log(`  ratio:  ${ratio.toFixed(2)}x`)
        console.log('  ─── saved ───')
        console.log(`  tokens: ${tokensSaved.toLocaleString()}`)
        console.log(`  bytes:  ${sizeStr} (${bytesSaved.toLocaleString()} B)`)
        console.log(`  usd:    $${usdSaved.toFixed(4)}  (@ $${price.toFixed(2)}/1M tokens)`)
        break
      }

      const state = readState(process.cwd())
      const savings = computeSavings(state)
      if (jsonFlag) { process.stdout.write(JSON.stringify({ ...state, savings }) + '\n'); break }
      if (!state.installed) {
        console.log('PACT not installed in this project — no cumulative state.')
        console.log('For ad-hoc savings: pact-cc savings --before <file> --after <file>')
        break
      }
      const kb = savings.bytesSaved / 1024
      const mb = kb / 1024
      const size = mb >= 1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(1)} KB`
      console.log('PACT cumulative savings:')
      console.log(`  sessions compressed: ${state.sessionsCompressed}`)
      console.log(`  avg ratio:           ${state.avgRatio.toFixed(1)}x`)
      console.log(`  tokens saved:        ${savings.tokensSaved.toLocaleString()}`)
      console.log(`  bytes saved:         ${size} (${savings.bytesSaved.toLocaleString()} B)`)
      console.log(`  usd saved:           $${savings.usdSaved.toFixed(4)}  (@ $${savings.pricePerMTokens.toFixed(2)}/1M tokens)`)
      break
    }

    case 'benchmark': {
      const { spawn } = await import('node:child_process')
      const { fileURLToPath } = await import('node:url')
      const { dirname, join } = await import('node:path')
      // Locate benchmarks/run.mjs relative to this file. Works whether running
      // from dist/ or src/.
      const here = dirname(fileURLToPath(import.meta.url))
      const candidates = [
        join(here, '..', 'benchmarks', 'run.mjs'),
        join(here, '..', '..', 'benchmarks', 'run.mjs'),
      ]
      const { existsSync } = await import('node:fs')
      const runner = candidates.find(existsSync)
      if (!runner) {
        console.error('Error: benchmarks/run.mjs not found. Run from the pact-cc repo.')
        process.exit(1)
      }
      const passThrough = args.filter((_, i) => i > 0)
      const child = spawn('node', [runner, ...passThrough], { stdio: 'inherit' })
      child.on('exit', (code) => process.exit(code ?? 0))
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
      console.log('  savings    [--before file --after file] [--price 3.0] [--json]')
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
