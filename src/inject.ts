export function buildInjection(): string {
  return `<pact-requirements>
You are being tracked by PACT. During this conversation, prefix key outputs with tags so they can be extracted later. Use exactly these formats:

[PACT:decision] <what was decided and why>
[PACT:task] <action item, one line>
[PACT:artifact] <path/to/file> — <what changed>
[PACT:blocker] <what is blocked and why>
[PACT:insight] <non-obvious learning>

Rules:
- Emit tags inline in your normal responses — do not batch them at the end.
- One tag per line. No nesting.
- Only emit when something genuinely belongs to that category.
- Do not emit tags for routine tool calls or reads.
</pact-requirements>`
}
