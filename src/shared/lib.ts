/**
 * Shared library for all stages
 * Contains core neural network components
 */

/**
 * A single neuron that learns linear relationships.
 *
 * The neuron implements: y = wx + b
 * - w (weight): how much the input matters
 * - b (bias): the baseline output
 * - learning rate: how big of steps to take when learning
 */
export class SimpleNeuron {
	weight: number;
	bias: number;
	learningRate: number;

	constructor(learningRate: number = 0.01) {
		// Initialize with small random values
		this.weight = Math.random() * 0.1;
		this.bias = Math.random() * 0.1;
		this.learningRate = learningRate;
	}

	/**
	 * Forward pass: make a prediction
	 * Formula: y = wx + b
	 */
	predict(x: number): number {
		return this.weight * x + this.bias;
	}

	/**
	 * Calculate how wrong we were (Mean Squared Error)
	 * We square the error to:
	 * 1. Make all errors positive
	 * 2. Penalize large errors more heavily
	 * 3. Make the math for derivatives cleaner
	 */
	calculateError(predicted: number, actual: number): number {
		const diff = predicted - actual;
		return diff * diff; // Squared error
	}

	/**
	 * Train the neuron on one example using gradient descent
	 *
	 * Gradient descent: adjust parameters in the direction that reduces error
	 *
	 * Math breakdown:
	 * - Error: E = (predicted - actual)²
	 * - Predicted: p = wx + b
	 * - So: E = (wx + b - y)²
	 *
	 * Derivatives (how error changes with each parameter):
	 * - dE/dw = 2(wx + b - y) * x
	 * - dE/db = 2(wx + b - y) * 1
	 *
	 * Update rule: parameter = parameter - learningRate * derivative
	 */
	train(x: number, actual: number): void {
		// Forward pass
		const predicted = this.predict(x);

		// Calculate error
		const error = predicted - actual;

		// Calculate gradients (derivatives)
		// How much would error change if we changed weight?
		const weightGradient = 2 * error * x;

		// How much would error change if we changed bias?
		const biasGradient = 2 * error;

		// Update parameters in the opposite direction of gradients
		// (We want to go downhill on the error surface)
		this.weight -= this.learningRate * weightGradient;
		this.bias -= this.learningRate * biasGradient;
	}

	/**
	 * Get current parameters for visualization
	 */
	getParams(): { weight: number; bias: number } {
		return { weight: this.weight, bias: this.bias };
	}
}

/**
 * Training data generator
 * Creates data following y = 2x + 3 with optional noise
 */
export function generateData(
	numPoints: number,
	noiseLevel: number = 0.1
): Array<{ x: number; y: number }> {
	const data = [];
	for (let i = 0; i < numPoints; i++) {
		const x = Math.random() * 10; // Random x between 0 and 10
		const noise = (Math.random() - 0.5) * noiseLevel;
		const y = 2 * x + 3 + noise; // Target function with noise
		data.push({ x, y });
	}
	return data;
}
