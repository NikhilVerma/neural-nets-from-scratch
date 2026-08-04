// Taught at trunk/01-guess-and-check — go there for the why.

/**
 * How wrong a set of answers was: average of the squared differences.
 * Zero means perfect; bigger means worse; big misses count for much more than small ones.
 */
export function meanSquaredMistake(predictions: number[], actuals: number[]): number {
	if (predictions.length !== actuals.length) {
		throw new Error("meanSquaredMistake needs one prediction per actual value");
	}
	if (predictions.length === 0) return 0;

	let total = 0;
	for (let index = 0; index < predictions.length; index++) {
		const mistake = predictions[index]! - actuals[index]!;
		total += mistake * mistake;
	}
	return total / predictions.length;
}
