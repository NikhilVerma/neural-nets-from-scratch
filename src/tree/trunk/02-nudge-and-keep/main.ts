/**
 * trunk/02 — Nudge and keep.
 * Runnable on its own: bun run main.ts
 *
 * Imports the three things trunk/01 taught. The nudging is written out below.
 */

import { makeRandom } from "../../../learned/random.ts";
import { makeExamples, type Example, type LineRule } from "../../../learned/data.ts";
import { meanSquaredMistake } from "../../../learned/scoring.ts";

export const SECRET_RULE: LineRule = { multiplier: 2, addOn: 3 };

export interface Knobs {
	multiplier: number;
	addOn: number;
}

export const KNOB_NAMES = ["multiplier", "addOn"] as const;

export function predict(knobs: Knobs, x: number): number {
	return knobs.multiplier * x + knobs.addOn;
}

/** One test-run: set the knobs, answer every example, see how wrong we were. */
export function testRun(knobs: Knobs, examples: Example[]): number {
	const predictions = examples.map(example => predict(knobs, example.x));
	const actuals = examples.map(example => example.y);
	return meanSquaredMistake(predictions, actuals);
}

export interface Climb {
	knobs: Knobs;
	score: number;
	nudgeSize: number;
	steps: number;
	testRuns: number;
}

export const STARTING_NUDGE = 1;

/** Start anywhere — the nudging does not care where. */
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

/**
 * One step: for each knob, try it a nudge up and a nudge down and keep the better
 * of the two — but only if it beats where we already are. If neither knob had a
 * better direction, we are standing on the best spot our nudge size can see, so halve it.
 */
export function nudgeStep(climb: Climb, examples: Example[]): void {
	let improvedSomething = false;

	for (const knob of KNOB_NAMES) {
		const settingBefore = climb.knobs[knob];

		climb.knobs[knob] = settingBefore + climb.nudgeSize;
		const scoreGoingUp = testRun(climb.knobs, examples);

		climb.knobs[knob] = settingBefore - climb.nudgeSize;
		const scoreGoingDown = testRun(climb.knobs, examples);

		climb.testRuns += 2;

		if (scoreGoingUp < climb.score && scoreGoingUp <= scoreGoingDown) {
			climb.knobs[knob] = settingBefore + climb.nudgeSize;
			climb.score = scoreGoingUp;
			improvedSomething = true;
		} else if (scoreGoingDown < climb.score) {
			climb.knobs[knob] = settingBefore - climb.nudgeSize;
			climb.score = scoreGoingDown;
			improvedSomething = true;
		} else {
			climb.knobs[knob] = settingBefore;
		}
	}

	if (!improvedSomething) {
		climb.nudgeSize = climb.nudgeSize / 2;
	}
	climb.steps++;
}

// ── counting the cost ───────────────────────────────────────────────────────

/** Two test-runs per knob, every step. */
export function testRunsPerStep(knobCount: number): number {
	return 2 * knobCount;
}

export function testRunsForTraining(knobCount: number, steps: number): number {
	return testRunsPerStep(knobCount) * steps;
}

// ── the story, printed ──────────────────────────────────────────────────────

export function main(): void {
	const random = makeRandom(7);
	const examples = makeExamples(SECRET_RULE, 60, 1, random);

	console.log("trunk/02 — Nudge and keep\n");
	console.log("Same secret rule, same 60 examples, same two knobs. This time the machine");
	console.log("starts anywhere and, every step, tries each knob a little up and a little down,");
	console.log("keeping whichever direction lowers the score. When neither helps, it takes");
	console.log("smaller nudges.\n");

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

	console.log(`\nThe secret rule was multiplier 2, add-on 3. It settled, and it stays settled.`);
	console.log(`(It lands a hair off the secret because it is fitting the wobbly examples it`);
	console.log(`was given, not the secret rule itself — that is the best anyone could do.)`);
	console.log(`It took ${climb.steps} steps and ${climb.testRuns} test-runs.\n`);

	console.log("But look at where the bill comes from: two test-runs per knob, every step.");
	console.log("Two knobs is nothing. A real machine has more.\n");
	console.log("knobs        test-runs per step   test-runs for 1,000 steps");
	for (const knobCount of [2, 10, 100, 1000, 10000]) {
		const row = [
			knobCount.toLocaleString().padStart(6),
			testRunsPerStep(knobCount).toLocaleString().padStart(21),
			testRunsForTraining(knobCount, 1000).toLocaleString().padStart(28)
		];
		console.log(row.join(""));
	}

	console.log("\nEvery one of those is a full sweep through every example, just to ask a");
	console.log("yes-or-no question about one knob.\n");
	console.log("Next problem: two test-runs per knob, every step. Fine for 2 knobs — deadly for");
	console.log("thousands. Can we know which way to nudge without trying?");
}

if (import.meta.main) {
	main();
}
