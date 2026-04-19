# ENGINE-API — pact-engine.js Reference

> **Immutable.** `pact-engine.js` is frozen for the hackathon submission. Never modify it.
> All compression/rehydration logic wraps this file; nothing patches it.

---

## What it is

PACT is a compact scripting language. `pact-engine.js` is a self-contained interpreter:
tokenizer → parser → evaluator. No dependencies. 35 KB. Runs in Node, browser, or CJS.

The **compression insight**: agent context encoded as PACT programs is ~35x smaller than
natural-language equivalents because PACT syntax strips connective tissue — only
relationships and state remain.

---

## Exports

```js
// ESM
import { runPACT, tokenize, parse, interpret, runPACTInternal, TOKEN, PACT } from './pact-engine.js'

// CJS
const { runPACT, runPACTInternal, tokenize, parse, interpret, TOKEN, PACT } = require('./pact-engine.js')

// Browser global
PACT.run(code)
```

---

## Primary API

### `runPACT(code: string) → { output: any[], result: any, error: string | null }`

Full round-trip: tokenize → parse → interpret. The main entry point.

| Field | Type | Description |
|-------|------|-------------|
| `output` | `any[]` | Values printed with `.` (dot) statement |
| `result` | `any` | Return value of the last evaluated expression |
| `error` | `string \| null` | Error message if parse/eval failed, else `null` |

```js
import { runPACT } from './pact-engine.js'

const { output, result, error } = runPACT(`. 'hello'`)
// output: ['hello'], result: 'hello', error: null

const { error } = runPACT(`bad syntax >>>`)
// error: "Line 1: Unexpected token ..."
```

**Error contract:** `runPACT` never throws. Errors surface as `{ error: "message" }`.
`output` is always an array (may be empty). `result` is `null` on error.

---

### `runPACTInternal(code, parentScope, outputArray) → { result, error }`

Like `runPACT` but accepts an external scope and output array. Used for multi-step
execution where state must persist across calls (e.g. a session compressor that
accumulates entity state across hook invocations).

```js
const scope = { session_id: 'abc', files_touched: [] }
const out = []
const { result } = runPACTInternal(`files_touched = push(files_touched, 'auth/login.rs')`, scope, out)
// scope.files_touched is now ['auth/login.rs'] — scope is mutated in place
```

---

### `tokenize(src: string) → Token[]`

Returns the token stream. Useful for token counting without full evaluation.

```js
const tokens = tokenize(`plan(auth) steps: [read, write]`)
console.log(tokens.length) // token count — proxy for PACT "density"
```

**Token shape:** `{ type: string, value?: any, line: number }`

---

### `parse(tokens: Token[]) → AST`

Returns the AST root (`{ type: "Program", body: Statement[] }`).
Only needed if you're doing AST-level inspection. Most callers use `runPACT` instead.

---

### `interpret(ast, env: object, output: any[]) → any`

Evaluates an AST with the given environment. `env` is the initial scope (variables).
`output` is appended to when `.` (print) statements execute.

---

### `TOKEN` — token type constants

```js
TOKEN.NUM      // number literal
TOKEN.STR      // string literal
TOKEN.ID       // identifier
TOKEN.OP       // operator (+ - * / % ^)
TOKEN.ASSIGN   // =
TOKEN.ARROW    // => (fat arrow / lambda)
TOKEN.THINARROW // -> (pipe-style transform in PACT idioms)
TOKEN.PIPE     // | (pipe operator)
TOKEN.SPREAD   // .. (range)
// ... full list in pact-engine.js lines 20-29
```

---

## PACT Language — Agent Encoding Patterns

These are the patterns the compression layer uses. Claude writes PACT; the engine validates it.

### Plan encoding

```pact
plan = {
  target: 'auth module',
  steps: [
    'read auth/login.rs -> extract token_validation',
    'read auth/session.rs -> depends_on token_format',
    'read tests/auth_test.rs -> constraint coverage',
    'propose refactor preserving coverage'
  ]
}
. sjson(plan)
```

Natural language equivalent: ~180 tokens. PACT: ~35 tokens. **5x reduction on one fragment.**

### File reference graph

```pact
refs = {
  'auth/login.rs': { status: 'read', extracts: ['token_validation'] },
  'auth/session.rs': { status: 'pending', depends: ['token_format'] },
  'tests/auth_test.rs': { status: 'pending', role: 'constraint' }
}
. sjson(refs)
```

### Entity state with deltas

```pact
entity = { name: 'UserAuth', state: 'refactoring', changes: 3 }
delta = { step: 3, action: 'removed_session_store', reason: 'compliance' }
. sjson(merge(entity, { latest: delta }))
```

### Execution history (compressed)

```pact
history = [
  { t: 1, op: 'read', path: 'auth/login.rs', ok: true },
  { t: 2, op: 'read', path: 'auth/session.rs', ok: true },
  { t: 3, op: 'write', path: 'auth/login.rs', ok: true, lines: 42 }
]
summary = { ops: len(history), ok: count(history, fn x: x.ok), files: uniq(history | map(fn x: x.path)) }
. sjson(summary)
```

### Full session state (35x compression example)

A 4-hour agent session (~180K natural-language tokens) compresses to ~5K PACT tokens:

```pact
session = {
  goal: 'refactor auth module for compliance',
  files: {
    'auth/login.rs': { reads: 3, writes: 1, state: 'done' },
    'auth/session.rs': { reads: 2, writes: 2, state: 'in_progress' },
    'tests/auth_test.rs': { reads: 1, writes: 0, state: 'pending' }
  },
  plan_done: ['read login', 'read session'],
  plan_next: ['write session', 'run tests'],
  constraints: ['preserve test coverage', 'no breaking API changes'],
  entities: {
    'UserAuth': { version: 2, breaking: false },
    'SessionToken': { version: 1, breaking: true, pending_fix: true }
  }
}
. sjson(session)
```

---

## Integration Patterns

### Pattern 1: Compress and measure

```js
import { runPACT, tokenize } from './pact-engine.js'

function compressAndMeasure(naturalLanguageContext, pactCode) {
  const { output, error } = runPACT(pactCode)
  if (error) return null
  const nlTokens = tokenize(naturalLanguageContext).length
  const pactTokens = tokenize(pactCode).length
  return { compressed: output[0], ratio: nlTokens / pactTokens }
}
```

### Pattern 2: Validate PACT before storing

```js
import { runPACT } from './pact-engine.js'

function validatePACT(code) {
  const { error } = runPACT(code)
  return error === null
}
```

### Pattern 3: Persistent scope across hook calls

```js
import { runPACTInternal } from './pact-engine.js'

const sessionScope = {}
const sessionOutput = []

// Called once per tool use to accumulate state
function accumulateState(pactSnippet) {
  return runPACTInternal(pactSnippet, sessionScope, sessionOutput)
}
```

---

## Builtins Reference (compression-relevant subset)

| Builtin | Signature | Use in compression |
|---------|-----------|-------------------|
| `sjson` | `sjson(val, indent?)` | Serialize state to JSON string for storage |
| `json` | `json(str)` | Deserialize stored state |
| `merge` | `merge(a, b)` | Merge entity state objects |
| `len` | `len(val)` | Count files, steps, entities |
| `uniq` | `uniq(arr)` | Deduplicate file references |
| `keys` | `keys(obj)` | Extract entity names |
| `has` | `has(coll, val)` | Check if file already tracked |
| `push` | `push(arr, val)` | Append to history |
| `count` | `count(arr, fn)` | Count completed steps |

Full builtins: `pact-engine.js` lines 506–576.

---

## Error Handling Contract

1. `runPACT` and `runPACTInternal` **never throw**. Catch the `error` field.
2. If `error` is non-null, `output` may be partial. Don't use partial output.
3. Parse errors include line numbers: `"Line 3: Expected RPAREN, got NEWLINE"`.
4. Unknown identifier errors: `"'foo' is not a function"`.
5. The compression layer must validate every PACT snippet before storing it.
   If validation fails, keep the original natural-language context (never drop context).
