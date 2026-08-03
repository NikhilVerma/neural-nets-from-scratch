/**
 * trunk/03 — Follow the slope.
 * Runnable on its own: bun run main.ts
 *
 * Imports the pieces trunk/01 taught. The slope-following is written out below.
 * From here on the code uses the standard names for the two knobs: weight and bias.
 */

import { makeRandom } from "../../../learned/random.ts";
import {
	makeExamples,
	makeCurveExamples,
	type Example,
	type LineRule
} from "../../../learned/data.ts";
import { meanSquaredMistake } from "../../../learned/scoring.ts";
import { nudgeStep, startClimb } from "../02-nudge-and-keep/main.ts";

export const SECRET_RULE: LineRule = { multiplier: 2, addOn: 3 };

/** How far we move along the slope each pass. */
export const STEP_SIZE = 0.06;

export interface Slopes {
	weightSlope: number;
	biasSlope: number;
}

export class SlopeMachine {
	weight: number;
	bias: number;
	stepSize: number;
	/** How many times we have walked the examples. This is the whole bill. */
	passes = 0;

	constructor(weight: number, bias: number, stepSize: number = STEP_SIZE) {
		this.weight = weight;
		this.bias = bias;
		this.stepSize = stepSize;
	}

	predict(x: number): number {
		return this.weight * x + this.bias;
	}

	scoreOn(examples: Example[]): number {
		const predictions = examples.map(example => this.predict(example.x));
		const actuals = examples.map(example => example.y);
		return meanSquaredMistake(predictions, actuals);
	}

	/**
	 * How much the score changes per unit turn of each knob, read straight off the
	 * score formula. Score is the average of (weight * x + bias - y) squared, so
	 * turning the weight knob moves each mistake by x, and turning the bias knob moves
	 * each mistake by 1 — and squaring brings down a factor of 2 times the mistake.
	 */
	slopesOn(examples: Example[]): Slopes {
		let weightSlope = 0;
		let biasSlope = 0;
		for (const example of examples) {
			const mistake = this.predict(example.x) - example.y;
			weightSlope += 2 * mistake * example.x;
			biasSlope += 2 * mistake;
		}
		return {
			weightSlope: weightSlope / examples.length,
			biasSlope: biasSlope / examples.length
		};
	}

	/** Walk the examples once, then move both knobs downhill. */
	step(examples: Example[]): void {
		const { weightSlope, biasSlope } = this.slopesOn(examples);
		this.weight -= this.stepSize * weightSlope;
		this.bias -= this.stepSize * biasSlope;
		this.passes++;
	}
}

// ── the story, printed ──────────────────────────────────────────────────────

export function main(): void {
	const random = makeRandom(7);
	const examples = makeExamples(SECRET_RULE, 60, 1, random);

	console.log("trunk/03 — Follow the slope\n");
	console.log("Same secret rule, same 60 examples. But now we stop poking the knobs to find");
	console.log("out which way is downhill. The score is a formula, so we can ask the formula");
	console.log("directly: if I turned this knob a hair, how much would the score move?\n");

	const machine = new SlopeMachine(-3.2, 4.1);
	const firstSlopes = machine.slopesOn(examples);
	console.log(`Standing at multiplier ${machine.weight}, add-on ${machine.bias}:`);
	console.log(`  score ${machine.scoreOn(examples).toFixed(4)}`);
	console.log(
		`  turning the multiplier up moves the score by ${firstSlopes.weightSlope.toFixed(2)} per unit`
	);
	console.log(
		`  turning the add-on up moves the score by ${firstSlopes.biasSlope.toFixed(2)} per unit`
	);
	console.log("A negative number means turning that knob up would lower the score, so the");
	console.log("machine moves each knob against its slope. Nothing was tried to learn this.\n");

	console.log(" passes   score       rule");
	for (let pass = 1; pass <= 200; pass++) {
		machine.step(examples);
		if (pass <= 3 || pass === 10 || pass === 30 || pass === 100 || pass === 200) {
			const row = [
				String(machine.passes).padStart(7),
				`   ${machine.scoreOn(examples).toFixed(4)}`.padEnd(12),
				`multiplier ${machine.weight.toFixed(4)}, add-on ${machine.bias.toFixed(4)}`
			];
			console.log(row.join(""));
		}
	}

	// The same job, priced against trunk/02's method, on the same examples.
	const target = machine.scoreOn(examples) + 0.001;
	const raceMachine = new SlopeMachine(-3.2, 4.1);
	while (raceMachine.scoreOn(examples) > target && raceMachine.passes < 5000) {
		raceMachine.step(examples);
	}
	const climb = startClimb(examples, { multiplier: -3.2, addOn: 4.1 });
	while (climb.score > target && climb.steps < 5000) {
		nudgeStep(climb, examples);
	}

	console.log(`\nBoth methods, same examples, same starting spot, down to a score of`);
	console.log(`${target.toFixed(4)}:`);
	console.log(`  nudge and keep: ${climb.testRuns} test-runs`);
	console.log(`  follow the slope: ${raceMachine.passes} passes`);
	console.log("And that gap only widens: nudging pays two test-runs per knob, while one");
	console.log("pass hands back a slope for every knob at once.\n");

	// Watch it break: the same machine, on data that bends.
	const curveRandom = makeRandom(11);
	const curved = makeCurveExamples(60, 1, curveRandom);
	const curveMachine = new SlopeMachine(0, 0);

	console.log("Now the same machine on data that bends: y is 0.3 times x times x, plus 1.\n");
	console.log(" passes   score       rule");
	for (let pass = 1; pass <= 2000; pass++) {
		curveMachine.step(curved);
		if (pass === 10 || pass === 100 || pass === 500 || pass === 2000) {
			const row = [
				String(curveMachine.passes).padStart(7),
				`   ${curveMachine.scoreOn(curved).toFixed(4)}`.padEnd(12),
				`multiplier ${curveMachine.weight.toFixed(4)}, add-on ${curveMachine.bias.toFixed(4)}`
			];
			console.log(row.join(""));
		}
	}

	console.log(`\nThe score stops falling and sits there. It is not stuck part-way downhill —`);
	console.log(`it is at the bottom. That flat line really is the best straight line through`);
	console.log(`curved data, and the best straight line is nowhere near good enough.\n`);
	console.log("Next problem: our machine is multiply-then-add — a straight line. Feed it");
	console.log("curved data and it fails forever. Not slow: incapable.");
}

if (import.meta.main) {
	main();
}
