# PACT — 3-minute demo video script

**Goal:** unveiling, not tutorial. No "hi guys." No "in this video we'll." Cold open on the problem. Land the receipts. Close with `git clone && /pact`.

**Total runtime target:** 2:55–3:00. Edit hard. Cut anything that doesn't earn its second.

**Voice:** flat, confident, no hype tone. The numbers carry the energy. You don't need to.

---

## 0:00 – 0:12 · Cold open · The problem

**On screen:** screen-record of Claude Code session. Bottom-right context gauge climbing past 80%. Cut to user typing `/compact`. Cut to model response: "I summarized our session. What were we working on again?" — visibly broken.

**Voice (over the gauge):**
> Long Claude Code sessions hit a wall. You either summarize and lose state, or carry two hundred thousand tokens on every tool call.

**On screen:** freeze frame. Title card: **PACT**. Subtitle in monospace: *Capability scales faster than context.*

---

## 0:12 – 0:30 · The thesis

**On screen:** PACT website hero (`pact-six-kappa.vercel.app`). Hero animated stats counting up: 40% smaller than ZIP · 18.4× session compression · 100% bit-perfect.

**Voice:**
> PACT is structural lossless compression of agent context, performed by the agent itself. Seventeen to thirty-five times compression measured. One hundred percent completion parity. Zero install. Built in five days with Claude Code.

**On screen:** clean cut to terminal, blank, ready.

---

## 0:30 – 1:00 · Demo · Mode C (the kill shot — zero install)

**On screen:** terminal. Type slowly:

```
git clone https://github.com/hmatrades/PACT
cd PACT
claude
```

Claude Code splash. Type `/pact` slowly enough to read.

**Voice (during the type):**
> No npm install. No API key. Just clone and slash-pact. The model running the agent compresses its own context.

**On screen:** Claude Code emits a fenced PACT blob. The structured `session = { goal: ..., files: ..., plan_done: [...], ... }` syntax fills the screen for ~3 seconds. Then the message: `Context compressed and archived. Run /clear and paste the blob above.`

**Voice:**
> The same Opus 4.7 instance that needs the context is the one that compressed it. No second model call. This is what self-referential agent infrastructure looks like.

---

## 1:00 – 1:30 · Demo · Mode A (file compression vs ZIP)

**On screen:** macOS Finder. Right-click on a folder. Services menu. **Pack with PACT**. Native Swift progress window pops up — animated progress bar, then green checkmark.

Cut to two file sizes side-by-side, pulled from Finder Get Info: ZIP 17 KB, PACT 8 KB. Both highlighted.

**Voice:**
> ZIP was designed in nineteen-eighty-nine. It compresses each file in isolation. PACT uses solid brotli — every file in one stream — so cross-file patterns are visible to the compressor. Forty percent smaller on real codebases. Lossless. Verified with `diff -r`.

---

## 1:30 – 2:00 · The receipts

**On screen:** Three benchmarks flash, ~10s each, large monospace text on dark background.

> **BARUTU SNAKE — task 012**
> 179 turns · 1.6M baseline tokens · 46K PACT tokens · **34.3× lossless**
> *The conversation that built PACT, compressed by PACT.*

> **vs alternative strategies (179 turns)**
> sliding-window 14.9× lossy · summarization 21.3× lossy · **PACT 36.3× lossless**

> **PACT vs ZIP — full project**
> ZIP 362 KB · PACT 221 KB · **−40%** · 100% bit-perfect round-trip

**Voice (over all three, brief):**
> Twelve reproducible benchmark tasks. One command to run them. The numbers are not "up to." They're measured.

---

## 2:00 – 2:30 · Scale

**On screen:** clean text, animated counter ticking up to the final number.

```
100K Claude Code users · 1 long session/week · 17×
≈ 470 GWh/year of inference compute that doesn't run
```

Then below:

```
At 1M users: ~4.7 TWh/year
≈ the annual electricity of a mid-size country
```

**Voice (slow, no rush):**
> Compression is energy. Every token a session doesn't carry is inference compute that doesn't run. At one million Claude Code users, PACT saves the annual electricity consumption of a mid-size country. From a single layer in front of a model that already exists.

---

## 2:30 – 2:55 · Close

**On screen:** terminal again. Slowly type:

```
git clone https://github.com/hmatrades/PACT && cd PACT && claude
> /pact
```

Hold for 2 seconds.

**Voice:**
> The numbers are real. The install is one command. The code is open. The only question is whether Anthropic ships PACT as the default compression layer for Claude Code in Q3 — or somebody else does first.

**Final card (2:55 – 3:00):**

> **PACT**
> github.com/hmatrades/PACT
> *Built with Claude Code · Opus 4.7*

---

## Production notes

- **No music for the first 12 seconds.** Let the broken `/compact` moment land in silence. Bring music in at the title card.
- **Music suggestion:** something austere — synth pad, single sustained note, no melody. Not energetic. The numbers are the energy.
- **Cut hard.** No fade transitions. Jump cuts only. Steve Jobs unveiling cadence, not YouTube.
- **Screen recording:** OBS or QuickTime, 1920×1080, 60fps. Terminal at 16pt minimum so it reads on phones.
- **Color grade:** match the website's dark palette (#0d1117 background, #3fb950 accent green, #d29922 amber). Burn it in your eyes.
- **Voice:** record dry, no music ducking. Mix at -16 LUFS for YouTube.
- **Subtitles:** burn-in for the demo terminal sequences (Mode C, Mode A) so it reads even with audio off — judges scrub fast.

## Shot list (for recording)

1. **0:00–0:12** — Claude Code session at 80%+ context, type `/compact`, capture broken response. (Live record.)
2. **0:12–0:30** — Website hero, scroll-locked, let counters animate. (Screen capture pact-six-kappa.vercel.app.)
3. **0:30–1:00** — Fresh `git clone` + `claude` + `/pact` sequence. (Live terminal, speed up 1.5× in post if it drags.)
4. **1:00–1:30** — Finder right-click → Pack with PACT → native UI → side-by-side ZIP vs PACT sizes. (Live record on macOS.)
5. **1:30–2:00** — Three benchmark cards. (Build in Keynote / FCP, hold each for 10s.)
6. **2:00–2:30** — Energy stats animated counter. (Build in Keynote / FCP.)
7. **2:30–2:55** — `git clone && /pact` close. (Live record.)
8. **2:55–3:00** — Final card. (Static, 5s.)
