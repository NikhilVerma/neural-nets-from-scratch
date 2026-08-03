import { test, expect } from "bun:test";
import { makeRandom } from "../../../learned/random.ts";
import { makeCurveExamples, makeExamples } from "../../../learned/data.ts";
import { nudgeStep, startClimb } from "../02-nudge-and-keep/main.ts";
import { SECRET_RULE, SlopeMachine } from "./main.ts";

const START = { multiplier: -3.2, addOn: 4.1 };

function lineExamples() {
	return makeExamples(SECRET_RULE, 60, 0, makeRandom(7));
}

test("following the slope finds the rule", () => {
	const examples = lineExamples();
	const machine = new SlopeMachine(START.multiplier, START.addOn);

	for (let pass = 0; pass < 300; pass++) {
		machine.step(examples);
	}

	expect(machine.weight).toBeCloseTo(SECRET_RULE.multiplier, 1);
	expect(machine.bias).toBeCloseTo(SECRET_RULE.addOn, 1);
	expect(machine.scoreOn(examples)).toBeLessThan(0.01);
});

test("the slope points the way the score actually moves", () => {
	const examples = lineExamples();
	const machine = new SlopeMachine(START.multiplier, START.addOn);
	const { weightSlope, biasSlope } = machine.slopesOn(examples);
	const scoreHere = machine.scoreOn(examples);

	// Nudge each knob a hair uphill and check the score moved the way the slope said.
	const hair = 0.0001;
	const nudgedWeight = new SlopeMachine(machine.weight + hair, machine.bias);
	const nudgedBias = new SlopeMachine(machine.weight, machine.bias + hair);

	expect((nudgedWeight.scoreOn(examples) - scoreHere) / hair).toBeCloseTo(weightSlope, 2);
	expect((nudgedBias.scoreOn(examples) - scoreHere) / hair).toBeCloseTo(biasSlope, 2);
});

test("it gets there for less than nudging costs", () => {
	const examples = lineExamples();
	const target = 0.001;

	const machine = new SlopeMachine(START.multiplier, START.addOn);
	while (machine.scoreOn(examples) > target && machine.passes < 10000) {
		machine.step(examples);
	}

	const climb = startClimb(examples, START);
	while (climb.score > target && climb.steps < 10000) {
		nudgeStep(climb, examples);
	}

	// Both reached the same score. One sweep of the examples is the unit of work either way.
	expect(machine.scoreOn(examples)).toBeLessThanOrEqual(target);
	expect(climb.score).toBeLessThanOrEqual(target);
	expect(machine.passes).toBeLessThan(climb.testRuns);
});

test("on curved data the score floors out far above zero", () => {
	const curved = makeCurveExamples(60, 0, makeRandom(11));
	const machine = new SlopeMachine(0, 0);

	for (let pass = 0; pass < 3000; pass++) {
		machine.step(curved);
	}

	const scoreAtEnd = machine.scoreOn(curved);
	expect(scoreAtEnd).toBeGreaterThan(3);

	// And it is not still descending — a thousand more passes change nothing.
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
