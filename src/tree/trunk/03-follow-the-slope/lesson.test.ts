import { test, expect } from "bun:test";
import { makeRandom } from "../../../learned/random.ts";
import { makeCurveExamples, makeExamples } from "../../../learned/data.ts";
import {
	CURVE_SEED,
	EXAMPLE_COUNT,
	NOISE,
	passesToReach,
	SECRET_FORMULA,
	SEED,
	SlopeEngine,
	START,
	testRunsToReach
} from "./main.ts";

function lineExamples() {
	return makeExamples(SECRET_FORMULA, 60, 0, makeRandom(7));
}

test("following the slope finds the formula", () => {
	const examples = lineExamples();
	const engine = new SlopeEngine(START.weight, START.bias);

	for (let pass = 0; pass < 300; pass++) {
		engine.step(examples);
	}

	expect(engine.weight).toBeCloseTo(SECRET_FORMULA.multiplier, 1);
	expect(engine.bias).toBeCloseTo(SECRET_FORMULA.addOn, 1);
	expect(engine.scoreOn(examples)).toBeLessThan(0.01);
});

test("the slope says how far the score really moves", () => {
	const examples = lineExamples();
	const engine = new SlopeEngine(START.weight, START.bias);
	const { weightSlope, biasSlope } = engine.slopesOn(examples);
	const scoreHere = engine.scoreOn(examples);

	// Turn each number up by a hair and measure. The algebra should predict what we see.
	const hair = 0.0001;
	const nudgedWeight = new SlopeEngine(engine.weight + hair, engine.bias);
	const nudgedBias = new SlopeEngine(engine.weight, engine.bias + hair);

	expect((nudgedWeight.scoreOn(examples) - scoreHere) / hair).toBeCloseTo(weightSlope, 2);
	expect((nudgedBias.scoreOn(examples) - scoreHere) / hair).toBeCloseTo(biasSlope, 2);
});

test("one pass produces the slope for every number the engine holds", () => {
	const examples = lineExamples();
	const engine = new SlopeEngine(START.weight, START.bias);
	engine.step(examples);

	// Lesson 02 pays two test-runs per number per step; this pays one pass, whatever the count.
	expect(engine.passes).toBe(1);
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

// The lesson quotes this race, so a change that moves either count should fail here
// rather than quietly make the page wrong.
test("the race the lesson quotes: 52 test-runs against 26 passes", () => {
	const examples = makeExamples(SECRET_FORMULA, EXAMPLE_COUNT, NOISE, makeRandom(SEED));
	const engine = new SlopeEngine(START.weight, START.bias);
	for (let pass = 0; pass < 200; pass++) engine.step(examples);

	// The floor both methods settle on, and the two numbers they settle at.
	expect(engine.scoreOn(examples).toFixed(4)).toBe("0.3763");
	expect(engine.weight.toFixed(4)).toBe("2.0590");
	expect(engine.bias.toFixed(4)).toBe("3.1742");

	const target = engine.scoreOn(examples) + 0.001;
	expect(target.toFixed(4)).toBe("0.3773");
	expect(testRunsToReach(target, examples, START)).toBe(52);
	expect(passesToReach(target, examples, START)).toBe(26);
});

test("on curved data the score floors out far above zero", () => {
	const curved = makeCurveExamples(60, 0, makeRandom(11));
	const engine = new SlopeEngine(0, 0);

	for (let pass = 0; pass < 3000; pass++) {
		engine.step(curved);
	}

	const scoreAtEnd = engine.scoreOn(curved);
	expect(scoreAtEnd).toBeGreaterThan(3);

	// And it is not still descending: the slopes are at zero and a thousand more passes
	// change nothing. The engine has arrived, and the answer is still wrong.
	const slopes = engine.slopesOn(curved);
	expect(Math.abs(slopes.weightSlope)).toBeLessThan(1e-6);
	expect(Math.abs(slopes.biasSlope)).toBeLessThan(1e-6);

	for (let pass = 0; pass < 1000; pass++) {
		engine.step(curved);
	}
	expect(engine.scoreOn(curved)).toBeCloseTo(scoreAtEnd, 6);
});

// The "watch it break" section quotes both of these floors, and calls the curve twelve
// times worse than the line.
test("the two floors the lesson quotes: 0.3763 on the line, 4.7333 on the curve", () => {
	const line = makeExamples(SECRET_FORMULA, EXAMPLE_COUNT, NOISE, makeRandom(SEED));
	const curved = makeCurveExamples(EXAMPLE_COUNT, NOISE, makeRandom(CURVE_SEED));

	const onLine = new SlopeEngine(0, 0);
	const onCurve = new SlopeEngine(0, 0);
	for (let pass = 0; pass < 200; pass++) {
		onLine.step(line);
		onCurve.step(curved);
	}

	expect(onLine.scoreOn(line).toFixed(4)).toBe("0.3763");
	expect(onCurve.scoreOn(curved).toFixed(4)).toBe("4.7333");
	const timesWorse = onCurve.scoreOn(curved) / onLine.scoreOn(line);
	expect(timesWorse).toBeGreaterThan(12);
	expect(timesWorse).toBeLessThan(13);
});

test("straight data goes near zero, curved data does not — same engine", () => {
	const straight = lineExamples();
	const curved = makeCurveExamples(60, 0, makeRandom(11));

	const onStraight = new SlopeEngine(0, 0);
	const onCurve = new SlopeEngine(0, 0);
	for (let pass = 0; pass < 2000; pass++) {
		onStraight.step(straight);
		onCurve.step(curved);
	}

	expect(onStraight.scoreOn(straight)).toBeLessThan(0.001);
	expect(onCurve.scoreOn(curved)).toBeGreaterThan(3);
});

test("a step size past 0.14 blows up on this data", () => {
	const examples = makeExamples(SECRET_FORMULA, EXAMPLE_COUNT, NOISE, makeRandom(SEED));

	const steady = new SlopeEngine(START.weight, START.bias, 0.06);
	const runaway = new SlopeEngine(START.weight, START.bias, 0.15);
	for (let pass = 0; pass < 200; pass++) {
		steady.step(examples);
		runaway.step(examples);
	}

	expect(steady.scoreOn(examples)).toBeLessThan(1);
	expect(runaway.scoreOn(examples)).toBeGreaterThan(1e6);
});
