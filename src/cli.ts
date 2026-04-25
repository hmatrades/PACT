import { readFileSync } from 'node:fs'
import { compress, decompress } from './compress.js'
import { installPACT, uninstallPACT, readState, computeSavings } from './install.js'
import { listSessions, readSession } from './session.js'
import { pack, unpack, inspectPack } from './pack.js'
import { installCompaction, uninstallCompaction, heuristicCompress } from './compaction.js'

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const cmd = args[0]

  switch (cmd) {
    case 'install': {
      if (args.includes('--global')) {
        const { hookPath, settingsPath } = installCompaction()
        console.log('')
        console.log('  PACT compaction installed globally')
        console.log(`  Hook:     ${hookPath}`)
        console.log(`  Settings: ${settingsPath}`)
        console.log('')
        console.log('  Every Claude Code session now auto-compresses at 50% context.')
        console.log('  Zero API calls. Heuristic extraction. Lossless.')
        console.log('')
        console.log('  Uninstall: pact install --global --remove')
        console.log('')
        break
      }
      if (args.includes('--remove') || args.includes('--global-remove')) {
        uninstallCompaction()
        console.log('  PACT global compaction removed.')
        break
      }
      const threshold = parseFloat(getFlag(args, '--threshold') ?? '0.80')
      const model = getFlag(args, '--model') ?? 'claude-haiku-4-5-20251001'
      const projectDir = process.cwd()
      const existing = readState(projectDir)
      if (existing.installed) {
        console.log('PACT already installed. Use "pact uninstall" first to reinstall.')
        break
      }
      await installPACT(projectDir, { threshold, model })
      console.log(`  PACT installed in ${projectDir}/.claude/settings.json`)
      console.log(`  Hook script written to ${projectDir}/.pact/hook.js`)
      console.log(`  Token compression activates at ${Math.round(threshold * 100)}% context usage.`)
      break
    }

    case 'uninstall': {
      if (args.includes('--global')) {
        uninstallCompaction()
        console.log('  PACT global compaction removed.')
        break
      }
      await uninstallPACT(process.cwd())
      console.log('  PACT hooks removed from this project.')
      break
    }

    case 'compact': {
      let text = args.filter(a => !a.startsWith('--') && a !== 'compact').join(' ')
      if (!text) {
        try { text = readFileSync('/dev/stdin', 'utf8') } catch { text = '' }
      }
      if (!text.trim()) {
        console.error('Usage: pact compact <text or stdin>')
        process.exit(1)
      }
      const jsonFlag = args.includes('--json')
      const result = heuristicCompress(text)
      if (jsonFlag) {
        process.stdout.write(JSON.stringify({ ok: true, ...result }) + '\n')
      } else {
        console.log('')
        console.log(`  COMPACTED  ${result.tokens.before} -> ${result.tokens.after} tokens  ${result.ratio.toFixed(1)}x`)
        console.log('')
        process.stdout.write(result.pact + '\n')
        console.log('')
      }
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

    case 'sessions': {
      const id = args[1]
      if (!id) {
        const ids = listSessions(process.cwd())
        if (ids.length === 0) {
          console.log('No sessions captured yet.')
        } else {
          ids.forEach((sid) => console.log(sid))
        }
        break
      }
      const session = readSession(process.cwd(), id)
      if (!session) {
        console.error(`Error: session '${id}' not found`)
        process.exit(1)
      }
      session.tags.forEach((tag) => console.log(`[${tag.type}] ${tag.content}`))
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

    case 'pack': {
      const target = args[1]
      if (!target) {
        console.error('Usage: pact pack <file|dir> [-o output.pact]')
        process.exit(1)
      }
      const outFlag = getFlag(args, '-o') ?? getFlag(args, '--out')
      const result = await pack(target, outFlag ?? undefined)
      const saved = result.originalSize - result.packedSize
      const pct = result.originalSize > 0 ? Math.round((saved / result.originalSize) * 100) : 0
      console.log('')
      if (result.mode === 'archive') {
        console.log(`  PACKED  ${result.entries} files  ${formatSize(result.originalSize)} -> ${formatSize(result.packedSize)}  ${result.ratio.toFixed(1)}x`)
      } else {
        console.log(`  PACKED  ${formatSize(result.originalSize)} -> ${formatSize(result.packedSize)}  ${result.ratio.toFixed(1)}x`)
      }
      if (saved > 0) {
        console.log(`  SAVED   ${formatSize(saved)} (${pct}%)`)
      }
      console.log(`  OUT     ${result.outputPath}`)
      console.log('')
      break
    }

    case 'unpack': {
      const target = args[1]
      if (!target) {
        console.error('Usage: pact unpack <file.pact> [-o output-path]')
        process.exit(1)
      }
      const outFlag = getFlag(args, '-o') ?? getFlag(args, '--out')
      const result = await unpack(target, outFlag ?? undefined)
      console.log('')
      console.log(`  RESTORED  ${formatSize(result.originalSize)}  from ${formatSize(result.packedSize)} ${result.mode}`)
      console.log(`  OUT       ${result.outputPath}`)
      console.log('')
      break
    }

    case 'inspect': {
      const target = args[1]
      if (!target) {
        console.error('Usage: pact inspect <file.pact>')
        process.exit(1)
      }
      const info = inspectPack(target)
      const saved = info.originalSize - info.compressedSize
      const pct = info.originalSize > 0 ? Math.round((saved / info.originalSize) * 100) : 0
      console.log('')
      console.log(`  PACT v${info.version}  ${info.mode}  ${info.ratio.toFixed(1)}x`)
      console.log(`  ${info.filename}  ${formatSize(info.originalSize)} -> ${formatSize(info.compressedSize)}${saved > 0 ? `  saved ${pct}%` : ''}`)
      if (info.summary) {
        console.log('')
        info.summary.split('\n').forEach(l => console.log(`  ${l}`))
      }
      if (info.entries) {
        const isSolid = info.entries.every(e => e.compressedSize === 0)
        console.log('')
        const maxName = Math.max(...info.entries.map(e => e.filename.length), 8)
        for (const entry of info.entries) {
          const tag = entry.mode === 'semantic' ? 'txt' : 'bin'
          const pad = ' '.repeat(Math.max(0, maxName - entry.filename.length))
          if (isSolid) {
            console.log(`  ${tag}  ${entry.filename}${pad}  ${padLeft(formatSize(entry.originalSize), 10)}`)
          } else {
            console.log(`  ${tag}  ${entry.filename}${pad}  ${padLeft(formatSize(entry.originalSize), 10)} -> ${padLeft(formatSize(entry.compressedSize), 10)}  ${entry.ratio.toFixed(1)}x`)
          }
        }
        console.log('')
        if (isSolid) {
          console.log(`  ${info.entries.length} files  ${formatSize(info.originalSize)} -> ${formatSize(info.compressedSize)} solid brotli  ${info.ratio.toFixed(1)}x`)
        } else {
          console.log(`  ${info.entries.length} files  ${formatSize(info.originalSize)} total  ${info.ratio.toFixed(1)}x compression`)
        }
      }
      console.log('')
      break
    }

    default: {
      console.log('')
      console.log('  PACT  semantic compression for files and agents')
      console.log('')
      console.log('  pact pack <file|dir> [-o out.pact]   compress file or folder')
      console.log('  pact unpack <file.pact> [-o path]    decompress')
      console.log('  pact inspect <file.pact>             view contents')
      console.log('')
      console.log('  pact install --global                auto-compact every Claude Code session')
      console.log('  pact install [--threshold 0-1]       hook into current project')
      console.log('  pact uninstall [--global]            remove hooks')
      console.log('  pact compact [text]                  compress context (heuristic, no API)')
      console.log('  pact status                          compression stats')
      console.log('  pact benchmark [--tasks N]           run benchmarks')
      console.log('')
    }
  }
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function padLeft(s: string, len: number): string {
  return s.length >= len ? s : ' '.repeat(len - s.length) + s
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
