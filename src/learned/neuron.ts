// Taught at trunk/03-follow-the-slope — go there for the why.

import { meanSquaredMistake } from "./scoring.ts";
import type { Example } from "./data.ts";

export interface Slopes {
	weightSlope: number;
	biasSlope: number;
}

/**
 * One neuron: multiply by a weight, add a bias, and learn both by following
 * the slope of the mistake-score downhill.
 */
export class Neuron {
	weight: number;
	bias: number;
	stepSize: number;
	/** How many times the examples have been walked. */
	passes = 0;

	constructor(weight = 0, bias = 0, stepSize = 0.06) {
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

	/** How much the score moves per unit turn of each knob, read off the score formula. */
	slopesOn(examples: Example[]): Slopes {
		if (examples.length === 0) return { weightSlope: 0, biasSlope: 0 };

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

	/** Take many steps, keeping the score after each one. */
	train(examples: Example[], stepCount: number): number[] {
		const scoreHistory: number[] = [];
		for (let index = 0; index < stepCount; index++) {
			this.step(examples);
			scoreHistory.push(this.scoreOn(examples));
		}
		return scoreHistory;
	}
}
