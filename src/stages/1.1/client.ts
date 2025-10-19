/**
 * Client-side code for Stage 1.1 visualization
 * Runs in the browser and visualizes the neuron learning in real-time
 */

import { SimpleNeuron, generateData } from "../../shared/lib.ts";

// Canvas setup
const dataCanvas = document.getElementById("dataCanvas") as HTMLCanvasElement;
const lossCanvas = document.getElementById("lossCanvas") as HTMLCanvasElement;
const dataCtx = dataCanvas.getContext("2d");
const lossCtx = lossCanvas.getContext("2d");

if (!dataCtx || !lossCtx) {
	throw new Error("Failed to get canvas contexts");
}

// Set canvas size
function resizeCanvas() {
	dataCanvas.width = dataCanvas.offsetWidth;
	dataCanvas.height = 300;
	lossCanvas.width = lossCanvas.offsetWidth;
	lossCanvas.height = 300;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Global state
let neuron = new SimpleNeuron(0.01);
let trainingData = generateData(100, 0.2);
let lossHistory: number[] = [];
let epoch = 0;
let isTraining = false;

// Drawing functions
function drawData() {
	if (!dataCtx) return;
	const ctx = dataCtx;
	const width = dataCanvas.width;
	const height = dataCanvas.height;

	ctx.clearRect(0, 0, width, height);

	// Draw axes
	ctx.strokeStyle = "#ccc";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(40, height - 40);
	ctx.lineTo(width - 20, height - 40);
	ctx.moveTo(40, 20);
	ctx.lineTo(40, height - 40);
	ctx.stroke();

	const maxX = 10;
	const maxY = 25;

	function mapX(x: number) {
		return 40 + (x / maxX) * (width - 60);
	}
	function mapY(y: number) {
		return height - 40 - (y / maxY) * (height - 60);
	}

	// Draw target function (semi-transparent)
	ctx.strokeStyle = "rgba(33, 150, 243, 0.3)";
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.moveTo(mapX(0), mapY(3));
	ctx.lineTo(mapX(10), mapY(23));
	ctx.stroke();

	// Draw training data points
	ctx.fillStyle = "#4CAF50";
	for (const point of trainingData) {
		const x = mapX(point.x);
		const y = mapY(point.y);
		ctx.beginPath();
		ctx.arc(x, y, 3, 0, Math.PI * 2);
		ctx.fill();
	}

	// Draw neuron's prediction line
	const { weight, bias } = neuron.getParams();
	ctx.strokeStyle = "#FF5722";
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.moveTo(mapX(0), mapY(bias));
	ctx.lineTo(mapX(10), mapY(weight * 10 + bias));
	ctx.stroke();

	// Draw labels
	ctx.fillStyle = "#333";
	ctx.font = "12px monospace";
	ctx.fillText("0", 35, height - 25);
	ctx.fillText("10", width - 35, height - 25);
	ctx.fillText("0", 20, height - 35);
	ctx.fillText("25", 15, 25);
}

function drawLoss() {
	if (!lossCtx) return;
	const ctx = lossCtx;
	const width = lossCanvas.width;
	const height = lossCanvas.height;

	ctx.clearRect(0, 0, width, height);

	if (lossHistory.length === 0) return;

	// Draw axes
	ctx.strokeStyle = "#ccc";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(40, height - 40);
	ctx.lineTo(width - 20, height - 40);
	ctx.moveTo(40, 20);
	ctx.lineTo(40, height - 40);
	ctx.stroke();

	const maxLoss = Math.max(...lossHistory);
	const maxEpoch = lossHistory.length;

	function mapX(e: number) {
		return 40 + (e / maxEpoch) * (width - 60);
	}
	function mapY(l: number) {
		return height - 40 - (l / maxLoss) * (height - 60);
	}

	// Draw loss curve
	ctx.strokeStyle = "#9C27B0";
	ctx.lineWidth = 2;
	ctx.beginPath();
	const firstLoss = lossHistory[0];
	if (firstLoss !== undefined) {
		ctx.moveTo(mapX(0), mapY(firstLoss));
		for (let i = 1; i < lossHistory.length; i++) {
			const loss = lossHistory[i];
			if (loss !== undefined) {
				ctx.lineTo(mapX(i), mapY(loss));
			}
		}
	}
	ctx.stroke();

	// Draw labels
	ctx.fillStyle = "#333";
	ctx.font = "12px monospace";
	ctx.fillText("0", 35, height - 25);
	ctx.fillText(`${maxEpoch}`, width - 50, height - 25);
	ctx.fillText("Loss", 5, 15);
}

function updateDisplay() {
	const { weight, bias } = neuron.getParams();
	const weightEl = document.getElementById("weightValue");
	const biasEl = document.getElementById("biasValue");
	const funcEl = document.getElementById("currentFunc");
	const epochEl = document.getElementById("epochValue");

	if (weightEl) weightEl.textContent = weight.toFixed(4);
	if (biasEl) biasEl.textContent = bias.toFixed(4);
	if (funcEl) funcEl.textContent = `y = ${weight.toFixed(4)}x + ${bias.toFixed(4)}`;
	if (epochEl) epochEl.textContent = epoch.toString();

	drawData();
	drawLoss();
}

function trainOneEpoch() {
	let totalLoss = 0;
	for (const { x, y } of trainingData) {
		neuron.train(x, y);
		const predicted = neuron.predict(x);
		totalLoss += neuron.calculateError(predicted, y);
	}
	const avgLoss = totalLoss / trainingData.length;
	lossHistory.push(avgLoss);
	epoch++;
}

async function startTraining() {
	const trainBtn = document.getElementById("trainBtn") as HTMLButtonElement;
	const statusEl = document.getElementById("status");

	if (isTraining) return;

	isTraining = true;
	if (trainBtn) trainBtn.disabled = true;

	const targetEpochs = 1000;
	const updateInterval = 10;

	for (let i = epoch; i < targetEpochs; i++) {
		trainOneEpoch();

		if (i % updateInterval === 0) {
			updateDisplay();
			if (statusEl) {
				statusEl.textContent = `Training... Epoch ${i}/${targetEpochs}`;
			}
			// Yield to browser to keep UI responsive
			await new Promise(resolve => setTimeout(resolve, 0));
		}
	}

	if (statusEl) {
		statusEl.innerHTML = `<strong>Training Complete!</strong> Learned function: y = ${neuron.getParams().weight.toFixed(4)}x + ${neuron.getParams().bias.toFixed(4)}`;
	}
	updateDisplay();
	isTraining = false;
	if (trainBtn) trainBtn.disabled = false;
}

function reset() {
	neuron = new SimpleNeuron(0.01);
	trainingData = generateData(100, 0.2);
	lossHistory = [];
	epoch = 0;
	const statusEl = document.getElementById("status");
	if (statusEl) {
		statusEl.textContent =
			'Click "Start Training" to begin. The neuron will learn from 100 random examples.';
	}
	updateDisplay();
}

// Event listeners
const trainBtn = document.getElementById("trainBtn");
const resetBtn = document.getElementById("resetBtn");
const stepBtn = document.getElementById("stepBtn");

if (trainBtn) trainBtn.addEventListener("click", startTraining);
if (resetBtn) resetBtn.addEventListener("click", reset);
if (stepBtn) {
	stepBtn.addEventListener("click", () => {
		trainOneEpoch();
		updateDisplay();
		const statusEl = document.getElementById("status");
		if (statusEl) {
			statusEl.textContent = `Trained 1 epoch. Total epochs: ${epoch}`;
		}
	});
}

// Initial draw
updateDisplay();
