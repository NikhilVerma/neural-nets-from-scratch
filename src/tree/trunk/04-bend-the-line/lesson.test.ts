import { expect, test } from "bun:test";
import { makeCurveExamples } from "../../../learned/data.ts";
import { makeRandom } from "../../../learned/random.ts";
import {
	BentEngine,
	CURVE_SEED,
	EXAMPLE_COUNT,
	NOISE,
	relu,
	trainBentEngine,
	trainStraightEngine,
	twoStraightSteps
} from "./main.ts";

function curveExamples() {
	return makeCurveExamples(EXAMPLE_COUNT, NOISE, makeRandom(CURVE_SEED));
}

test("two straight steps collapse into one straight step", () => {
	const first = { weight: 1.7, bias: -0.4 };
	const second = { weight: -0.8, bias: 2.1 };
	const collapsedWeight = second.weight * first.weight;
	const collapsedBias = second.weight * first.bias + second.bias;

	for (let x = -5; x <= 5; x += 0.1) {
		const twoSteps = twoStraightSteps(x, first.weight, first.bias, second.weight, second.bias);
		expect(twoSteps).toBeCloseTo(collapsedWeight * x + collapsedBias, 12);
	}
});

test("ReLU keeps positive numbers and replaces negative numbers with zero", () => {
	expect(relu(3)).toBe(3);
	expect(relu(0)).toBe(0);
	expect(relu(-3)).toBe(0);
});

test("a bend weight changes only the side after its bend point", () => {
	const engine = new BentEngine();
	engine.bendWeights[1] = 2; // this bend turns on at -1

	expect(engine.predict(-2)).toBe(0);
	expect(engine.predict(-1)).toBe(0);
	expect(engine.predict(0)).toBe(2);
	expect(engine.predict(1)).toBe(4);
});

test("the bent engine follows the curve far better than a straight engine", () => {
	const examples = curveExamples();
	const straight = trainStraightEngine(examples, 2000);
	const bent = trainBentEngine(examples, 5000);

	expect(straight.scoreOn(examples)).toBeGreaterThan(4);
	expect(bent.scoreOn(examples)).toBeLessThan(0.5);
	expect(bent.scoreOn(examples)).toBeLessThan(straight.scoreOn(examples) / 10);
});

test("the scores quoted in the lesson come from the seeded run", () => {
	const examples = curveExamples();
	const straight = trainStraightEngine(examples, 2000);
	const bentAt1000 = trainBentEngine(examples, 1000);
	const bentAt5000 = trainBentEngine(examples, 5000);

	expect(straight.scoreOn(examples).toFixed(4)).toBe("4.7333");
	expect(bentAt1000.scoreOn(examples).toFixed(4)).toBe("0.4782");
	expect(bentAt5000.scoreOn(examples).toFixed(4)).toBe("0.4315");
});

test("the current engine still accepts exactly one input", () => {
	const engine = trainBentEngine(curveExamples(), 1000);
	const answerWhenSecondInputIsFour = engine.predict(3);
	const answerWhenSecondInputIsZero = engine.predict(3);

	expect(answerWhenSecondInputIsFour).toBe(answerWhenSecondInputIsZero);
	expect(3 + 4).not.toBe(3 + 0);
});
