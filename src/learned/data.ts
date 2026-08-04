// Taught at trunk/01-guess-and-check — go there for the why.

export interface Example {
	x: number;
	y: number;
}

/** A straight-line formula: multiply by one number, then add another. */
export interface LineFormula {
	multiplier: number;
	addOn: number;
}

/** Every lesson draws its examples from this stretch of the number line. */
export const INPUT_LOW = -5;
export const INPUT_HIGH = 5;

function randomInput(random: () => number): number {
	return INPUT_LOW + random() * (INPUT_HIGH - INPUT_LOW);
}

/** Examples that follow a straight-line formula, with a little wobble on top. */
export function makeExamples(
	formula: LineFormula,
	count: number,
	noise: number,
	random: () => number
): Example[] {
	const examples: Example[] = [];
	for (let index = 0; index < count; index++) {
		const x = randomInput(random);
		const wobble = (random() * 2 - 1) * noise;
		examples.push({ x, y: formula.multiplier * x + formula.addOn + wobble });
	}
	return examples;
}

// Site plumbing, not curriculum: the curved data trunk/03 uses to show a straight line failing.
export const CURVE_FORMULA = { squareTerm: 0.3, addOn: 1 };

/** Examples that bend: y = 0.3 * x * x + 1, with a little wobble on top. */
export function makeCurveExamples(count: number, noise: number, random: () => number): Example[] {
	const examples: Example[] = [];
	for (let index = 0; index < count; index++) {
		const x = randomInput(random);
		const wobble = (random() * 2 - 1) * noise;
		examples.push({ x, y: CURVE_FORMULA.squareTerm * x * x + CURVE_FORMULA.addOn + wobble });
	}
	return examples;
}
