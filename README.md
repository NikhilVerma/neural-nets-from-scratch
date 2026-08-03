# Learning AI From First Principles

A hands-on journey through neural networks built from absolute scratch in TypeScript.

## Philosophy

This project teaches you AI by having you build it yourself - no libraries, no magic, just code you can read and understand. Each lesson is completely self-contained and builds progressively from the simplest possible neuron to complex architectures.

**If you can understand addition and multiplication, you can understand neural networks.**

## Core Principles

1. **Zero Functional Dependencies**: Every operation visible in the code
2. **Readability First**: Clear code over fast code
3. **Progressive Complexity**: Each failure motivates the next solution
4. **Interactive Learning**: Visual feedback at every stage
5. **Bun**: Use Bun for everything - runtime, package management, scripts, servers and testing. Styling is hand-written CSS, no framework.

## The tree

The landing page is not a table of contents. It is a tree, drawn upside down: the trunk descends from the first lesson, then forks into a language branch and a vision branch.

**Every edge is a problem** — a plain-English question about something that just broke, got too slow, or hit a wall. **Every node is a solution** — the simplest thing that answers it, and nothing more. You never learn a concept because it's next in the book; you learn it because the machine you just built failed in front of you. Click any node to read the problem that leads into it, the solution it teaches, and the jargon the rest of the world uses for it. Built lessons open; the rest are marked planned or future, because the tree grows in the open.

- [CURRICULUM.md](./CURRICULUM.md) — the whole tree, every node and every problem-edge
- [ARCHITECTURE.md](./ARCHITECTURE.md) — how the code is organized and the rules that keep it teachable

## Requirements

- [Bun](https://bun.sh/) - Fast JavaScript runtime
- A modern web browser - For visualizations
- Basic TypeScript knowledge

## Commands

```bash
bun install     # install dev tooling (there are no runtime dependencies)
bun dev         # serve the tree at http://localhost:3000 with hot reload
bun test        # run every lesson's tests
bun run prettify  # format
```

A lesson also runs headless: `bun run src/tree/<node>/main.ts` prints its story in the terminal.

Routes come from the manifest (`src/curriculum.ts`). Adding a lesson means adding a folder under `src/tree/` and one manifest entry — the server and the tree page pick it up on their own.

## Success Metrics

Each lesson achieves:

1. ✅ **Functional**: The code works and learns
2. ✅ **Understandable**: Someone can read and modify it
3. ✅ **Visual**: Interactive demonstration of concepts
4. ✅ **Documented**: Clear explanation of the "why"
5. ✅ **Testable**: Benchmarks prove it learned

## Contributing

This is an educational project. If you find bugs, unclear explanations, or have ideas for improvements, please open an issue!
