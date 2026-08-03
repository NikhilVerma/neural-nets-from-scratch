// Browser glue for trunk/03. The lesson itself is main.ts, rendered by site/code.ts;
// this file only wires the demo controls that main.ts asked for.

import { renderLesson } from "../../../site/code.ts";
import { boundsForPoints, boundsForSeries, Plot, redrawOnResize } from "../../../site/plot.ts";
import { makeRandom } from "../../../learned/random.ts";
import { makeCurveExamples, makeExamples, type Example } from "../../../learned/data.ts";
import { SECRET_RULE, SlopeMachine, STEP_SIZE } from "./main.ts";

const START = { weight: -3.2, bias: 4.1 };
const AUTO_STOPS_AT = 300;
// Past a step size of about 0.14 the score runs away; stop before the numbers stop meaning anything.
const RUNAWAY = 1e12;

// The demo markup lives in <template> tags and is only cloned into the page once the
// lesson has been rendered, so nothing below may run before this line.
const container = document.getElementById("lesson");
if (!container) throw new Error("the lesson container is missing");
await renderLesson(container);

const lineExamples = makeExamples(SECRET_RULE, 60, 1, makeRandom(7));
const curveExamples = makeCurveExamples(60, 1, makeRandom(11));

function requireCanvas(id: string): HTMLCanvasElement {
	const canvas = document.getElementById(id);
	if (!(canvas instanceof HTMLCanvasElement)) throw new Error(`canvas #${id} is missing`);
	return canvas;
}

function setText(id: string, text: string): void {
	const element = document.getElementById(id);
	if (element) element.textContent = text;
}

function show(value: number): string {
	if (!Number.isFinite(value)) return "off the scale";
	return Math.abs(value) >= 1e6 ? value.toExponential(2) : value.toFixed(4);
}

function drawMachine(plot: Plot, machine: SlopeMachine, examples: Example[]): void {
	plot.begin();
	plot.setBounds(boundsForPoints(examples));
	plot.axes("input", "output");
	plot.scatter(examples, plot.color("--plot-point"));
	plot.functionLine(x => machine.predict(x), plot.color("--plot-best"), 2.5);
}

// ── watch it work: one machine on the straight-line examples ────────────────

const scatterCanvas = requireCanvas("scatter");
const scoreCanvas = requireCanvas("scoreChart");
const scatterPlot = new Plot(scatterCanvas);
const scorePlot = new Plot(scoreCanvas);
const stepSizeSlider = document.getElementById("stepSize");

let machine = new SlopeMachine(START.weight, START.bias, STEP_SIZE);
let scoreHistory: number[] = [machine.scoreOn(lineExamples)];
let autoTimer: number | null = null;

function drawScore(): void {
	scorePlot.begin();
	scorePlot.setBounds(boundsForSeries(scoreHistory));
	scorePlot.axes("passes", "score");
	scorePlot.series(scoreHistory, scorePlot.color("--plot-best"), 2);
}

function update(): void {
	const slopes = machine.slopesOn(lineExamples);
	setText("score", show(machine.scoreOn(lineExamples)));
	setText("passes", machine.passes.toLocaleString());
	setText("stepSizeValue", machine.stepSize.toFixed(3));
	setText("weight", show(machine.weight));
	setText("bias", show(machine.bias));
	setText("weightSlope", show(slopes.weightSlope));
	setText("biasSlope", show(slopes.biasSlope));
	drawMachine(scatterPlot, machine, lineExamples);
	drawScore();
}

function stopAuto(): void {
	if (autoTimer !== null) {
		clearInterval(autoTimer);
		autoTimer = null;
	}
	setText("autoTrain", "Keep passing");
}

function takePass(): void {
	machine.step(lineExamples);
	const score = machine.scoreOn(lineExamples);
	if (Number.isFinite(score) && score < RUNAWAY) scoreHistory.push(score);
	else stopAuto();
	update();
}

function restart(): void {
	stopAuto();
	const stepSize =
		stepSizeSlider instanceof HTMLInputElement ? Number(stepSizeSlider.value) : STEP_SIZE;
	machine = new SlopeMachine(START.weight, START.bias, stepSize);
	scoreHistory = [machine.scoreOn(lineExamples)];
	update();
}

document.getElementById("onePass")?.addEventListener("click", takePass);

document.getElementById("autoTrain")?.addEventListener("click", () => {
	if (autoTimer !== null) {
		stopAuto();
		return;
	}
	setText("autoTrain", "Stop");
	autoTimer = window.setInterval(() => {
		takePass();
		if (machine.passes >= AUTO_STOPS_AT) stopAuto();
	}, 60);
});

document.getElementById("resetMachine")?.addEventListener("click", restart);
stepSizeSlider?.addEventListener("input", restart);

// ── watch it break: a second machine, and data that bends ───────────────────

const curveCanvas = requireCanvas("curveScatter");
const curvePlot = new Plot(curveCanvas);

let curveIsOn = false;
let curveExamplesInUse: Example[] = lineExamples;
let curveMachine = new SlopeMachine(0, 0);

function updateCurve(): void {
	const slopes = curveMachine.slopesOn(curveExamplesInUse);
	setText("curveData", curveIsOn ? "y = 0.3 · x · x + 1" : "straight line");
	setText("curveScore", show(curveMachine.scoreOn(curveExamplesInUse)));
	setText("curvePasses", curveMachine.passes.toLocaleString());
	setText("curveWeightSlope", show(slopes.weightSlope));
	setText("curveBiasSlope", show(slopes.biasSlope));
	drawMachine(curvePlot, curveMachine, curveExamplesInUse);
}

function restartCurve(): void {
	curveMachine = new SlopeMachine(0, 0);
	updateCurve();
}

document.getElementById("curveToggle")?.addEventListener("click", () => {
	curveIsOn = !curveIsOn;
	curveExamplesInUse = curveIsOn ? curveExamples : lineExamples;
	setText("curveToggle", curveIsOn ? "Back to the straight line" : "Feed it the curve");
	restartCurve();
});

document.getElementById("curveTrain")?.addEventListener("click", () => {
	for (let pass = 0; pass < 200; pass++) curveMachine.step(curveExamplesInUse);
	updateCurve();
});

document.getElementById("curveReset")?.addEventListener("click", restartCurve);

redrawOnResize(scatterCanvas, () => drawMachine(scatterPlot, machine, lineExamples));
redrawOnResize(scoreCanvas, drawScore);
redrawOnResize(curveCanvas, () => drawMachine(curvePlot, curveMachine, curveExamplesInUse));
update();
updateCurve();
