/**
 * Tests for Stage 1.1: A Machine That Guesses Numbers
 *
 * These tests verify that our neuron can learn different linear relationships
 */

import { SimpleNeuron, generateData } from "../../shared/lib.ts";

/**
 * Simple test runner
 */
class TestRunner {
	passed = 0;
	failed = 0;

	assert(condition: boolean, message: string): void {
		if (condition) {
			console.log(`✓ ${message}`);
			this.passed++;
		} else {
			console.log(`✗ ${message}`);
			this.failed++;
		}
	}

	assertClose(actual: number, expected: number, tolerance: number, message: string): void {
		const diff = Math.abs(actual - expected);
		if (diff <= tolerance) {
			console.log(`✓ ${message} (${actual.toFixed(4)} ≈ ${expected.toFixed(4)})`);
			this.passed++;
		} else {
			console.log(
				`✗ ${message} (${actual.toFixed(4)} vs ${expected.toFixed(4)}, diff: ${diff.toFixed(4)})`
			);
			this.failed++;
		}
	}

	summary(): void {
		console.log(`\n${"=".repeat(50)}`);
		console.log(`Tests: ${this.passed} passed, ${this.failed} failed`);
		if (this.failed === 0) {
			console.log("All tests passed! ✓");
		}
	}
}

/**
 * Train a neuron on a specific function
 */
function trainNeuron(
	targetWeight: number,
	targetBias: number,
	epochs: number = 1000,
	learningRate: number = 0.01
): SimpleNeuron {
	const neuron = new SimpleNeuron(learningRate);

	// Generate training data for the target function
	const trainingData = [];
	for (let i = 0; i < 100; i++) {
		const x = Math.random() * 10;
		const y = targetWeight * x + targetBias;
		trainingData.push({ x, y });
	}

	// Train
	for (let epoch = 0; epoch < epochs; epoch++) {
		for (const { x, y } of trainingData) {
			neuron.train(x, y);
		}
	}

	return neuron;
}

/**
 * Run all tests
 */
function runTests() {
	const runner = new TestRunner();

	console.log("Stage 1.1 Tests: A Machine That Guesses Numbers\n");

	// Test 1: Can it learn y = x? (weight=1, bias=0)
	console.log("Test 1: Learning y = x (weight=1, bias=0)");
	{
		const neuron = trainNeuron(1, 0, 2000, 0.01);
		const { weight, bias } = neuron.getParams();

		runner.assertClose(weight, 1.0, 0.1, "Weight should be close to 1.0");
		runner.assertClose(bias, 0.0, 0.1, "Bias should be close to 0.0");

		// Test predictions
		const pred1 = neuron.predict(5);
		runner.assertClose(pred1, 5.0, 0.5, "Prediction for x=5 should be ~5");
	}

	// Test 2: Can it learn y = 5? (weight=0, bias=5)
	console.log("\nTest 2: Learning y = 5 (weight=0, bias=5)");
	{
		const neuron = trainNeuron(0, 5, 2000, 0.01);
		const { weight, bias } = neuron.getParams();

		runner.assertClose(weight, 0.0, 0.1, "Weight should be close to 0.0");
		runner.assertClose(bias, 5.0, 0.1, "Bias should be close to 5.0");

		// Test predictions (should always return ~5)
		const pred1 = neuron.predict(0);
		const pred2 = neuron.predict(10);
		runner.assertClose(pred1, 5.0, 0.5, "Prediction for x=0 should be ~5");
		runner.assertClose(pred2, 5.0, 0.5, "Prediction for x=10 should be ~5");
	}

	// Test 3: Can it learn y = 2x + 3? (weight=2, bias=3)
	console.log("\nTest 3: Learning y = 2x + 3 (weight=2, bias=3)");
	{
		const neuron = trainNeuron(2, 3, 2000, 0.01);
		const { weight, bias } = neuron.getParams();

		runner.assertClose(weight, 2.0, 0.1, "Weight should be close to 2.0");
		runner.assertClose(bias, 3.0, 0.1, "Bias should be close to 3.0");

		// Test predictions
		const pred1 = neuron.predict(0);
		const pred2 = neuron.predict(5);
		const pred3 = neuron.predict(10);
		runner.assertClose(pred1, 3.0, 0.5, "Prediction for x=0 should be ~3");
		runner.assertClose(pred2, 13.0, 0.5, "Prediction for x=5 should be ~13");
		runner.assertClose(pred3, 23.0, 0.5, "Prediction for x=10 should be ~23");
	}

	// Test 4: Convergence speed - how many iterations to get error < 0.01?
	console.log("\nTest 4: Convergence Speed");
	{
		const neuron = new SimpleNeuron(0.01);
		const trainingData = [];

		// Generate data for y = 2x + 3
		for (let i = 0; i < 100; i++) {
			const x = Math.random() * 10;
			const y = 2 * x + 3;
			trainingData.push({ x, y });
		}

		let epoch = 0;
		let avgLoss = Infinity;

		while (avgLoss > 0.01 && epoch < 5000) {
			let totalLoss = 0;
			for (const { x, y } of trainingData) {
				neuron.train(x, y);
				const predicted = neuron.predict(x);
				totalLoss += neuron.calculateError(predicted, y);
			}
			avgLoss = totalLoss / trainingData.length;
			epoch++;
		}

		console.log(`  Converged in ${epoch} epochs (final loss: ${avgLoss.toFixed(6)})`);
		runner.assert(epoch < 5000, "Should converge in less than 5000 epochs");
		runner.assert(avgLoss < 0.01, "Final loss should be less than 0.01");
	}

	// Test 5: Learning rate effect
	console.log("\nTest 5: Learning Rate Effects");
	{
		// Too small learning rate
		const slowNeuron = trainNeuron(2, 3, 100, 0.001);
		const { weight: slowW, bias: slowB } = slowNeuron.getParams();
		const slowError = Math.abs(slowW - 2.0) + Math.abs(slowB - 3.0);

		// Good learning rate
		const goodNeuron = trainNeuron(2, 3, 100, 0.01);
		const { weight: goodW, bias: goodB } = goodNeuron.getParams();
		const goodError = Math.abs(goodW - 2.0) + Math.abs(goodB - 3.0);

		console.log(`  Slow LR (0.001) error: ${slowError.toFixed(4)}`);
		console.log(`  Good LR (0.01) error: ${goodError.toFixed(4)}`);
		runner.assert(
			goodError < slowError,
			"Higher learning rate should learn faster (in same number of epochs)"
		);
	}

	// Test 6: Data generation
	console.log("\nTest 6: Data Generation");
	{
		const data = generateData(50, 0.1);

		runner.assert(data.length === 50, "Should generate correct number of points");

		// Check that data roughly follows y = 2x + 3
		let avgError = 0;
		for (const { x, y } of data) {
			const expected = 2 * x + 3;
			avgError += Math.abs(y - expected);
		}
		avgError /= data.length;

		console.log(`  Average deviation from y=2x+3: ${avgError.toFixed(4)}`);
		runner.assert(avgError < 0.2, "Generated data should roughly follow target function");
	}

	// Test 7: Negative slopes
	console.log("\nTest 7: Learning Negative Slopes (y = -2x + 10)");
	{
		const neuron = trainNeuron(-2, 10, 2000, 0.01);
		const { weight, bias } = neuron.getParams();

		runner.assertClose(weight, -2.0, 0.1, "Weight should be close to -2.0");
		runner.assertClose(bias, 10.0, 0.1, "Bias should be close to 10.0");
	}

	// Test 8: Prediction function
	console.log("\nTest 8: Prediction Function");
	{
		const neuron = new SimpleNeuron(0.01);
		neuron.weight = 3;
		neuron.bias = 7;

		const result = neuron.predict(2);
		runner.assertClose(result, 13.0, 0.001, "predict(2) should return 3*2+7=13");
	}

	runner.summary();
}

// Run tests
runTests();
