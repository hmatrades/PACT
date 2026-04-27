---
description: Expand a PACT blob back to natural-language context — pure Claude Code, no npm, Opus 4.7 directly
argument-hint: <path-to-.pact-file or inline blob>
---

You are running pure-Claude-Code PACT rehydration. **You** — the Opus 4.7 model in this session — do the expansion directly. No external tool, no API call.

## Mode

- If `$ARGUMENTS` is empty → ask the user for a path or blob, then stop.
- If `$ARGUMENTS` starts with `session =` (literal text, possibly with leading whitespace) → treat as an inline PACT blob.
- Otherwise → treat `$ARGUMENTS` as a path and use the **Read tool** on it. If Read fails, ask the user whether they meant to paste a blob inline.

`~`-prefixed paths are fine; Read resolves them.

## Expansion

Parse the `session = { ... }` structure. Expand each field to a short natural-language paragraph. Don't quote the blob back — turn it into prose:

- **`goal`** → `We were working on <goal-rendered-as-words>.`
- **`files`** → `Files in scope:` followed by a bullet list, one per file, format: `` - `<path>` — <status> ``. Translate status codes: `done` → "complete", `wip` → "in progress", `read` → "read-only reference", `todo` → "not started yet", `new` → "newly created".
- **`plan_done`** → `Already shipped: ` followed by a comma-separated list of the steps rendered as words (kebab → spaces).
- **`plan_next`** → `Next up: ` followed by a comma-separated list, same rendering.
- **`constraints`** → `Constraints: ` followed by a comma-separated list, kebab → spaces.
- **`entities`** → `Key symbols:` followed by a bullet list, format: `` - `<name>` — <code-rendered-as-words> ``. If the code is `def` translate to "defined"; if `wip` translate to "in progress".

Skip any field whose array/object is empty or absent. If the blob is malformed (no `session = {` opener or no closing `}`), say so to the user and stop instead of guessing.

## Steps

1. Get the blob (Read or inline).
2. Print a single line: `Rehydrating PACT blob:` then a blank line.
3. Print each field's expanded section using markdown headers (`### Goal`, `### Files`, `### Done`, `### Next`, `### Constraints`, `### Entities`) only for sections that exist.
4. Final line: `PACT context restored — ready for your next request.`

The expanded prose is now in your context. From here, treat that context as if you had been in the original session: when the user asks a follow-up, draw on the rehydrated state.
