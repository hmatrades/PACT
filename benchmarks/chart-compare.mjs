#!/usr/bin/env node
// benchmarks/chart-compare.mjs — grouped-bar chart of PACT vs baselines.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function latestCompare() {
  const dir = join(__dirname, 'results')
  const files = readdirSync(dir).filter(f => f.endsWith('-compare.json')).sort()
  return join(dir, files[files.length - 1])
}

function main() {
  const data = JSON.parse(readFileSync(latestCompare(), 'utf8'))
  const strategies = ['sliding-5', 'summarization', 'obs-log', 'pact']
  const colors = { 'sliding-5': '#f85149', 'summarization': '#d29922', 'obs-log': '#58a6ff', 'pact': '#3fb950' }
  const labels = {
    'sliding-5': 'sliding-5 (lossy)',
    'summarization': 'summary (lossy)',
    'obs-log': 'obs-log / claude-mem (lossy)',
    'pact': 'PACT (lossless structural)',
  }

  const W = 960, H = 560
  const pad = { top: 72, right: 40, bottom: 140, left: 80 }
  const chartW = W - pad.left - pad.right
  const chartH = H - pad.top - pad.bottom

  const tasks = Object.keys(data.strategies.pact.perTask)
  const groupW = chartW / tasks.length
  const barW = groupW / (strategies.length + 1) * 0.9

  const maxRatio = Math.max(
    ...tasks.flatMap(t => strategies.map(s => data.strategies[s].perTask[t].ratio))
  ) * 1.1

  const svg = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="ui-monospace, Menlo, monospace">`]
  svg.push(`<rect width="${W}" height="${H}" fill="#0d1117"/>`)
  svg.push(`<text x="${pad.left}" y="32" fill="#f0f6fc" font-size="18" font-weight="700">PACT vs semantic-memory baselines</text>`)
  svg.push(`<text x="${pad.left}" y="52" fill="#8b949e" font-size="12">11 tasks · compression ratio vs baseline · higher is better — but lossy strategies don't preserve structure</text>`)

  // Y gridlines
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + (chartH / 5) * i
    const v = maxRatio - (maxRatio / 5) * i
    svg.push(`<line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" stroke="#21262d"/>`)
    svg.push(`<text x="${pad.left - 8}" y="${y + 4}" fill="#8b949e" font-size="10" text-anchor="end">${v.toFixed(1)}x</text>`)
  }

  // Grouped bars
  tasks.forEach((taskId, ti) => {
    const groupX = pad.left + ti * groupW
    strategies.forEach((s, si) => {
      const r = data.strategies[s].perTask[taskId].ratio
      const h = (r / maxRatio) * chartH
      const x = groupX + si * barW + (groupW - barW * strategies.length) / 2
      const y = pad.top + chartH - h
      svg.push(`<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="${colors[s]}" opacity="0.85"/>`)
    })
    const label = taskId.replace(/^\d+-/, '').slice(0, 18)
    const cx = groupX + groupW / 2
    svg.push(`<text x="${cx}" y="${pad.top + chartH + 14}" fill="#8b949e" font-size="10" text-anchor="end" transform="rotate(-40, ${cx}, ${pad.top + chartH + 14})">${label}</text>`)
  })

  // Legend
  const legendY = H - 44
  let lx = pad.left
  strategies.forEach((s) => {
    svg.push(`<rect x="${lx}" y="${legendY}" width="12" height="12" fill="${colors[s]}"/>`)
    svg.push(`<text x="${lx + 18}" y="${legendY + 10}" fill="#f0f6fc" font-size="11">${labels[s]}</text>`)
    lx += 200
  })

  // Totals annotation
  const totals = strategies.map(s => `${s}: ${data.strategies[s].ratio.toFixed(2)}x`).join('   ·   ')
  svg.push(`<text x="${pad.left}" y="${H - 20}" fill="#8b949e" font-size="11">total ratios across all 11 tasks — ${totals}</text>`)

  // Axes
  svg.push(`<line x1="${pad.left}" y1="${pad.top + chartH}" x2="${W - pad.right}" y2="${pad.top + chartH}" stroke="#8b949e"/>`)
  svg.push(`<line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + chartH}" stroke="#8b949e"/>`)

  svg.push('</svg>')
  const out = join(__dirname, 'results', 'chart-compare.svg')
  writeFileSync(out, svg.join('\n'))
  console.log(`Comparison chart written to ${out}`)
}

main()
