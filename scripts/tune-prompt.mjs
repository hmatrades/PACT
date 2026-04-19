// Tune the PACT compression system prompt for maximum ratio.
// Tests 3 prompt variants against the BlackBox minimax-m2.5 endpoint,
// measures ratio + validity, picks the winner.

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { tokenize, runPACT } = require('../pact-engine.js')

const API_KEY = process.env.BLACKBOX_API_KEY || 'sk-aIpzf2pLLgH3O2R61GVvEw'
const MODEL = 'blackboxai/minimax/minimax-m2.5'
const BASE_URL = 'https://api.blackbox.ai/v1'

const TEST_INPUT = `Session turn 1: User asked me to refactor the entire authentication system from JWT localStorage to httpOnly cookies. I read src/auth/jwt.ts and found the token generation at line 45. I read src/middleware/auth.ts and found token validation at line 12. I read src/api/login.ts and found the login handler at line 78. I read src/api/logout.ts at line 23.

Session turn 2: I created src/utils/cookies.ts with setCookie, getCookie, deleteCookie utilities. 47 lines total. All cookie operations use httpOnly: true, secure: true, sameSite: strict.

Session turn 3: I started updating src/auth/jwt.ts. The generateToken function at line 45 previously returned the token string. I changed it to call setCookie(res, token) and return void. But the tests in src/auth/__tests__/jwt.test.ts at line 89 are failing because they expect the old return value of type string.

Session turn 4: I looked at the test file. The test at line 89 calls generateToken() and expects a string back. Since we changed the signature to return void, the test needs updating too. I need to update the test expectation from checking return value to checking that setCookie was called with the right arguments using a mock.

Session turn 5: I updated the test file. Now jwt.ts tests pass. Moving to src/middleware/auth.ts. The validateToken middleware at line 12 reads Authorization header to get the token. I need to change this to read from req.cookies.token instead.

Session turn 6: Updated auth middleware. It now reads from req.cookies.token. Need to make sure cookie-parser middleware is registered before auth middleware in src/app.ts. Found app.ts, cookie-parser is not installed. Need to add it.

Session turn 7: Ran npm install cookie-parser @types/cookie-parser. Updated src/app.ts to add app.use(cookieParser()) before the auth middleware registration at line 34.

Session turn 8: Updated src/api/login.ts. Login handler now calls generateToken(res, payload) which sets the cookie internally. Removed the res.json({ token }) call, replaced with res.json({ success: true }). Updated src/api/logout.ts to call deleteCookie(res, 'token') and return { success: true }.

Session turn 9: Running full test suite. 47 tests passing. 3 tests failing in src/api/__tests__/login.test.ts at lines 23, 45, 67 because they check for token in response body which we removed.

Session turn 10: Fixing login tests. Updated expectations to check for success: true instead of token in response body. All 50 tests now passing. Refactor complete.`

// ────────────────────────────────────────────────────────────────────
// PROMPT VARIANTS — each pushes for maximum terseness in a different way
// ────────────────────────────────────────────────────────────────────

const VARIANT_A_TERSE_CODES = `You are a PACT compressor. Output a PACT program — a terse session-state code, NOT a readable log.

PACT syntax:
- Variables: name = value
- Maps: { key: 'val' } (no quotes on keys)
- Arrays: ['a' 'b' 'c'] — SPACE-separated, NO commas inside arrays
- Strings: single-quoted only
- End with: . sjson(session)

MAXIMUM TERSENESS RULES — these are not suggestions:
1. Goal: kebab-code, 2-4 words MAX. 'jwt-to-cookies' NOT 'Refactor auth system from JWT to cookies'
2. File map values: short codes only — 'done', 'wip', 'todo', 'read', 'new'. Never objects with reads/writes counts.
3. Plan steps: 2-3 word kebab codes. 'read-auth-files' 'create-cookie-util' 'update-jwt'. Never full sentences.
4. Constraints: one code per rule. 'httponly-secure-strict' not 'All cookies must have httpOnly, secure, and sameSite flags'
5. Entities: minimal state only. { 'generateToken': 'void-returns-cookie' } not full descriptions.
6. Strip all prose. Strip line numbers unless load-bearing. Strip narrative.

Output ONE variable called session as a map with: goal, files, plan_done, plan_next, constraints, entities.
Then . sjson(session)

Output ONLY the PACT program. No markdown. No explanation. No backticks.`

const VARIANT_B_EXAMPLE_DRIVEN = `You are a PACT compressor. Compress agent session state into ultra-terse PACT code.

SYNTAX:
- name = value  (variables)
- { key: 'val' }  (maps, unquoted keys)
- ['a' 'b' 'c']  (arrays, SPACES not commas)
- 'string'  (single quotes only)
- End: . sjson(session)

EXAMPLE of the terseness level required:

session = {
  goal: 'jwt-to-cookies',
  files: {
    'src/auth/jwt.ts': 'done',
    'src/middleware/auth.ts': 'done',
    'src/api/login.ts': 'done',
    'src/utils/cookies.ts': 'new',
    'src/app.ts': 'done'
  },
  plan_done: ['read-auth' 'create-cookie-util' 'update-jwt' 'fix-jwt-tests'],
  plan_next: ['verify-all-tests'],
  constraints: ['httponly' 'secure' 'samesite-strict'],
  entities: { 'generateToken': 'void-sets-cookie', 'validateToken': 'reads-req-cookies-token' }
}
. sjson(session)

RULES:
- Goal: 2-4 word kebab code
- File values: single status strings ONLY ('done'/'wip'/'todo'/'new'/'read'). NEVER nested objects.
- Plan steps: 2-3 word kebab codes. NEVER sentences.
- Constraints: one kebab code per rule.
- Entities: 'name': 'short-state-code'. No prose.

Output ONLY the PACT program. No fences. No explanation.`

const VARIANT_C_MINIMAL_BUDGET = `PACT compressor. Output compressed session state as PACT code.

Syntax: name = value | maps { k: 'v' } unquoted keys | arrays ['a' 'b'] space-separated | strings 'single-quoted' | end with . sjson(session)

HARD LIMITS (treat as a token budget):
- goal: max 4 words, kebab-case
- each file value: single word status ('done' 'wip' 'todo' 'new' 'read')
- each plan step: max 3 words, kebab-case
- each constraint: max 3 words, kebab-case
- each entity value: max 5 words, kebab-case
- NO nested objects in files map, just string values
- NO full sentences ANYWHERE
- NO line numbers unless critical
- NO narrative, NO "I did X" phrasing

Emit:
session = { goal: ..., files: {...}, plan_done: [...], plan_next: [...], constraints: [...], entities: {...} }
. sjson(session)

Output ONLY the program. No markdown. No commentary.`

// ────────────────────────────────────────────────────────────────────
// Runner
// ────────────────────────────────────────────────────────────────────

async function callAPI(systemPrompt, userInput) {
  const resp = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput }
      ]
    })
  })
  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`API error ${resp.status}: ${body}`)
  }
  const data = await resp.json()
  return data.choices[0].message.content.trim()
}

function stripFences(s) {
  // Strip markdown fences if the model sneaks them in
  return s.replace(/^```(?:pact|javascript|js)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
}

function countTokens(s) {
  return tokenize(s).length
}

function validate(pact) {
  try {
    const { error } = runPACT(pact)
    return { valid: error === null, error }
  } catch (e) {
    return { valid: false, error: e.message }
  }
}

async function runVariant(name, prompt, input) {
  console.log(`\n═══ VARIANT ${name} ═══`)
  const raw = await callAPI(prompt, input)
  const pact = stripFences(raw)
  const inputTokens = countTokens(input)
  const outputTokens = countTokens(pact)
  const ratio = outputTokens === 0 ? 0 : inputTokens / outputTokens
  const v = validate(pact)
  console.log(`  input tokens: ${inputTokens}`)
  console.log(`  output tokens: ${outputTokens}`)
  console.log(`  ratio: ${ratio.toFixed(2)}x`)
  console.log(`  valid: ${v.valid}${v.error ? ` — ${v.error}` : ''}`)
  console.log(`  --- OUTPUT ---\n${pact}\n  --- END ---`)
  return { name, prompt, pact, inputTokens, outputTokens, ratio, valid: v.valid, error: v.error }
}

async function main() {
  const variants = [
    ['A_TERSE_CODES', VARIANT_A_TERSE_CODES],
    ['B_EXAMPLE_DRIVEN', VARIANT_B_EXAMPLE_DRIVEN],
    ['C_MINIMAL_BUDGET', VARIANT_C_MINIMAL_BUDGET]
  ]
  const results = []
  for (const [name, prompt] of variants) {
    try {
      results.push(await runVariant(name, prompt, TEST_INPUT))
    } catch (e) {
      console.log(`  FAILED: ${e.message}`)
      results.push({ name, prompt, error: e.message, valid: false, ratio: 0 })
    }
  }

  console.log('\n═══ FINAL RANKING ═══')
  const valid = results.filter(r => r.valid).sort((a, b) => b.ratio - a.ratio)
  const invalid = results.filter(r => !r.valid)
  for (const r of valid) console.log(`  VALID ${r.name}: ${r.ratio.toFixed(2)}x (in=${r.inputTokens} out=${r.outputTokens})`)
  for (const r of invalid) console.log(`  INVALID ${r.name}: ${r.error || 'n/a'}`)

  if (valid.length === 0) {
    console.log('\nNO VALID WINNER. Fallback to original prompt.')
    process.exit(1)
  }
  const winner = valid[0]
  console.log(`\nWINNER: ${winner.name} @ ${winner.ratio.toFixed(2)}x`)
  console.log('\n--- WINNING PROMPT ---')
  console.log(winner.prompt)
  console.log('\n--- WINNING OUTPUT ---')
  console.log(winner.pact)
}

main().catch(e => { console.error(e); process.exit(1) })
