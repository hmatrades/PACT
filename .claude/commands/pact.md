---
description: Compress current session (or a file) into PACT syntax — pure Claude Code, no npm, Opus 4.7 self-compresses
argument-hint: [optional file path]
---

You are running pure-Claude-Code PACT compression. **No npm install, no `pact-cc` CLI, no Haiku call, no extra API request.** You — the Opus 4.7 model already running this Claude Code session — do the structured extraction directly, because the conversation is already in your context.

This is the zero-install path. The npm `pact-cc` package routes compression through Haiku via a `PreToolUse` hook; this slash command collapses that into a single in-session invocation. Same canonical PACT syntax (`src/compress.ts:65-89`), no second API call.

## Mode

- If `$ARGUMENTS` is empty → compress the **current conversation**: the goal, files you've touched, plan steps done and next, constraints, key entities.
- If `$ARGUMENTS` is a path → use the **Read tool** on that path, then compress its contents.

## Schema (emit exactly this shape)

```
session = {
 goal: '<2-4 kebab-case words>'
 files: { '<path>': '<status>' '<path>': '<status>' }
 plan_done: ['<step>' '<step>']
 plan_next: ['<step>' '<step>']
 constraints: ['<code>' '<code>']
 entities: { '<name>': '<code>' '<name>': '<code>' }
}
. sjson(session)
```

**Format details (must match `src/compress.ts:65-89` byte-for-byte):**
- Single-space indent (one space before each key inside the braces, not two).
- Object literals: `{ 'key': 'value' 'key': 'value' }` — both keys and values single-quoted, entries separated by a single space (no commas).
- Array literals: `['item' 'item']` — items single-quoted, separated by a single space (no commas).
- Single quotes inside any value escape as `\'`.

**Field rules:**
- `goal`: 2–4 kebab-case words.
- `files`: paths as keys, status one of `new | done | wip | read | todo`.
- `plan_done` / `plan_next`: kebab-case step names.
- `constraints`: short kebab-case codes (e.g. `'no-breaking-changes'`, `'httponly'`).
- `entities`: load-bearing functions / symbols / concepts. Names preserve original identifier casing. Codes are `'def'`, `'wip'`, or short kebab-case descriptors like `'void-sets-cookie'`.

**Caps (drop the least important to stay under):**
- ≤ 8 files
- ≤ 6 entities
- ≤ 5 `plan_done` items
- ≤ 5 `plan_next` items
- ≤ 4 constraints

Everything kebab-case. No prose. No commentary inside the blob.

## Steps

1. Build the blob from current context (or the file's contents if `$ARGUMENTS` was provided).
2. Print the blob in a fenced code block, language tag `pact`.
3. Archive: run `mkdir -p .pact/archive` via the Bash tool, then use the **Write tool** to save the exact blob to `.pact/archive/<ISO-8601-timestamp>.pact`. Use a filename like `2026-04-26T17-42-03Z.pact` (replace colons with dashes for filesystem safety). Print the archive path on its own line after the blob.
4. Closing message:
   - **Current session mode** (no `$ARGUMENTS`): print exactly: `Context compressed and archived. Run /clear and paste the blob above as your first message in the fresh session.`
   - **File mode** (`$ARGUMENTS` was provided): print exactly: `File compressed to PACT. The blob is now in context — continue with your next request.`

That's it. No ratio reporting, no extra prose.
