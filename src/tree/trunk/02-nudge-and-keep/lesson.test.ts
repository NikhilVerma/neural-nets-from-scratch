import { test, expect } from "bun:test";
import { makeRandom } from "../../../learned/random.ts";
import { makeExamples } from "../../../learned/data.ts";
import {
	nudgeStep,
	SECRET_RULE,
	startClimb,
	testRun,
	testRunsForTraining,
	testRunsPerStep
} from "./main.ts";

function noiselessExamples() {
	return makeExamples(SECRET_RULE, 60, 0, makeRandom(7));
}

test("nudging finds the rule", () => {
	const examples = noiselessExamples();
	const climb = startClimb(examples, { multiplier: -3.2, addOn: 4.1 });

	for (let step = 0; step < 200; step++) {
		nudgeStep(climb, examples);
	}

	expect(climb.knobs.multiplier).toBeCloseTo(SECRET_RULE.multiplier, 1);
	expect(climb.knobs.addOn).toBeCloseTo(SECRET_RULE.addOn, 1);
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

test("two knobs cost exactly four test-runs a step", () => {
	const examples = noiselessExamples();
	const climb = startClimb(examples, { multiplier: 0, addOn: 0 });

	for (let step = 1; step <= 50; step++) {
		nudgeStep(climb, examples);
		expect(climb.testRuns).toBe(4 * climb.steps);
	}
});

test("the bill grows with the number of knobs", () => {
	expect(testRunsPerStep(2)).toBe(4);
	expect(testRunsPerStep(10000)).toBe(20000);
	expect(testRunsForTraining(10000, 1000)).toBe(20_000_000);
});

test("a test-run is one honest sweep of every example", () => {
	const examples = noiselessExamples();
	expect(testRun(SECRET_RULE, examples)).toBeCloseTo(0, 10);
	expect(testRun({ multiplier: 2, addOn: 4 }, examples)).toBeCloseTo(1, 10);
});
