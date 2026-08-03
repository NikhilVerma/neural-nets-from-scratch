import { test, expect } from "bun:test";
import { makeRandom } from "../../../learned/random.ts";
import { makeCurveExamples, makeExamples } from "../../../learned/data.ts";
import { passesToReach, SECRET_RULE, SlopeMachine, testRunsToReach, type Start } from "./main.ts";

const START: Start = { weight: -3.2, bias: 4.1 };

function lineExamples() {
	return makeExamples(SECRET_RULE, 60, 0, makeRandom(7));
}

test("following the slope finds the rule", () => {
	const examples = lineExamples();
	const machine = new SlopeMachine(START.weight, START.bias);

	for (let pass = 0; pass < 300; pass++) {
		machine.step(examples);
	}

	expect(machine.weight).toBeCloseTo(SECRET_RULE.multiplier, 1);
	expect(machine.bias).toBeCloseTo(SECRET_RULE.addOn, 1);
	expect(machine.scoreOn(examples)).toBeLessThan(0.01);
});

test("the slope says how far the score really moves", () => {
	const examples = lineExamples();
	const machine = new SlopeMachine(START.weight, START.bias);
	const { weightSlope, biasSlope } = machine.slopesOn(examples);
	const scoreHere = machine.scoreOn(examples);

	// Turn each knob up by a hair and measure. The algebra should predict what we see.
	const hair = 0.0001;
	const nudgedWeight = new SlopeMachine(machine.weight + hair, machine.bias);
	const nudgedBias = new SlopeMachine(machine.weight, machine.bias + hair);

	expect((nudgedWeight.scoreOn(examples) - scoreHere) / hair).toBeCloseTo(weightSlope, 2);
	expect((nudgedBias.scoreOn(examples) - scoreHere) / hair).toBeCloseTo(biasSlope, 2);
});

test("one pass produces the slope for every knob", () => {
	const examples = lineExamples();
	const machine = new SlopeMachine(START.weight, START.bias);
	machine.step(examples);

	// Lesson 02 pays two test-runs per knob per step; this pays one pass, whatever the knobs.
	expect(machine.passes).toBe(1);
});

test("it reaches the same score for fewer sweeps than nudging", () => {
	const examples = lineExamples();
	const target = 0.001;

	const passes = passesToReach(target, examples, START);
	const testRuns = testRunsToReach(target, examples, START);

	// A pass and a test-run are the same unit of work: one sweep of every example.
	expect(passes).toBeGreaterThan(0);
	expect(passes).toBeLessThan(testRuns);
});

test("on curved data the score floors out far above zero", () => {
	const curved = makeCurveExamples(60, 0, makeRandom(11));
	const machine = new SlopeMachine(0, 0);

	for (let pass = 0; pass < 3000; pass++) {
		machine.step(curved);
	}

	const scoreAtEnd = machine.scoreOn(curved);
	expect(scoreAtEnd).toBeGreaterThan(3);

	// And it is not still descending: the slopes are at zero and a thousand more passes
	// change nothing. The machine has arrived, and the answer is still wrong.
	const slopes = machine.slopesOn(curved);
	expect(Math.abs(slopes.weightSlope)).toBeLessThan(1e-6);
	expect(Math.abs(slopes.biasSlope)).toBeLessThan(1e-6);

	for (let pass = 0; pass < 1000; pass++) {
		machine.step(curved);
	}
	expect(machine.scoreOn(curved)).toBeCloseTo(scoreAtEnd, 6);
});

test("straight data goes near zero, curved data does not — same machine", () => {
	const straight = lineExamples();
	const curved = makeCurveExamples(60, 0, makeRandom(11));

	const onStraight = new SlopeMachine(0, 0);
	const onCurve = new SlopeMachine(0, 0);
	for (let pass = 0; pass < 2000; pass++) {
		onStraight.step(straight);
		onCurve.step(curved);
	}

	expect(onStraight.scoreOn(straight)).toBeLessThan(0.001);
	expect(onCurve.scoreOn(curved)).toBeGreaterThan(3);
});

test("a step size past 0.14 blows up on this data", () => {
	const examples = makeExamples(SECRET_RULE, 60, 1, makeRandom(7));

	const steady = new SlopeMachine(START.weight, START.bias, 0.06);
	const runaway = new SlopeMachine(START.weight, START.bias, 0.15);
	for (let pass = 0; pass < 200; pass++) {
		steady.step(examples);
		runaway.step(examples);
	}

	expect(steady.scoreOn(examples)).toBeLessThan(1);
	expect(runaway.scoreOn(examples)).toBeGreaterThan(1e6);
});
