#!/usr/bin/env node
// benchmarks/chart.mjs — render an SVG bar chart from a results JSON file.
// Usage: node benchmarks/chart.mjs [results-file] [--out path.svg]
// Defaults: latest file in benchmarks/results/, output to benchmarks/results/chart.svg.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function latestResultsFile() {
  const dir = join(__dirname, 'results')
  const files = readdirSync(dir).filter(f => f.endsWith('.json') && !f.includes('chart')).sort()
  if (!files.length) throw new Error('No results files found. Run `node benchmarks/run.mjs` first.')
  return join(dir, files[files.length - 1])
}

function getFlag(argv, name, def) {
  const i = argv.indexOf(name)
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def
}

function escapeSvg(s) {
  return String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]))
}

function render(data, title) {
  const W = 960
  const H = 540
  const pad = { top: 64, right: 40, bottom: 120, left: 80 }
  const chartW = W - pad.left - pad.right
  const chartH = H - pad.top - pad.bottom

  const maxRatio = Math.max(...data.results.map(r => r.ratio), 4)
  const yMax = Math.ceil(maxRatio * 1.15)
  const barW = chartW / data.results.length * 0.72
  const barGap = chartW / data.results.length

  const bg = '#0d1117'
  const fg = '#f0f6fc'
  const dim = '#8b949e'
  const grid = '#21262d'
  const accent = '#3fb950'
  const amber = '#d29922'

  const svg = []
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="ui-monospace, SF Mono, Menlo, monospace">`)
  svg.push(`<rect width="${W}" height="${H}" fill="${bg}"/>`)

  // Title
  svg.push(`<text x="${pad.left}" y="32" fill="${fg}" font-size="18" font-weight="700">${escapeSvg(title)}</text>`)
  svg.push(`<text x="${pad.left}" y="52" fill="${dim}" font-size="12">token reduction ratio (baseline / pact), per task</text>`)

  // Y-axis gridlines
  for (let y = 0; y <= 5; y++) {
    const v = (yMax / 5) * y
    const py = pad.top + chartH - (v / yMax) * chartH
    svg.push(`<line x1="${pad.left}" y1="${py}" x2="${W - pad.right}" y2="${py}" stroke="${grid}" stroke-width="1"/>`)
    svg.push(`<text x="${pad.left - 10}" y="${py + 4}" fill="${dim}" font-size="10" text-anchor="end">${v.toFixed(1)}x</text>`)
  }

  // Bars
  data.results.forEach((r, i) => {
    const x = pad.left + i * barGap + (barGap - barW) / 2
    const h = (r.ratio / yMax) * chartH
    const y = pad.top + chartH - h
    const color = r.ratio >= 4 ? accent : r.ratio >= 2 ? amber : '#f85149'
    svg.push(`<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="${color}" opacity="0.82"/>`)
    svg.push(`<text x="${x + barW / 2}" y="${y - 6}" fill="${fg}" font-size="11" text-anchor="middle" font-weight="600">${r.ratio.toFixed(1)}x</text>`)
    const label = r.task_id.replace(/^\d+-/, '')
    svg.push(`<text x="${x + barW / 2}" y="${pad.top + chartH + 16}" fill="${dim}" font-size="10" text-anchor="end" transform="rotate(-40, ${x + barW / 2}, ${pad.top + chartH + 16})">${escapeSvg(label)}</text>`)
  })

  // Axes
  svg.push(`<line x1="${pad.left}" y1="${pad.top + chartH}" x2="${W - pad.right}" y2="${pad.top + chartH}" stroke="${dim}" stroke-width="1"/>`)
  svg.push(`<line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + chartH}" stroke="${dim}" stroke-width="1"/>`)

  // Footer summary
  const total = data.summary
  const footerY = H - 28
  svg.push(`<text x="${pad.left}" y="${footerY}" fill="${dim}" font-size="11">mode: ${escapeSvg(data.mode)}  ·  tasks: ${data.results.length}  ·  avg: ${total.avgRatio.toFixed(1)}x  ·  total: ${total.totalRatio.toFixed(1)}x  (${total.totalBaseline.toLocaleString()} → ${total.totalPact.toLocaleString()} tokens)  ·  completion delta: ${total.delta.toFixed(1)}pp</text>`)

  svg.push(`</svg>`)
  return svg.join('\n')
}

function main() {
  const argv = process.argv.slice(2)
  const resultsFile = argv.find(a => !a.startsWith('--') && a.endsWith('.json')) ?? latestResultsFile()
  const out = getFlag(argv, '--out', join(__dirname, 'results', 'chart.svg'))

  const data = JSON.parse(readFileSync(resultsFile, 'utf8'))
  const title = `PACT benchmark · ${data.date} · ${data.mode}`
  const svg = render(data, title)
  writeFileSync(out, svg)
  console.log(`Chart written to ${out}`)
  console.log(`  ${data.results.length} tasks, avg ${data.summary.avgRatio.toFixed(1)}x, total ${data.summary.totalRatio.toFixed(1)}x`)
}

main()
