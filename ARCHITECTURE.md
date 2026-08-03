# Architecture

How the codebase is organized, and the rules that keep it teachable as it grows. The curriculum itself lives in [CURRICULUM.md](./CURRICULUM.md); this file is about code.

## The two-audience rule

Everything here is read by two audiences with different questions:

- **The code answers "what is happening?"** It must be readable top-to-bottom by someone with basic TypeScript. Plain loops over clever one-liners. Names over abbreviations.
- **The lesson answers "why are we doing this?"** The problem→solution story lives in the lesson page, never buried in code comments. A code comment may state a local constraint ("this must run before X"); it never carries the curriculum.

If you find yourself writing a paragraph-long comment in a `.ts` file, it belongs in the lesson.

## The lesson contract

Every lesson page follows this arc, in this order:

1. **A real problem.** Something a person actually wants and can't do — not an abstract puzzle. Then shrink it, out loud, to the smallest version that still has the problem's shape ("we can't start with faces, so we start with a rule that turns one number into another"). The shrinking is part of the lesson.
2. **Build the solution in code, on the page.** The reader learns by reading the real code with prose between the pieces — this project's promise is *from concepts and from code*.
3. **Watch it work** — the interactive demo.
4. **Watch it break** — run into the next problem live, and state it plainly. It is the child edge, quoted from the manifest.
5. The jargon box, then the handoff.

**main.ts IS the page.** Each lesson's `main.ts` is written literate-style:

- Block comments starting at column 0 (`/* … */`) are the lesson's prose. They may use a little markdown: `##`/`###` headings, `>` for the problem quote, `-` lists, backtick code spans, `**bold**`.
- Everything else is the real, runnable code, rendered highlighted between the prose. `//` comments belong to the code and appear inside the code blocks.
- `//! demo: name` lines mark where the page injects the interactive demo declared as `<template data-demo="name">` in the lesson's `index.html` shell.

The page fetches `/source/<id>/main.ts` from the server and renders it (`site/code.ts`). The same file is the lesson you read in the browser, the program you run with `bun run main.ts`, and the code you open in an editor. Edit it and all three update together, so the page shows the code exactly as it sits on disk. `index.html` stays a shell: head, header, demo templates, jargon box, footer.

## Voice rules

- **Define before use.** No noun appears before the reader knows exactly what it is. If the lesson says "the machine", the lesson has already built the machine in front of them.
- Active voice, "we" and "you", present tense. One human explaining to another at a whiteboard.
- **No claim without its evidence next to it**: a number, a demo, or the code itself. If a sentence asserts something the reader can't immediately check below it, cut it or prove it.
- Short sentences over clause chains. If a sentence works without a word, cut the word.
- Never "simply", "just", "magic", "elegant". The reader decides what's simple.
- **Every piece of text must pass the slop linter.** `bun run slop` runs [SlopSift](https://slopsift.dev) over the whole repo — lesson prose, docs, code comments, UI copy. `scripts/slop.ts` disables one rule (`ai-style/mechanical-outline`, which trips on the curriculum's repeating problem→solution scaffolding). Fix every other finding in the text itself.

## Layout

```
src/
  server.ts              # Bun server; discovers nodes automatically — never edited to add a node
  curriculum.ts          # THE manifest: every node + every problem-edge, one place
  site/                  # the tree UI (landing page) + shared page chrome
  learned/               # concepts that have graduated (see rule below)
    slope.ts             #   ← taught at trunk/03
    matrix.ts            #   ← taught at trunk/06
    value.ts             #   ← autograd, taught at trunk/07
  tree/
    trunk/
      01-guess-and-check/
        index.html       # the lesson: the "why" (problem in, solution, watch-it-break) + the demos
        main.ts          # the node's code — runnable headless: bun run main.ts
        client.ts        # browser glue for the demos (canvas, buttons)
        lesson.test.ts   # bun test — proves the node's claim ("it learns", "it fails on curves")
      02-nudge-and-keep/
      ...
    language/
    vision/
```

Folder names ARE node ids (`trunk/03-follow-the-slope`); the filesystem mirrors the tree.

## The graduation rule (imports)

The tension: minimal copy-paste, but a learner must never have to trace a dependency chain to understand a lesson.

The rule that balances it:

> **What a node teaches lives in that node's folder, written out in full.
> Once taught, a concept graduates into `src/learned/` and later nodes import it.**

- `trunk/06` teaches matrices, so `matmul` is written *inside* `trunk/06`, spelled out, the star of the show.
- `trunk/07` needs matrices but is about autograd — it imports `learned/matrix.ts` and spells out the `Value` class instead.
- Every file in `learned/` starts with a one-line header: `// Taught at trunk/06-the-grid-trick — go there for the why.` So chasing an import is never a mystery hunt; it's a pointer back down the tree.

Corollaries:

- **A node may only import concepts from its ancestors.** If you need something no ancestor taught, that's not an import problem — it's a missing node in the curriculum.
- `learned/` code may be a *cleaned-up* version of what the node taught (better names, edge cases), but never a *different algorithm*. No secretly swapping in a faster trick the learner hasn't met.
- Small deliberate re-derivations are fine when repetition is the point. Default is graduation.

## The manifest

`src/curriculum.ts` is the single source of truth: every node (id, title, status) and every edge (parent, the problem question in plain English). From it come:

- the tree UI on the landing page (edges rendered with their problem text),
- the server's routes (server globs `src/tree/*/*/index.html` and cross-checks against the manifest),
- prev/next navigation on lesson pages.

Adding a node = add a folder + add one manifest entry. You touch nothing else.

## Hard limits (on purpose)

- **Zero ML/math dependencies, forever.** The only runtime is Bun; styling is plain CSS we write ourselves (`src/site/`). If a lesson needs it, we write it. (Prettier stays as a dev tool.)
- **Lesson prose lives in the lesson's `index.html`.** No markdown pipeline, no renderer dependency — the page a learner reads is a file they can open and edit.
- **Plain TypeScript, browser-runnable.** No WebGPU/WASM/kernel tricks, no worker-pool cleverness. When something is slow, slowness is *curriculum material* (it motivates matrices, batching, honest training). When plain TS genuinely can't go further (real-scale training), the lesson says so out loud and points at the tools that can — we don't smuggle in performance engineering.
- **Clarity beats speed, every time.** Stolen from micrograd/nanoGPT: "everything else is just efficiency."
- **No configuration surface.** Nodes have hardcoded, readable constants, not option objects. A learner changes behavior by editing the code — that's the point.

## Conventions

- Tests use `bun test` (`import { test, expect } from "bun:test"`), discovered by glob — no hand-rolled runners, no per-node package scripts.
- Every node works both ways: `bun run src/tree/<node>/main.ts` in a terminal (prints its story) and interactively in the browser.
- A node's `lesson.test.ts` proves the node's *claims*, including the failure: if the lesson says "this cannot fit a curve," a test asserts the loss stays high. The next lessons stand on those failures, so test them like features.
- Prettier config as-is; format with `bun run prettify`.
