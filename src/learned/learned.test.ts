import { test, expect } from "bun:test";
import { relu } from "./activation.ts";
import { makeRandom, randomBetween } from "./random.ts";
import { makeCurveExamples, makeExamples, INPUT_HIGH, INPUT_LOW } from "./data.ts";
import { meanSquaredMistake } from "./scoring.ts";
import { Neuron } from "./neuron.ts";

test("the same seed replays the same numbers", () => {
	const first = makeRandom(99);
	const second = makeRandom(99);
	const third = makeRandom(100);

	const firstRun = [first(), first(), first()];
	const secondRun = [second(), second(), second()];
	expect(secondRun).toEqual(firstRun);
	expect([third(), third(), third()]).not.toEqual(firstRun);
});

test("the numbers land between 0 and 1, and spread out", () => {
	const random = makeRandom(5);
	let total = 0;
	for (let draw = 0; draw < 5000; draw++) {
		const value = random();
		expect(value).toBeGreaterThanOrEqual(0);
		expect(value).toBeLessThan(1);
		total += value;
	}
	expect(total / 5000).toBeCloseTo(0.5, 1);
});

test("randomBetween stays inside its bounds", () => {
	const random = makeRandom(3);
	for (let draw = 0; draw < 200; draw++) {
		const value = randomBetween(random, -2, 8);
		expect(value).toBeGreaterThanOrEqual(-2);
		expect(value).toBeLessThan(8);
	}
});

test("examples follow the rule they were given", () => {
	const rule = { multiplier: -1.5, addOn: 0.25 };
	const examples = makeExamples(rule, 200, 0, makeRandom(1));

	expect(examples).toHaveLength(200);
	for (const example of examples) {
		expect(example.x).toBeGreaterThanOrEqual(INPUT_LOW);
		expect(example.x).toBeLessThan(INPUT_HIGH);
		expect(example.y).toBeCloseTo(rule.multiplier * example.x + rule.addOn, 10);
	}
});

test("noise pushes examples off the rule, but not far", () => {
	const rule = { multiplier: 2, addOn: 3 };
	const noise = 0.5;
	for (const example of makeExamples(rule, 200, noise, makeRandom(2))) {
		const offBy = Math.abs(example.y - (rule.multiplier * example.x + rule.addOn));
		expect(offBy).toBeLessThanOrEqual(noise);
	}
});

test("curved examples bend", () => {
	for (const example of makeCurveExamples(100, 0, makeRandom(4))) {
		expect(example.y).toBeCloseTo(0.3 * example.x * example.x + 1, 10);
	}
});

test("meanSquaredMistake is zero for perfect answers and grows with the miss", () => {
	expect(meanSquaredMistake([1, 2, 3], [1, 2, 3])).toBe(0);
	expect(meanSquaredMistake([1, 2, 3], [2, 3, 4])).toBe(1);
	expect(meanSquaredMistake([0], [3])).toBe(9);
	expect(meanSquaredMistake([], [])).toBe(0);
	expect(() => meanSquaredMistake([1], [1, 2])).toThrow();
});

test("a neuron learns a straight-line rule", () => {
	const rule = { multiplier: 2, addOn: 3 };
	const examples = makeExamples(rule, 60, 0, makeRandom(7));
	const neuron = new Neuron(0, 0);
	const scoreHistory = neuron.train(examples, 300);

	expect(neuron.weight).toBeCloseTo(rule.multiplier, 2);
	expect(neuron.bias).toBeCloseTo(rule.addOn, 2);
	expect(neuron.passes).toBe(300);
	expect(scoreHistory).toHaveLength(300);
	expect(scoreHistory[299]!).toBeLessThan(scoreHistory[0]!);
});

test("ReLU keeps positive numbers and replaces negative numbers with zero", () => {
	expect(relu(3)).toBe(3);
	expect(relu(0)).toBe(0);
	expect(relu(-3)).toBe(0);
});
