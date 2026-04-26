# PACT Session Handoff

## PACT state (structured)
```pact
session = {
 goal: 'submit-pact-hackathon'
 files: {
  'src/pack.ts': 'done'
  'src/compaction.ts': 'done'
  'src/setup.ts': 'done'
  'src/cli.ts': 'done'
  'src/compress.ts': 'done'
  'native/PACTProgress.swift': 'done'
  'native/pact-video.c': 'done'
  'docs/index.html': 'done'
  'docs/Blackrush.ttf': 'done'
  'docs/wallet-qr.png': 'done'
  'install.sh': 'done'
  'meta/PITCH.md': 'done'
  'SUBMISSION.md': 'done'
  'benchmarks/compaction-benchmark.mjs': 'done'
 }
 plan_done: [
  'brotli-solid-archive'
  'compaction-plugin'
  'native-macos-ui'
  'cross-platform-setup'
  'c-video-renderer'
  'remotion-video-v2'
  'landing-page-comedy-rewrite'
  'benchmarks-vs-compact'
  'blackrush-font'
  'wallet-qr'
  'domain-pact-zip'
  '150-tests-passing'
 ]
 plan_next: [
  'render-remotion-video-final'
  'flip-repo-public'
  'verify-pact-zip-serves'
  'npm-publish-pact-cc'
  'screen-record-demo'
  'submit-by-8pm-edt'
 ]
 constraints: [
  'deadline-apr-26-8pm-edt'
  'repo-private-until-submit'
  'build-from-pact-build-dir'
 ]
 entities: {
  'brotli-solid': '40%-smaller-than-zip'
  'compaction': '18.4x-vs-compact-4x'
  'retention': '92%-vs-68%'
  'barutu-snake': '34.3x-179-turns'
  'tests': '150-passing-vitest'
 }
}
```

## Critical paths

| What | Where |
|------|-------|
| Working build dir | `/Users/amh/ONW/pact-build` |
| Source (has backslash in path, DON'T npm build here) | `/Users/amh/ONW/VSCODE\ PACT/VSCODE PACT/PACT` |
| Binary | `~/.local/bin/pact` (47MB standalone) |
| Native progress UI | `~/.local/bin/PACTProgress` |
| Quick Actions | `~/Library/Services/Pack with PACT.workflow` etc |
| Global compaction hook | `~/.pact/compaction-hook.mjs` |
| Global settings | `~/.claude/settings.json` (PreToolUse hook) |
| Domain | `pact.zip` (Porkbun, GitHub connect, branch: main, path: docs) |
| Remotion video v2 | `~/Desktop/pact-video-v2-fixed.tar.gz` |
| C video backup | `native/pact-video.c` → `pact-explainer.mp4` |
| Repo | `github.com/hmatrades/PACT` (PRIVATE) |

## Build commands

```bash
cd /Users/amh/ONW/pact-build
npm run build                    # tsup → dist/
npm test                         # vitest, 150 passing
npx @yao-pkg/pkg dist/cli.cjs --target node20-macos-arm64 --output release/pact --no-signature -c package.json
cp release/pact ~/.local/bin/pact
```

## Key numbers (measured, reproducible)

- **File compression:** 79 files, 1001 KB → 221 KB, **4.5x**, **40% smaller than ZIP**
- **Session compaction:** 29,611 tokens → 1,606 tokens, **18.4x** (vs /compact 4.0x)
- **Retention:** PACT 92% vs /compact 68%
- **BARUTU SNAKE:** 179 turns, 1.6M → 46K tokens, **34.3x lossless**
- **Tests:** 150/150 passing

## TODO before 8PM EDT

1. Render Remotion video (`npx remotion render src/index.ts PactVideo out/pact.mp4`)
2. Flip repo to public
3. Verify `pact.zip` serves the landing page (set Porkbun branch to `main`, path to `docs`)
4. `npm publish` the pact-cc package (so `npx pact-cc setup` works for judges)
5. Screen record: `pact pack src/` → `pact inspect` → `pact unpack` → right-click demo
6. Submit on hackathon form

## Voice & copy

Seinfeld/Trevor Wallace comedy up top, PhD data in the middle. The tagline is *"what's the deal with ZIP?"* in Blackrush brush font. Key lines:
- "ZIP is the guy at the group project who does his slide and leaves the call"
- "like carrying 200K tokens around like a guy who brings his own chair to a restaurant"
- "A LinkedIn post about your codebase"
- "This is either genius or a cry for help. We honestly can't tell anymore"
- Then hard technical data with proper terminology immediately after
