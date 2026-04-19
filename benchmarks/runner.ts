// benchmarks/runner.ts — TypeScript types for the PACT benchmark runner.
// The actual runnable implementation lives in run.mjs (no build step).
// This file exists so downstream consumers (and editors) get type hints.
//
// Run with: node benchmarks/run.mjs

export interface BenchmarkTask {
  id: string
  category: 'refactor' | 'debug' | 'research' | 'test-gen' | 'mixed'
  description: string
  system_context: string
  turns: string[]
  expected_contains: string
  max_turns: number
}

export interface BenchmarkResult {
  task_id: string
  category: string
  baseline_tokens: number
  pact_tokens: number
  ratio: number
  baseline_completed: boolean
  pact_completed: boolean
  compressions: number
}

export interface BenchmarkSummary {
  date: string
  summary: {
    avgRatio: number
    baselineRate: number
    pactRate: number
    delta: number
  }
  results: BenchmarkResult[]
}

// Run with: node benchmarks/run.mjs
export async function loadTasks(_tasksDir: string): Promise<BenchmarkTask[]> {
  throw new Error('use run.mjs directly')
}
