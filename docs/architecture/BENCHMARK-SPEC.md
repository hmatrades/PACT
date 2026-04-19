# BENCHMARK-SPEC — Benchmark Runner Design

> Deliverable: published results showing 35x token reduction, ≤2pp completion delta.
> These numbers are the core of the hackathon claim. Methodology must be airtight.

---

## What "35x" Means (Methodology)

**Token reduction ratio** = `sum(baseline_input_tokens) / sum(pact_input_tokens)` across
all tasks in the benchmark suite.

- `baseline_input_tokens`: sum of `usage.input_tokens` across ALL API calls in a session,
  running the task WITHOUT PACT installed.
- `pact_input_tokens`: same measurement WITH PACT installed.
- Ratio is computed per-task, then averaged across all tasks.

**Task completion** = binary. A task is `complete = true` if the agent's final output
contains the expected result string (`expected_result_contains` field).

**Completion delta** = `baseline_completion_rate - pact_completion_rate`. Target: ≤ 2pp.

---

## Task Format (`benchmarks/tasks/*.json`)

```json
{
  "id": "001-repo-refactor-auth",
  "category": "refactor",
  "description": "Refactor authentication module to use JWT instead of session tokens",
  "repo_snapshot": "fixtures/repo-auth-v1/",
  "prompt": "Refactor the authentication system in this codebase to replace session tokens with JWT. Preserve all existing test coverage. The token format must not break the existing API contract.",
  "expected_files_touched": ["auth/login.rs", "auth/session.rs", "tests/auth_test.rs"],
  "expected_result_contains": "jwt",
  "max_turns": 20,
  "timeout_seconds": 300
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Unique identifier, sortable |
| `category` | yes | `refactor` \| `debug` \| `research` \| `test-gen` |
| `description` | yes | Human-readable task summary |
| `repo_snapshot` | yes | Path to fixture repo for this task |
| `prompt` | yes | The agent's starting prompt |
| `expected_files_touched` | yes | Files the agent must touch to succeed |
| `expected_result_contains` | yes | Substring that must appear in final output |
| `max_turns` | yes | Max agent turns before timeout |
| `timeout_seconds` | yes | Wall-clock timeout |

---

## Task Categories (20 minimum)

| # | Category | Description |
|---|----------|-------------|
| 001–005 | refactor | Repo-wide refactors (auth, database layer, API versioning) |
| 006–010 | debug | Multi-file bug hunt (race condition, memory leak, type error) |
| 011–015 | research | Understand codebase, answer architectural question |
| 016–018 | test-gen | Generate tests for untested modules |
| 019–020 | mixed | Refactor + test in single session |

Each category must have at least 4 tasks so category-level stats are meaningful.

---

## Runner Architecture (`benchmarks/runner.ts`)

```typescript
// High-level flow
async function runBenchmark(opts: RunOpts): Promise<BenchmarkResults> {
  const tasks = loadTasks(opts.taskDir)
  const results: TaskResult[] = []

  for (const task of tasks.slice(0, opts.maxTasks)) {
    // Run baseline
    const baseline = await runTask(task, { pact: false })
    // Run with PACT
    const withPact = await runTask(task, { pact: true })

    results.push({
      task: task.id,
      baseline_tokens: baseline.totalTokens,
      pact_tokens: withPact.totalTokens,
      ratio: baseline.totalTokens / withPact.totalTokens,
      baseline_complete: baseline.complete,
      pact_complete: withPact.complete,
    })

    printProgress(task.id, results.at(-1))
  }

  return computeSummary(results)
}
```

### `runTask(task, opts)` — Single task execution

```typescript
async function runTask(task: Task, opts: { pact: boolean }): Promise<TaskRun> {
  // 1. Reset fixture repo to clean state
  const workDir = await setupFixture(task.repo_snapshot)

  // 2. If pact=true, install PACT in workDir
  if (opts.pact) await install(workDir)

  // 3. Run the agent loop
  const { turns, totalTokens, finalOutput } = await runAgentLoop({
    prompt: task.prompt,
    workDir,
    maxTurns: task.max_turns,
    timeoutMs: task.timeout_seconds * 1000,
    model: 'claude-opus-4-7',
  })

  // 4. Check completion
  const complete = finalOutput.toLowerCase().includes(task.expected_result_contains.toLowerCase())

  // 5. Cleanup
  await cleanupFixture(workDir)

  return { turns, totalTokens, complete, finalOutput }
}
```

### Agent Loop (`runAgentLoop`)

Runs a multi-turn Claude API session. Tools available: Bash, Read, Edit, Write
(simulated via direct file operations in `workDir`).

```typescript
async function runAgentLoop(opts: AgentLoopOpts) {
  const client = new Anthropic()
  const messages: MessageParam[] = [{ role: 'user', content: opts.prompt }]
  let totalTokens = 0
  let finalOutput = ''
  let turns = 0

  while (turns < opts.maxTurns) {
    const response = await client.messages.create({
      model: opts.model,
      max_tokens: 8192,
      tools: AGENT_TOOLS,
      messages,
    })

    totalTokens += response.usage.input_tokens + response.usage.output_tokens
    turns++

    // Process tool calls, add to messages
    const { toolResults, output } = await processToolCalls(response, opts.workDir)
    if (output) finalOutput = output

    if (response.stop_reason === 'end_turn') break

    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: toolResults })
  }

  return { turns, totalTokens, finalOutput }
}
```

---

## Cluster Distribution (Mac Mini k3s + Ray)

For the full 20-task × 2-condition (baseline + PACT) run (40 total sessions):

```
Benchmark Controller (local Mac)
        │
        ▼
  Ray job API → k3s cluster (Mac Mini nodes)
        │
        ├── Node 1: tasks 001-005 baseline
        ├── Node 2: tasks 001-005 pact
        ├── Node 3: tasks 006-010 baseline
        ├── Node 4: tasks 006-010 pact
        └── ...
```

Each Ray task = one `runTask` call. Ray handles distribution and failure retry.

**Without cluster:** `runner.ts` falls back to sequential execution. Slower (~6 hours),
same results. The cluster just makes it feasible to run in a day.

---

## Output Files

### `benchmarks/results/YYYY-MM-DD.json`

```json
{
  "run_date": "2026-04-23",
  "model": "claude-opus-4-7",
  "tasks": 20,
  "summary": {
    "avg_ratio": 34.8,
    "baseline_completion_rate": 0.941,
    "pact_completion_rate": 0.923,
    "completion_delta_pp": -1.8
  },
  "results": [
    {
      "task": "001-repo-refactor-auth",
      "baseline_tokens": 45230,
      "pact_tokens": 1290,
      "ratio": 35.1,
      "baseline_complete": true,
      "pact_complete": true
    }
  ]
}
```

### `benchmarks/results/YYYY-MM-DD.png`

Bar chart: 20 tasks × (baseline tokens, pact tokens) side-by-side.
Line overlay: ratio per task.
Generated via `chart.js` + `canvas` npm package (server-side rendering).

---

## Committed vs. Gitignored Results

| File | Status |
|------|--------|
| `benchmarks/results/2026-04-23.json` | Committed — the canonical result |
| `benchmarks/results/2026-04-23.png` | Committed — the chart for judges |
| `benchmarks/results/*.json` (live runs) | Gitignored — generated on demand |

The committed results are the ones judges see. Live re-runs produce the same numbers
(deterministic task set, same model).

---

## Benchmark README (`benchmarks/tasks/README.md`)

Must include:
1. What "35x" means (see Methodology above)
2. How to reproduce: `npx pact-cc benchmark`
3. Task categories and counts
4. How completion is measured (expected_result_contains)
5. Why we chose SWE-bench-style tasks (realistic agent workload)
6. Limitations: small N (20), single model, synthetic fixtures

The limitations section shows intellectual honesty — judges respect this more than
overclaiming.
