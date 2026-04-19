#!/usr/bin/env node
// benchmarks/chart-scaling.mjs — plots ratio vs turn count to visualize the
// O(N²) baseline vs O(N) PACT scaling story. Reads latest results, writes
// benchmarks/results/chart-scaling.svg.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function latest() {
  const dir = join(__dirname, 'results')
  const files = readdirSync(dir).filter(f => f.endsWith('.json') && !f.includes('chart')).sort()
  return join(dir, files[files.length - 1])
}

function render(results) {
  const W = 960
  const H = 480
  const pad = { top: 72, right: 40, bottom: 80, left: 80 }
  const chartW = W - pad.left - pad.right
  const chartH = H - pad.top - pad.bottom

  const pts = results.map(r => ({ x: r.turns, y: r.ratio, id: r.task_id }))
  const maxX = Math.max(...pts.map(p => p.x), 50) * 1.05
  const maxY = Math.max(...pts.map(p => p.y), 5) * 1.15

  const xToPx = (x) => pad.left + (x / maxX) * chartW
  const yToPx = (y) => pad.top + chartH - (y / maxY) * chartH

  const svg = []
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="ui-monospace, SF Mono, Menlo, monospace">`)
  svg.push(`<rect width="${W}" height="${H}" fill="#0d1117"/>`)
  svg.push(`<text x="${pad.left}" y="32" fill="#f0f6fc" font-size="18" font-weight="700">PACT compression scales with session length</text>`)
  svg.push(`<text x="${pad.left}" y="52" fill="#8b949e" font-size="12">ratio vs turn count · baseline is O(N²) per-turn sum, PACT is O(N) — the gap widens</text>`)

  // Gridlines
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + (chartH / 5) * i
    svg.push(`<line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" stroke="#21262d"/>`)
    const v = maxY - (maxY / 5) * i
    svg.push(`<text x="${pad.left - 10}" y="${y + 4}" fill="#8b949e" font-size="10" text-anchor="end">${v.toFixed(1)}x</text>`)
  }
  for (let i = 0; i <= 5; i++) {
    const x = pad.left + (chartW / 5) * i
    const v = (maxX / 5) * i
    svg.push(`<text x="${x}" y="${pad.top + chartH + 20}" fill="#8b949e" font-size="10" text-anchor="middle">${Math.round(v)}</text>`)
  }

  // Theoretical O(N) / O(N²) curve. Ratio(N) ≈ N * (avg_turn_size / compressed_size) * 0.5
  // Fit a simple linear model from the data's best long-session ratio.
  const longest = pts.reduce((a, b) => (a.x > b.x ? a : b))
  const slope = longest.y / longest.x
  const curve = []
  for (let n = 0; n <= maxX; n += 2) {
    const yTheory = slope * n
    curve.push(`${xToPx(n)},${yToPx(yTheory)}`)
  }
  svg.push(`<polyline points="${curve.join(' ')}" fill="none" stroke="#d29922" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.7"/>`)
  svg.push(`<text x="${xToPx(maxX * 0.72)}" y="${yToPx(slope * maxX * 0.72) - 8}" fill="#d29922" font-size="11" font-weight="600">linear fit · ratio = ${slope.toFixed(3)} × turns</text>`)

  // Points
  for (const p of pts) {
    const cx = xToPx(p.x)
    const cy = yToPx(p.y)
    const isLong = p.x >= 40
    svg.push(`<circle cx="${cx}" cy="${cy}" r="${isLong ? 6 : 4}" fill="${isLong ? '#3fb950' : '#58a6ff'}" stroke="#0d1117" stroke-width="1.5"/>`)
    if (isLong) {
      svg.push(`<text x="${cx - 10}" y="${cy - 10}" fill="#3fb950" font-size="11" font-weight="600" text-anchor="end">${p.y.toFixed(1)}x @ ${p.x} turns</text>`)
    }
  }

  // Axes
  svg.push(`<line x1="${pad.left}" y1="${pad.top + chartH}" x2="${W - pad.right}" y2="${pad.top + chartH}" stroke="#8b949e"/>`)
  svg.push(`<line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + chartH}" stroke="#8b949e"/>`)
  svg.push(`<text x="${pad.left + chartW / 2}" y="${H - 20}" fill="#8b949e" font-size="11" text-anchor="middle">turns per session</text>`)
  svg.push(`<text x="24" y="${pad.top + chartH / 2}" fill="#8b949e" font-size="11" text-anchor="middle" transform="rotate(-90, 24, ${pad.top + chartH / 2})">compression ratio</text>`)

  // Extrapolation note
  const extrapTurn = 200
  const extrapRatio = slope * extrapTurn
  svg.push(`<text x="${W - pad.right}" y="${pad.top + 14}" fill="#8b949e" font-size="11" text-anchor="end">projected @ ${extrapTurn} turns: ~${extrapRatio.toFixed(0)}x</text>`)

  svg.push('</svg>')
  return svg.join('\n')
}

function main() {
  const file = process.argv[2] ?? latest()
  const data = JSON.parse(readFileSync(file, 'utf8'))
  const out = join(__dirname, 'results', 'chart-scaling.svg')
  writeFileSync(out, render(data.results))
  console.log(`Scaling chart written to ${out}`)
}

main()
