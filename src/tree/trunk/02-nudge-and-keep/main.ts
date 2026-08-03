/*
## The problem we ran into

> Random guessing never settles — can we guess smarter instead of more?

Last lesson we built a machine with two knobs. It takes a number, multiplies it by the
first knob, adds the second knob, and hands back the result. We hid a rule from it —
multiply by 2, add 3 — gave it 60 examples of that rule with a little wobble on them,
and let it roll both knobs at random, keeping whichever roll scored best.

Twenty thousand rolls bought eight improvements, at rolls 1, 4, 40, 97, 1,002, 1,748,
10,222 and 11,565. Read the gaps between them: tens, then hundreds, then thousands.
Each step down cost roughly ten times the step before it. The last 8,435 rolls changed
nothing at all.

The strategy itself is what stalls. Every roll starts from nowhere. The machine finds a
decent setting, learns nothing from it, and throws the next pair of dice from exactly
the same place it threw the first.

So we change the question. Stop asking *what is the answer*. We are standing at some
setting already — ask **which way is downhill from here?**
*/

/*
## What lesson 01 taught, imported

Three pieces graduated out of lesson 01 into `src/learned/`, and we take them as read
here. Each of those files opens with a line naming the lesson that built it, so an
import is always a pointer back down the tree, never a mystery.

- `makeRandom` — a repeatable stream of numbers: same seed, same numbers, same story every run.
- `makeExamples` — 60 pairs from a straight-line rule, each knocked off the line by a random wobble.
- `meanSquaredMistake` — the score: the average of the squared misses. Zero is perfect, bigger is worse.
*/

import { makeRandom } from "../../../learned/random.ts";
import { makeExamples, type Example, type LineRule } from "../../../learned/data.ts";
import { meanSquaredMistake } from "../../../learned/scoring.ts";

/*
### The machine, spelled out again

The machine is two numbers and one line of arithmetic. `multiplier` and `addOn` are the
knobs. Give it an input x and it answers multiplier × x + addOn. There is nothing else
inside it.

`SECRET_RULE` is the rule we are hiding: multiply by 2, add 3. The machine never sees
it. We use it once to build the examples, and once at the end to mark the homework.
*/

export const SECRET_RULE: LineRule = { multiplier: 2, addOn: 3 };

export interface Knobs {
	multiplier: number;
	addOn: number;
}

// The knobs listed by name, so the nudging below can loop over them instead of
// hand-writing the same block twice.
export const KNOB_NAMES = ["multiplier", "addOn"] as const;
export type KnobName = (typeof KNOB_NAMES)[number];

export function predict(knobs: Knobs, x: number): number {
	return knobs.multiplier * x + knobs.addOn;
}

/*
### One test-run

We are about to count these, so the thing being counted needs a name. A **test-run** is:
fix the knobs, answer all 60 examples, compare every answer to the real one, average the
squared misses. It returns one number.

A test-run touches every example. That is what makes it the expensive thing, and it is
the unit of cost for the rest of this lesson.
*/

export function testRun(knobs: Knobs, examples: Example[]): number {
	const predictions = examples.map(example => predict(knobs, example.x));
	const actuals = examples.map(example => example.y);
	return meanSquaredMistake(predictions, actuals);
}

/*
## The solution: nudge, and keep what helps

Take the `multiplier` knob. Turn it up by 1 and do a test-run. Put it back, turn it down
by 1, do another test-run. We now hold three scores: the one where we stand, the one a
nudge up, the one a nudge down. Move to whichever is lowest. Then do the same for
`addOn`. Those four test-runs are one **step**.

The score can never get worse. Standing still is one of the three options, and we only
move when moving lowers the score.

One number is still undecided: how big is a nudge? We start it at 1. When a step ends
with neither knob finding a better direction, that does not mean we have arrived — it
means we have arrived as far as a nudge this size can see. So we halve the nudge and
look again, closer up. Long strides while we are far away, twitches as we close in, and
nothing sets that schedule except the machine's own failure to improve.
*/

export interface Climb {
	knobs: Knobs;
	/** The score at the knobs above. Kept alongside them so a step never re-measures where it stands. */
	score: number;
	nudgeSize: number;
	steps: number;
	/** Every test-run we have paid for since the start. The bill. */
	testRuns: number;
}

export const STARTING_NUDGE = 1;

// Start anywhere. The nudging never looks further than its own two neighbours, so where
// it begins costs it nothing but time.
export function startClimb(examples: Example[], startingKnobs: Knobs): Climb {
	const knobs: Knobs = { ...startingKnobs };
	return {
		knobs,
		score: testRun(knobs, examples),
		nudgeSize: STARTING_NUDGE,
		steps: 0,
		testRuns: 0
	};
}

// Score the machine with one knob turned by `turn`, then put that knob back exactly
// where it was. Every call here is one full sweep of the examples, so every call adds
// one to the bill.
function scoreWithKnobTurned(
	climb: Climb,
	examples: Example[],
	knob: KnobName,
	turn: number
): number {
	const settingBefore = climb.knobs[knob];
	climb.knobs[knob] = settingBefore + turn;
	const score = testRun(climb.knobs, examples);
	climb.knobs[knob] = settingBefore;
	climb.testRuns++;
	return score;
}

export function nudgeStep(climb: Climb, examples: Example[]): void {
	let movedSomething = false;

	for (const knob of KNOB_NAMES) {
		const scoreGoingUp = scoreWithKnobTurned(climb, examples, knob, climb.nudgeSize);
		const scoreGoingDown = scoreWithKnobTurned(climb, examples, knob, -climb.nudgeSize);

		// Keep the lowest of the three scores. Doing nothing wins ties, so a step that
		// finds no improvement leaves the knobs exactly as they were.
		if (scoreGoingUp < climb.score && scoreGoingUp <= scoreGoingDown) {
			climb.knobs[knob] += climb.nudgeSize;
			climb.score = scoreGoingUp;
			movedSomething = true;
		} else if (scoreGoingDown < climb.score) {
			climb.knobs[knob] -= climb.nudgeSize;
			climb.score = scoreGoingDown;
			movedSomething = true;
		}
	}

	// Neither knob had a better direction. We have run out of resolution, not out of
	// hill, so look again at half the nudge.
	if (!movedSomething) climb.nudgeSize = climb.nudgeSize / 2;

	climb.steps++;
}

/*
## Watch it work

The grey dots are the 60 examples. The green line is what the machine says right now.
It starts at multiplier −3.2, add-on 4.1, which is nowhere near multiply by 2, add 3.

Press **One step** to spend four test-runs. **Auto** holds the button down for you.

Two readouts carry the lesson. **Nudge size** halves every time a step finds nothing,
which is the machine deciding on its own to look closer. **Test-runs so far** climbs by
exactly four each step, whatever happens — that is the price, and it is paid whether
the step helps or not.
*/

//! demo: homing-in

/*
## What it cost

It settles, and it stays settled. Last lesson's machine never did.

Now look at where the bill came from, because it is the whole of the next lesson. To
find out which way to turn one knob, we ran the machine over every example twice: once
for up, once for down. Two test-runs per knob, every step, forever.
*/

// Two test-runs per knob, every step — the up-nudge and the down-nudge.
export function testRunsPerStep(knobCount: number): number {
	return 2 * knobCount;
}

export function testRunsForTraining(knobCount: number, steps: number): number {
	return testRunsPerStep(knobCount) * steps;
}

/*
Two knobs is four test-runs a step and nobody cares. Drag the slider and price the same
thousand-step run on a machine that is not a toy.
*/

//! demo: the-bill

/*
## Watch it break

Ten thousand knobs is a small machine by any current standard, and the slider already
reads twenty thousand test-runs per step — twenty million full sweeps through the data
to train for a thousand steps.

Every one of those sweeps exists to answer a single yes-or-no question about a single
knob: up, or down? We run the entire machine over the entire dataset to extract one bit.

Worse, the bit is the cheap part of what we throw away. Each pair of test-runs also told
us *how much* the score moved, and we kept only which sign was smaller.

> Two test-runs per knob, every step. Fine for 2 knobs — deadly for thousands. Can we
> know which way to nudge without trying?
*/

/*
## The same story in a terminal

This file runs on its own: `bun run main.ts` in this folder prints the climb and then
the bill. Same code you just read, no browser involved.
*/

export function main(): void {
	const random = makeRandom(7);
	const examples = makeExamples(SECRET_RULE, 60, 1, random);

	console.log("trunk/02 — Nudge and keep\n");
	console.log("The machine multiplies the input by one knob and adds the other. The rule we");
	console.log("hide from it is multiply by 2, add 3. It gets 60 wobbly examples of that rule.\n");
	console.log("Last lesson it rolled both knobs at random 50,000 times and never settled. This");
	console.log("time it starts at multiplier -3.2, add-on 4.1 and, every step, tries each knob");
	console.log("one nudge up and one nudge down, keeping whichever direction lowers the score.");
	console.log("When neither knob has a better direction, it halves the nudge.\n");

	const climb = startClimb(examples, { multiplier: -3.2, addOn: 4.1 });
	console.log(`Starting score: ${climb.score.toFixed(4)}\n`);
	console.log(" steps   test-runs   nudge size   score      rule");

	for (let step = 1; step <= 60; step++) {
		nudgeStep(climb, examples);
		if (step <= 5 || step === 10 || step === 20 || step === 60) {
			const row = [
				String(climb.steps).padStart(6),
				String(climb.testRuns).padStart(12),
				climb.nudgeSize.toPrecision(3).padStart(13),
				`   ${climb.score.toFixed(4)}`.padEnd(13),
				`multiplier ${climb.knobs.multiplier.toFixed(4)}, add-on ${climb.knobs.addOn.toFixed(4)}`
			];
			console.log(row.join(""));
		}
	}

	console.log(`\nIt settled, and it stays settled. It lands a hair off multiplier 2, add-on 3`);
	console.log(`because it is fitting the wobbly examples we handed it, not the rule behind`);
	console.log(`them. No setting of these two knobs scores lower on these 60 examples: the`);
	console.log(`next lesson reaches the same two numbers by a completely different route.`);
	console.log(`It took ${climb.steps} steps and ${climb.testRuns} test-runs.\n`);

	console.log("The bill is two test-runs per knob, every step. Two knobs is nothing. Price the");
	console.log("same thousand-step run on a machine that is not a toy:\n");
	console.log("knobs        test-runs per step   test-runs for 1,000 steps");
	for (const knobCount of [2, 10, 100, 1000, 10000]) {
		const row = [
			knobCount.toLocaleString().padStart(6),
			testRunsPerStep(knobCount).toLocaleString().padStart(21),
			testRunsForTraining(knobCount, 1000).toLocaleString().padStart(28)
		];
		console.log(row.join(""));
	}

	console.log("\nEach one of those is a full sweep through all 60 examples, spent to answer one");
	console.log("yes-or-no question about one knob.\n");
	console.log("Next problem: two test-runs per knob, every step. Fine for 2 knobs — deadly for");
	console.log("thousands. Can we know which way to nudge without trying?");
}

if (import.meta.main) {
	main();
}
