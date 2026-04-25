# PACT — The Pitch

*5-minute demo script. Read this out loud before recording.*

---

## 0:00 — The Problem (60 seconds)

Every developer using Claude Code has hit this wall.

You're four hours into a refactor. You've touched 30 files. The agent knows your constraints, your plan, what's done, what's left. And then —

**Context full.**

Your two options are both bad. Summarize and lose fidelity — the model forgets which files are done, which constraints matter, what it already tried. Or keep everything and pay for 200,000 tokens on every single tool call.

ZIP has the same problem. It was built in 1989. It compresses each file by itself. It doesn't know that your 15 TypeScript files all share the same imports. It doesn't know your test files mirror your source files. It sees bytes. Not structure.

Both of these tools — ZIP and /compact — treat your code like random noise. They don't understand what they're compressing.

PACT does.

---

## 1:00 — The Solution (90 seconds)

*[Screen: terminal]*

```
$ pact pack src/
```

*[Output appears]*

```
  PACKED  15 files  88 KB -> 21 KB  4.2x
  SAVED   67 KB (76%)
  OUT     src.pact
```

That's 4.2x on 15 TypeScript files. But here's what ZIP can't do:

```
$ pact inspect src.pact
```

*[Inspect output shows every file, every function, every import — without decompressing]*

ZIP gives you filenames. PACT gives you **understanding**. Every function, every class, every import — extracted at pack time, stored in the manifest, readable without touching the compressed data.

And on a real 79-file project:

```
  ZIP:   362 KB
  PACT:  221 KB
```

**40% smaller than ZIP.** Measured. Reproducible. Lossless round-trip.

How? Two things ZIP can't do. First: **brotli solid archive**. Instead of compressing each file alone, PACT concatenates them into one stream. Cross-file patterns — shared imports, boilerplate, structural similarity — compound the ratio. Second: **semantic extraction**. PACT understands your code's structure. It's not just looking at bytes.

---

## 2:30 — The Claude Code Plugin (90 seconds)

*[Screen: terminal]*

But PACT started as something else. Something more important.

```
$ pact install --global
```

```
  PACT compaction installed globally.
  Every Claude Code session now auto-compresses at 50% context.
  Zero API calls. Heuristic extraction. Lossless.
```

One command. Every Claude Code session on this machine now uses PACT instead of /compact.

Here's why that matters.

*[Screen: benchmark output]*

```
  Strategy     Ratio    Retention    Lossy?
  PACT         18.4x      92%        no
  /compact      4.0x      68%        YES
```

/compact summarizes your session into prose. It's lossy. The goal disappears 67% of the time. File status — gone. Plan steps — gone 58% of the time. The AI is flying blind after compaction.

PACT extracts **structure**. Files with status codes. Entities by name. Plan steps. Constraints. The AI knows exactly where it is, what's done, what's next. 92% retention at 18.4x compression. /compact gets 68% at 4x.

**PACT compresses 4.6 times more aggressively while retaining 24 percentage points more information.** It wins on both axes simultaneously because it's structural, not prose.

---

## 4:00 — The BARUTU SNAKE (45 seconds)

*[Screen: the benchmark]*

And here's the part that makes this meta.

Task 012 in our benchmark suite is called BARUTU SNAKE. It's the Claude Code session that built PACT — 179 turns over multiple days — compressed by PACT itself.

```
  179 turns
  1,600,813 baseline tokens
  46,653 PACT tokens
  34.3x lossless
```

The snake eats its tail. The tool compresses its own creation story. Darwin revives his own binary.

And you can reproduce it in one command:

```
$ node benchmarks/run.mjs --tasks 012-barutu-snake
```

No asterisks. No "up to." Measured. Reproducible.

---

## 4:45 — The Close (15 seconds)

*[Screen: landing page]*

PACT is a compression format that understands what it's compressing. It beats ZIP by 40% on codebases. It beats /compact by 4.6x on Claude Code sessions. It has a native macOS app, right-click integration, and it installs in one command.

This isn't a prototype. This is the tool I'm shipping Monday.

**pact pack .**

---

## Presentation Notes

**Energy:** Confident, not hypey. Let the numbers speak. Every claim is backed by a benchmark the judges can run.

**Screen flow:**
1. Terminal (pack command + output)
2. Terminal (inspect output — the "aha" moment)
3. Terminal (vs ZIP comparison)
4. Terminal (install --global)
5. Benchmark table (PACT vs /compact)
6. BARUTU SNAKE numbers
7. Landing page

**What NOT to do:**
- Don't explain brotli vs deflate in detail. Say "modern compression" and move on.
- Don't show code. Show outputs.
- Don't apologize for anything. This is a real tool with real numbers.
- Don't rush the inspect output. That's the moment judges go "oh."

**If judges ask:**
- "How is this different from tar.gz?" — tar.gz has solid compression but no manifest for inspection. PACT gives you both.
- "Why not just use zstd?" — Node.js ships brotli natively. Zero dependencies. Brotli at quality 11 matches zstd on text.
- "Does the 40% hold on binary files?" — On random binary, both are ~1:1. The win is on text-heavy codebases where structural patterns exist. That's every real project.
- "What about the 34.3x claim?" — Run `node benchmarks/run.mjs --tasks 012-barutu-snake`. Right now. On your machine.
