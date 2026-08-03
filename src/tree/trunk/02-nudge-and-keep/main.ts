//! show: none
/*
## The problem we ran into

> Random guessing never settles — can we guess smarter instead of more?

Last lesson we built an engine that holds two numbers: one it multiplies the input by,
and one it adds on. We hid a formula from it — multiply by 2, add 3 — handed it 60
examples of that formula with a little wobble on them, and let it roll both numbers at
random, keeping whichever roll scored lowest.

Twenty thousand rolls bought eight improvements: at rolls 1, 4, 40, 97, 1,002, 1,748,
10,222 and 11,565. Read the gaps between those. Tens, then hundreds, then thousands. The
last 8,435 rolls changed nothing at all, and the engine finished at a multiplier of 2.075
and an add-on of 3.204, when the formula it was chasing is 2 and 3.

Look at why. Every roll starts from nowhere. The engine finds a decent pair of numbers,
learns nothing from them, and throws the next pair of dice from exactly the same place it
threw the first. Nothing it has already seen changes what it does next.

So we change the question we ask. Stop asking *what is the answer*. We are standing at
some pair of numbers already, so ask **which way is downhill from here?** Downhill means
a lower mistake-score, because on that score low is the good direction.
*/

/*
## What lesson 01 taught, imported

Three pieces graduated out of lesson 01 into `src/learned/`, and this lesson takes them
as read. Each of those files opens with a line naming the lesson that built it, so an
import here is a pointer back down the tree rather than a mystery hunt.

- `makeRandom` — a repeatable stream of numbers: same seed, same numbers, the same story on your screen as on ours.
- `makeExamples` — 60 pairs from a straight-line formula, each one knocked off the line by a random wobble.
- `meanSquaredMistake` — the mistake-score: square every miss, then average. Zero is perfect, and bigger is worse.
*/

//! code: imports
import { makeRandom } from "../../../learned/random.ts";
import { makeExamples, type Example, type LineFormula } from "../../../learned/data.ts";
import { meanSquaredMistake } from "../../../learned/scoring.ts";

/*
### The engine, spelled out again

The engine is two numbers and one line of arithmetic. Hand it an input x and it answers
multiplier × x + addOn. There is nothing else inside it.

`SECRET_FORMULA` is the formula we hide: multiply by 2, add 3. The engine never sees it.
We use it once to build the 60 examples, and once at the end to mark the homework.
*/

export const SECRET_FORMULA: LineFormula = { multiplier: 2, addOn: 3 };

//! hide
// The pair of numbers the engine is standing on. Lesson 01 called the same shape a Guess.
export interface Setting {
	multiplier: number;
	addOn: number;
}
//! end

/*
### One test-run

We are about to start counting these, so the thing being counted needs a name. A
**test-run** is: fix the two numbers, answer all 60 examples, compare every answer with
the one we wrote down, average the squared misses. Out comes a single number, the
mistake-score for that pair.

A test-run touches every example. That is what makes it the expensive thing, and it is
the unit of cost for the rest of this lesson.
*/

export function testRun(setting: Setting, examples: Example[]): number {
	// The engine's answer to each example: multiply by the first number, add the second.
	const answers = examples.map(example => setting.multiplier * example.x + setting.addOn);
	const wanted = examples.map(example => example.y);
	return meanSquaredMistake(answers, wanted);
}

/*
## The solution: nudge, and keep what helps

Take the multiplier. Turn it up by 1 and do a test-run. Put it back, turn it down by 1,
do another test-run. We now hold three scores: the one where we stand, the one a nudge
up, the one a nudge down. Move to whichever of the three is lowest. Then do the same for
the add-on. Those four test-runs are one **step**.

The score can never get worse. Standing still is one of the three options, and we only
move when moving lowers the score.

One number is still undecided: how big is a nudge? We start it at 1. When a step ends
with neither of the two numbers finding a better direction, that does not mean we have
arrived. It means we have arrived as far as a nudge this size can see. So we halve the
nudge and look again, closer up. Long strides while we are far away, twitches as we close
in, and nothing sets that schedule except the engine's own failure to improve.
*/

//! hide
export interface Climb {
	setting: Setting;
	/** The score at the setting above. Kept beside it so a step never re-measures where it stands. */
	score: number;
	nudgeSize: number;
	steps: number;
	/** Every test-run we have paid for since the start. The bill. */
	testRuns: number;
}

export const STARTING_NUDGE = 1;

// Start anywhere. The nudging never looks further than its own two neighbours, so where
// it begins costs it nothing but time.
export function startClimb(examples: Example[], startingSetting: Setting): Climb {
	const setting: Setting = { ...startingSetting };
	return {
		setting,
		score: testRun(setting, examples),
		nudgeSize: STARTING_NUDGE,
		steps: 0,
		testRuns: 0
	};
}
//! end

//! code: one-nudge
// The two numbers by name, so the step below can loop over both instead of us writing
// the same block out twice.
export const NUMBER_NAMES = ["multiplier", "addOn"] as const;
export type NumberName = (typeof NUMBER_NAMES)[number];

// Score the engine with one of the two numbers nudged, then put that number back exactly
// where it was.
function scoreAfterNudging(
	climb: Climb,
	examples: Example[],
	name: NumberName,
	nudge: number
): number {
	const before = climb.setting[name];
	climb.setting[name] = before + nudge;
	const score = testRun(climb.setting, examples);
	climb.setting[name] = before;
	climb.testRuns++;
	return score;
}

/*
`scoreAfterNudging` is where the bill is rung up. One call is one sweep of every example,
so one call is one more test-run on the tally. A step calls it four times — up and down,
for the multiplier and for the add-on — and then moves to the best of the three scores it
is now holding.
*/

export function nudgeStep(climb: Climb, examples: Example[]): void {
	let movedSomething = false;

	for (const name of NUMBER_NAMES) {
		const scoreGoingUp = scoreAfterNudging(climb, examples, name, climb.nudgeSize);
		const scoreGoingDown = scoreAfterNudging(climb, examples, name, -climb.nudgeSize);

		// Keep the lowest of the three scores. Standing still wins ties, so a step that
		// finds no improvement leaves both numbers exactly as they were.
		if (scoreGoingUp < climb.score && scoreGoingUp <= scoreGoingDown) {
			climb.setting[name] += climb.nudgeSize;
			climb.score = scoreGoingUp;
			movedSomething = true;
		} else if (scoreGoingDown < climb.score) {
			climb.setting[name] -= climb.nudgeSize;
			climb.score = scoreGoingDown;
			movedSomething = true;
		}
	}

	// Neither number had a better direction. We have run out of resolution, not out of
	// hill, so look again at half the nudge.
	if (!movedSomething) climb.nudgeSize = climb.nudgeSize / 2;

	climb.steps++;
}

//! show: nudgeStep
/*
## Watch it work

The grey dots are the 60 examples. The green line is what the engine says right now. It
starts at multiplier −3.2, add-on 4.1, which is nowhere near multiply by 2, add 3.

Press **One step** to spend four test-runs. **Auto** holds the button down for you.

Two readouts carry the lesson. **Nudge size** halves every time a step finds nothing,
which is the engine deciding on its own to look closer. **Test-runs so far** climbs by
exactly four each step, whatever happens — that is the price, and it is paid whether the
step helped or not.
*/

//! demo: homing-in

//! show: nudgeStep, testRunsPerStep
/*
## What it cost

Twenty steps in, the nudge is down to 0.0039 and the score reads 0.3764. By sixty steps
the engine sits at a multiplier of 2.0590 and an add-on of 3.1742, scoring 0.3763, with
the nudge halved thirty-one times over. It stays there. Lesson 01's engine, after twenty
thousand rolls, was at 2.075 and 3.204 and still wandering.

~ Those two numbers are 2.0590 and 3.1742, not 2 and 3, and they should not be. The
engine is fitting the sixty wobbly answers we wrote down, not the formula underneath
them. No pair of numbers scores lower than 0.3763 on these particular examples — the next
lesson arrives at the same two numbers by a completely different route, which is the best
evidence we have that this really is the bottom.

Now look at where the bill came from, because it is the whole of the next lesson. To find
out which way to move one number, we ran the engine over every example twice: once for
up, once for down. Two test-runs per number, every step, forever.
*/

// Two test-runs per number, every step — the up-nudge and the down-nudge.
export function testRunsPerStep(numberCount: number): number {
	return 2 * numberCount;
}

/*
Two numbers is four test-runs a step, and nobody cares. Drag the slider and price the
same thousand-step run on an engine that is not a toy.
*/

//! demo: the-bill

//! show: testRunsPerStep
/*
## Watch it break

Ten thousand numbers is a small engine by any current standard, and the slider already
reads twenty thousand test-runs per step. That is twenty million full sweeps through the
data to train for a thousand steps.

Every one of those sweeps exists to answer a single yes-or-no question about a single
number: up, or down? We run the whole engine over the whole dataset to extract one bit.

The bit is the cheap part of what we throw away, too. Each pair of test-runs also told us
*how much* the score moved, and we kept only which of the two was smaller.

> Two test-runs per number, every step. Fine for 2 numbers — deadly for thousands. Can we
> know which way to nudge without trying?
*/

//! show: none
/*
## The same story in a terminal

This file runs on its own. `bun run src/tree/trunk/02-nudge-and-keep/main.ts` prints the
climb and then the bill, so every number quoted above is one you can check yourself.
*/

//! hide
export const SEED = 7;
export const EXAMPLE_COUNT = 60;
export const NOISE = 1;
export const START: Setting = { multiplier: -3.2, addOn: 4.1 };

function describe(setting: Setting): string {
	return `multiplier ${setting.multiplier.toFixed(4)}, add-on ${setting.addOn.toFixed(4)}`;
}

export function main(): void {
	const random = makeRandom(SEED);
	const examples = makeExamples(SECRET_FORMULA, EXAMPLE_COUNT, NOISE, random);

	console.log("trunk/02 — Nudge and keep\n");
	console.log("The engine multiplies the input by one number and adds the other. The formula we");
	console.log("hide from it is multiply by 2, add 3, and it gets 60 wobbly examples of that.\n");
	console.log("Last lesson it rolled both numbers at random 20,000 times and never settled. This");
	console.log("time it starts at multiplier -3.2, add-on 4.1 and, every step, tries each of its");
	console.log("two numbers one nudge up and one nudge down, keeping whichever direction lowers");
	console.log("the score. When neither number has a better direction, it halves the nudge.\n");

	const climb = startClimb(examples, START);
	console.log(`Starting score: ${climb.score.toFixed(4)}\n`);
	console.log(" steps   test-runs   nudge size   score      the two numbers");

	for (let step = 1; step <= 60; step++) {
		nudgeStep(climb, examples);
		if (step <= 5 || step === 10 || step === 20 || step === 60) {
			const row = [
				String(climb.steps).padStart(6),
				String(climb.testRuns).padStart(12),
				climb.nudgeSize.toPrecision(3).padStart(13),
				`   ${climb.score.toFixed(4)}`.padEnd(13),
				describe(climb.setting)
			];
			console.log(row.join(""));
		}
	}

	console.log(`\nIt settled, and it stays settled. It lands a hair off multiplier 2, add-on 3`);
	console.log(`because it is fitting the wobbly examples we handed it, not the formula behind`);
	console.log(`them. No pair of numbers scores lower on these 60 examples: the next lesson`);
	console.log(`arrives at the same two numbers by a completely different route.`);
	console.log(`It took ${climb.steps} steps and ${climb.testRuns} test-runs.\n`);

	console.log("The bill is two test-runs per number, every step. Two numbers is nothing. Price");
	console.log("the same thousand-step run on an engine that is not a toy:\n");
	console.log("numbers      test-runs per step   test-runs for 1,000 steps");
	for (const numberCount of [2, 10, 100, 1000, 10000]) {
		const row = [
			numberCount.toLocaleString().padStart(6),
			testRunsPerStep(numberCount).toLocaleString().padStart(21),
			(testRunsPerStep(numberCount) * 1000).toLocaleString().padStart(28)
		];
		console.log(row.join(""));
	}

	console.log("\nEach one of those is a full sweep through all 60 examples, spent to answer one");
	console.log("yes-or-no question about one number.\n");
	console.log("Next problem: two test-runs per number, every step. Fine for 2 numbers — deadly");
	console.log("for thousands. Can we know which way to nudge without trying?");
}

if (import.meta.main) {
	main();
}
//! end

//! demo: jargon
