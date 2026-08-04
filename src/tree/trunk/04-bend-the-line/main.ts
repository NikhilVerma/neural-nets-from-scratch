//! show: none
/*
## Today we will make the engine bend

In the last lesson, we gave our engine examples from a curved formula. The engine followed
the slope all the way to the lowest mistake-score it could reach. It still drew a straight
line through a curve, because multiplying once and adding once can only draw a straight line.

Today we will change what the engine can draw. We will start with the obvious idea: put one
multiply-and-add step after another. We will watch that idea fail, add one small operation
between the steps, and then train an engine that follows the curve from the last lesson.
*/

/*
## What we carry forward

Lesson 01 gave us examples and the mistake-score. We import those two pieces because this
lesson changes the engine's shape, not the way we store examples or score its answers.
*/

//! code: imports
import type { Example } from "../../../learned/data.ts";
import { meanSquaredMistake } from "../../../learned/scoring.ts";

/*
## First try: put two straight steps together

Take an input `x`. The first step multiplies it by `firstWeight` and adds `firstBias`. The
second step takes that answer, multiplies it by `secondWeight`, and adds `secondBias`.

It sounds as if two steps should make a more capable engine. Here is the whole calculation.
*/

//! code: two-straight-steps
export function twoStraightSteps(
	x: number,
	firstWeight: number,
	firstBias: number,
	secondWeight: number,
	secondBias: number
): number {
	const firstAnswer = firstWeight * x + firstBias;
	return secondWeight * firstAnswer + secondBias;
}

/*
Now multiply out the second line.

$$
secondWeight × (firstWeight × x + firstBias) + secondBias
$$

The two multiplications become one multiplication. The two additions become one addition.

$$
(secondWeight × firstWeight) × x + (secondWeight × firstBias + secondBias)
$$

We built two straight steps, but together they are still one straight step. The demo draws
the two-step answer and the collapsed answer on top of each other. Move every slider. The
two lines stay on top of each other because they are the same calculation written two ways.
*/

//! demo: collapse

/*
## Add one bend between the steps

We need an operation that a straight line cannot absorb. We will use this one:

- keep positive numbers unchanged
- replace negative numbers with zero

The code has one line. Give it 3 and it returns 3. Give it -3 and it returns 0. At zero,
the answer changes direction. That corner is the bend we were missing.
*/

//! code: relu
export function relu(value: number): number {
	return Math.max(0, value);
}

/*
Put `relu` between the two straight steps and the algebra can no longer collapse them. Before
the first answer reaches zero, the second step receives zero. After that point, the second
step receives a line. Press **Add the bend** in the demo above and one side of the line folds
flat.

One bend is not enough to follow the rounded curve from the last lesson, so we will use four.
We place them at -3, -1, 1, and 3, spread across the inputs from -5 to 5. Each bend stays
quiet before its point and becomes a straight line after it. The engine learns how much of
each bent line to add to its answer.

We are choosing the four bend points ourselves. That gives the engine a useful hint, much as
lesson 01 told it that the hidden formula contained a multiplication and an addition. We keep
one new idea in view at a time. Later lessons will let the engine learn far more of its own
shape.
*/

//! code: bend-points
export const BEND_POINTS = [-3, -1, 1, 3];

/*
## The bent engine

The engine begins with the straight line it already knows: `baselineWeight × x + bias`.
Then it walks through the four bend points. At each point it adds a bent line, multiplied by
the amount stored in `bendWeights`.

If every bend weight is zero, this is the old straight engine. As the bend weights change,
the slope of the answer can change four times. Five straight pieces can now join into one
curved-looking answer.

Training uses the slope calculation from lesson 03. For each example, `scoreSlope` says how
the mistake-score moves when the engine's answer moves. The baseline weight multiplies `x`,
so its slope gets `scoreSlope × x`. The bias is added directly, so its slope gets
`scoreSlope`. A bend weight multiplies `relu(x - bendPoint)`, so its slope gets
`scoreSlope × relu(x - bendPoint)`.
*/

//! hide
export interface BendSlopes {
	baselineWeight: number;
	bias: number;
	bendWeights: number[];
}
//! end

//! code: BentEngine
export class BentEngine {
	baselineWeight = 0;
	bias = 0;
	bendWeights = BEND_POINTS.map(() => 0);
	passes = 0;
	stepSize: number;

	constructor(stepSize = 0.003) {
		this.stepSize = stepSize;
	}

	predict(x: number): number {
		let answer = this.baselineWeight * x + this.bias;
		for (let index = 0; index < BEND_POINTS.length; index++) {
			const bentLine = relu(x - BEND_POINTS[index]!);
			answer += this.bendWeights[index]! * bentLine;
		}
		return answer;
	}

	scoreOn(examples: Example[]): number {
		const predictions = examples.map(example => this.predict(example.x));
		const wanted = examples.map(example => example.y);
		return meanSquaredMistake(predictions, wanted);
	}

	step(examples: Example[]): void {
		const slopes = this.slopesOn(examples);
		this.baselineWeight -= this.stepSize * slopes.baselineWeight;
		this.bias -= this.stepSize * slopes.bias;
		for (let index = 0; index < this.bendWeights.length; index++) {
			this.bendWeights[index]! -= this.stepSize * slopes.bendWeights[index]!;
		}
		this.passes++;
	}

	private slopesOn(examples: Example[]): BendSlopes {
		const slopes: BendSlopes = {
			baselineWeight: 0,
			bias: 0,
			bendWeights: BEND_POINTS.map(() => 0)
		};

		for (const example of examples) {
			const mistake = this.predict(example.x) - example.y;
			const scoreSlope = (2 * mistake) / examples.length;
			slopes.baselineWeight += scoreSlope * example.x;
			slopes.bias += scoreSlope;
			for (let index = 0; index < BEND_POINTS.length; index++) {
				slopes.bendWeights[index]! += scoreSlope * relu(example.x - BEND_POINTS[index]!);
			}
		}

		return slopes;
	}
}

/*
We still wrote every slope by hand. That is manageable for this small engine. Keep that cost
in mind as the engines grow, because it becomes a problem of its own in lesson 07.
*/

//! show: BentEngine
/*
## Watch it follow the curve

The grey dots below are the same 60 curved examples from lesson 03. The pale line is the best
straight answer from that lesson. Its mistake-score stops at **4.7333**. The green line is the
bent engine.

Press **250 passes** a few times. After 1,000 passes, the bent engine scores **0.4782**. After
5,000 passes, it scores **0.4315**. The green line is made from straight pieces, but the pieces
meet at the four bends and follow the curve together.
*/

//! demo: training

/*
## Watch the next limit appear

The bent engine can now turn one input into one curved answer. It still accepts only one input.

Suppose the job is to add two numbers. If the first number is 3 and the second is 4, the answer
should be 7. If the first number stays 3 and the second becomes 0, the answer should be 3. Our
engine receives only the first number, so both examples look identical to it: input 3. The
second number never enters `predict`, and no amount of training can recover a number it never
received.

Move the second-number slider below. The answer we want changes, while the value handed to the
engine stays at 3. This is not another search problem. We have reached the edge of the engine's
shape again.
*/

//! demo: missing-input

/*
> One input, one output is a toy. Real questions have hundreds of inputs and need more than one
> opinion.
*/

//! show: none
/*
## The same story in a terminal

Run `bun run src/tree/trunk/04-bend-the-line/main.ts`. It prints the collapse proof, the straight
and bent scores, and the two-input conflict. Every number quoted above comes from that run.
*/

//! hide
import { makeCurveExamples } from "../../../learned/data.ts";
import { Neuron } from "../../../learned/neuron.ts";
import { makeRandom } from "../../../learned/random.ts";

export const CURVE_SEED = 11;
export const EXAMPLE_COUNT = 60;
export const NOISE = 1;
export const TRAINING_PASSES = 5000;

export function trainBentEngine(examples: Example[], passes: number): BentEngine {
	const engine = new BentEngine();
	for (let pass = 0; pass < passes; pass++) engine.step(examples);
	return engine;
}

export function trainStraightEngine(examples: Example[], passes: number): Neuron {
	const engine = new Neuron(0, 0);
	for (let pass = 0; pass < passes; pass++) engine.step(examples);
	return engine;
}

export function main(): void {
	const first = { weight: 1.7, bias: -0.4 };
	const second = { weight: -0.8, bias: 2.1 };
	const collapsed = {
		weight: second.weight * first.weight,
		bias: second.weight * first.bias + second.bias
	};
	let largestGap = 0;
	for (let x = -5; x <= 5; x += 0.1) {
		const twoSteps = twoStraightSteps(x, first.weight, first.bias, second.weight, second.bias);
		const oneStep = collapsed.weight * x + collapsed.bias;
		largestGap = Math.max(largestGap, Math.abs(twoSteps - oneStep));
	}

	const examples = makeCurveExamples(EXAMPLE_COUNT, NOISE, makeRandom(CURVE_SEED));
	const straight = trainStraightEngine(examples, 2000);
	const bentAt1000 = trainBentEngine(examples, 1000);
	const bentAt5000 = trainBentEngine(examples, TRAINING_PASSES);

	console.log("trunk/04 — Bend the line\n");
	console.log("Put one multiply-and-add step after another and multiply out the formula.");
	console.log(
		`The largest gap between the two-step answer and its collapsed line is ${largestGap.toFixed(12)}.`
	);
	console.log("Two straight steps are still one straight step.\n");
	console.log("Now insert relu: positive numbers pass through, negative numbers become zero.");
	console.log(
		"Four copies turn on at -3, -1, 1, and 3, so the answer can change slope four times.\n"
	);
	console.log(`Best straight score after 2,000 passes: ${straight.scoreOn(examples).toFixed(4)}`);
	console.log(`Bent score after 1,000 passes:         ${bentAt1000.scoreOn(examples).toFixed(4)}`);
	console.log(
		`Bent score after 5,000 passes:         ${bentAt5000.scoreOn(examples).toFixed(4)}\n`
	);
	console.log("The bent answer now follows the curve. The next limit is the input itself.");
	console.log("To add 3 and 4 we want 7; to add 3 and 0 we want 3.");
	console.log("This engine receives only the first 3, so those two jobs look identical to it.\n");
	console.log("Next problem: one input, one output is a toy. Real questions have hundreds of");
	console.log("inputs and need more than one opinion.");
}

if (import.meta.main) main();
//! end

//! demo: jargon
