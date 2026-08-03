# Project instructions

Read `CURRICULUM.md` (what the tree is) and `ARCHITECTURE.md` (how the code and lessons are organized) before changing anything. They are the authority; this file only lists the rules agents skip most often.

## The slop rubric

Every piece of text — lesson prose, docs, code comments, UI copy — must pass SlopSift:

```
bun run slop
```

- Run it after ANY change that adds or edits text, before considering the work done. A pre-push hook (husky) also enforces it.
- Fix findings in the text itself. Never suppress them.
- Exactly one rule is disabled, in `scripts/slop.ts` (`ai-style/mechanical-outline` — it trips on the curriculum's repeating problem→solution scaffolding). Do not add to the disabled list without the maintainer's say-so.
- Keep absolutes the lesson demonstrates ("that is the entire machine"); remove weak tells (passives, comma splices, dramatic fragments, em-dash pileup) — that combination clears the document-level clusters honestly.

## Other rules that get missed

- `main.ts` IS the lesson page (literate: column-0 block comments are prose, `//! demo:` markers inject templates). Editing lesson text means editing `main.ts`.
- Every number quoted in prose comes from the seeded runs and is pinned by a test. Change a run, update the prose AND the pin.
- Zero runtime dependencies. Dev tools (prettier, husky, slopsift) are fine.
- `bun test` and `bunx tsc --noEmit` must be clean before pushing.
