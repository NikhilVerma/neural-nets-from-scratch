import { test, expect } from "bun:test";
import { makeRandom } from "../../../learned/random.ts";
import { makeExamples } from "../../../learned/data.ts";
import {
	EXAMPLE_COUNT,
	NOISE,
	nudgeStep,
	SECRET_FORMULA,
	SEED,
	START,
	startClimb,
	testRun,
	testRunsPerStep
} from "./main.ts";

function noiselessExamples() {
	return makeExamples(SECRET_FORMULA, 60, 0, makeRandom(7));
}

test("nudging finds the formula", () => {
	const examples = noiselessExamples();
	const climb = startClimb(examples, { multiplier: -3.2, addOn: 4.1 });

	for (let step = 0; step < 200; step++) {
		nudgeStep(climb, examples);
	}

	expect(climb.setting.multiplier).toBeCloseTo(SECRET_FORMULA.multiplier, 1);
	expect(climb.setting.addOn).toBeCloseTo(SECRET_FORMULA.addOn, 1);
});

test("it settles: the final score is essentially zero", () => {
	const examples = noiselessExamples();
	const climb = startClimb(examples, { multiplier: -3.2, addOn: 4.1 });

	for (let step = 0; step < 200; step++) {
		nudgeStep(climb, examples);
	}

	expect(climb.score).toBeLessThan(1e-6);
});

test("the score never gets worse, step after step", () => {
	const examples = noiselessExamples();
	const climb = startClimb(examples, { multiplier: 4, addOn: -4 });

	let previousScore = climb.score;
	for (let step = 0; step < 200; step++) {
		nudgeStep(climb, examples);
		expect(climb.score).toBeLessThanOrEqual(previousScore);
		previousScore = climb.score;
	}
});

test("a step that finds nothing halves the nudge and moves nothing", () => {
	const examples = noiselessExamples();
	// Start exactly on the answer: no nudge in any direction can improve on it.
	const climb = startClimb(examples, {
		multiplier: SECRET_FORMULA.multiplier,
		addOn: SECRET_FORMULA.addOn
	});
	const nudgeBefore = climb.nudgeSize;

	nudgeStep(climb, examples);

	expect(climb.nudgeSize).toBe(nudgeBefore / 2);
	expect(climb.setting.multiplier).toBe(SECRET_FORMULA.multiplier);
	expect(climb.setting.addOn).toBe(SECRET_FORMULA.addOn);
});

test("two numbers cost exactly four test-runs a step", () => {
	const examples = noiselessExamples();
	const climb = startClimb(examples, { multiplier: 0, addOn: 0 });

	for (let step = 1; step <= 50; step++) {
		nudgeStep(climb, examples);
		expect(climb.testRuns).toBe(4 * climb.steps);
	}
});

test("the bill grows with the count of numbers the engine holds", () => {
	expect(testRunsPerStep(2)).toBe(4);
	expect(testRunsPerStep(10000)).toBe(20000);
	// The bill demo and the terminal both price a thousand steps from this.
	expect(testRunsPerStep(10000) * 1000).toBe(20_000_000);
});

test("a test-run is one honest sweep of every example", () => {
	const examples = noiselessExamples();
	expect(testRun(SECRET_FORMULA, examples)).toBeCloseTo(0, 10);
	expect(testRun({ multiplier: 2, addOn: 4 }, examples)).toBeCloseTo(1, 10);
});

// The page quotes these numbers, so a change to the code that moves them should fail
// here rather than quietly make the lesson wrong.
test("the run the lesson quotes: 60 steps from multiplier -3.2, add-on 4.1", () => {
	const random = makeRandom(SEED);
	const examples = makeExamples(SECRET_FORMULA, EXAMPLE_COUNT, NOISE, random);
	const climb = startClimb(examples, START);

	expect(climb.score.toFixed(4)).toBe("198.6096");

	for (let step = 1; step <= 20; step++) nudgeStep(climb, examples);
	expect(climb.nudgeSize.toPrecision(3)).toBe("0.00391");
	expect(climb.score.toFixed(4)).toBe("0.3764");

	for (let step = 21; step <= 60; step++) nudgeStep(climb, examples);
	expect(climb.steps).toBe(60);
	expect(climb.testRuns).toBe(240);
	expect(climb.score.toFixed(4)).toBe("0.3763");
	expect(climb.setting.multiplier.toFixed(4)).toBe("2.0590");
	expect(climb.setting.addOn.toFixed(4)).toBe("3.1742");
	// "the nudge halved thirty-one times over"
	expect(climb.nudgeSize).toBe(2 ** -31);
});

// The opening of this lesson quotes lesson 01's 20,000-roll run. This pins those numbers
// to lesson 01's actual code, so editing 01 without updating 02's prose fails.
import {
	SEED as LESSON_01_SEED,
	EXAMPLE_COUNT as LESSON_01_EXAMPLE_COUNT,
	BUDGET as LESSON_01_BUDGET,
	makeRandom as lesson01MakeRandom,
	makeExamples as lesson01MakeExamples,
	startSearch,
	tryOneGuess
} from "../01-guess-and-check/main.ts";

test("the lesson-01 run quoted in this lesson's opening still happens exactly that way", () => {
	const random = lesson01MakeRandom(LESSON_01_SEED);
	const examples = lesson01MakeExamples(LESSON_01_EXAMPLE_COUNT, random);
	const search = startSearch();
	const records: number[] = [];
	for (let guess = 1; guess <= LESSON_01_BUDGET; guess++) {
		tryOneGuess(search, examples, random);
		if (search.guessesSinceImprovement === 0) records.push(guess);
	}
	expect(records).toEqual([1, 4, 40, 97, 1002, 1748, 10222, 11565]);
	expect(LESSON_01_BUDGET - 11565).toBe(8435);
	// The opening also quotes 20,000 rolls, and where lesson 01 finished.
	expect(LESSON_01_BUDGET).toBe(20000);
	expect(search.best.multiplier.toFixed(3)).toBe("2.075");
	expect(search.best.addOn.toFixed(3)).toBe("3.204");
});
