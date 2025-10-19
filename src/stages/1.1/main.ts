/**
 * Stage 1.1: A Machine That Guesses Numbers
 *
 * Goal: Build a single neuron that learns a linear relationship (y = 2x + 3)
 *
 * This is the simplest possible neural network: one input, one output,
 * two learnable parameters (weight and bias).
 */

import { SimpleNeuron, generateData } from "../../shared/lib.ts";

/**
 * Main training loop
 */
export function main() {
	console.log("Stage 1.1: A Machine That Guesses Numbers\n");
	console.log("Target function: y = 2x + 3");
	console.log("The neuron will learn this relationship from examples.\n");

	// Create neuron
	const neuron = new SimpleNeuron(0.01);
	console.log(`Initial parameters: w=${neuron.weight.toFixed(4)}, b=${neuron.bias.toFixed(4)}\n`);

	// Generate training data
	const trainingData = generateData(100, 0.2);

	// Training loop
	const numEpochs = 1000;
	const lossHistory: number[] = [];

	for (let epoch = 0; epoch < numEpochs; epoch++) {
		let totalLoss = 0;

		// Train on each example
		for (const { x, y } of trainingData) {
			neuron.train(x, y);
			const predicted = neuron.predict(x);
			totalLoss += neuron.calculateError(predicted, y);
		}

		// Average loss for this epoch
		const avgLoss = totalLoss / trainingData.length;
		lossHistory.push(avgLoss);

		// Print progress every 100 epochs
		if ((epoch + 1) % 100 === 0) {
			const { weight, bias } = neuron.getParams();
			console.log(
				`Epoch ${epoch + 1}/${numEpochs} - ` +
					`Loss: ${avgLoss.toFixed(6)} - ` +
					`w: ${weight.toFixed(4)}, b: ${bias.toFixed(4)}`
			);
		}
	}

	// Final results
	console.log("\n=== Training Complete ===");
	const { weight, bias } = neuron.getParams();
	console.log(`Learned function: y = ${weight.toFixed(4)}x + ${bias.toFixed(4)}`);
	console.log(`Target function:  y = 2.0000x + 3.0000`);
	console.log(`\nFinal loss: ${lossHistory[lossHistory.length - 1]?.toFixed(6) ?? "N/A"}`);

	// Test predictions
	console.log("\n=== Testing Predictions ===");
	const testValues = [1, 2, 5, 10];
	for (const x of testValues) {
		const predicted = neuron.predict(x);
		const actual = 2 * x + 3;
		const error = Math.abs(predicted - actual);
		console.log(
			`x=${x}: predicted=${predicted.toFixed(4)}, ` +
				`actual=${actual.toFixed(4)}, ` +
				`error=${error.toFixed(4)}`
		);
	}

	// Export data for visualization
	if (typeof globalThis !== "undefined" && "window" in globalThis) {
		(globalThis as any).trainingResults = {
			neuron,
			trainingData,
			lossHistory,
			finalParams: { weight, bias }
		};
	}
}

// Run if executed directly
if (import.meta.main) {
	main();
}

export { SimpleNeuron, generateData };
