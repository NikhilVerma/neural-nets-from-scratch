// Browser glue for trunk/03.

import { boundsForPoints, boundsForSeries, Plot, redrawOnResize } from "../../../site/plot.ts";
import { makeRandom } from "../../../learned/random.ts";
import { makeCurveExamples, makeExamples, type Example } from "../../../learned/data.ts";
import { SECRET_RULE, SlopeMachine } from "./main.ts";

const SEED = 7;
const START = { weight: -3.2, bias: 4.1 };

const scatterCanvas = document.getElementById("scatter") as HTMLCanvasElement | null;
const scoreCanvas = document.getElementById("scoreChart") as HTMLCanvasElement | null;
if (!scatterCanvas || !scoreCanvas) throw new Error("lesson canvases are missing");

const scatterPlot = new Plot(scatterCanvas);
const scorePlot = new Plot(scoreCanvas);

const lineExamples = makeExamples(SECRET_RULE, 60, 1, makeRandom(SEED));
const curveExamples = makeCurveExamples(60, 1, makeRandom(11));

let usingCurve = false;
let examples: Example[] = lineExamples;
let machine = new SlopeMachine(START.weight, START.bias);
let scoreHistory: number[] = [machine.scoreOn(examples)];
let autoTimer: number | null = null;

function drawScatter(): void {
	scatterPlot.begin();
	scatterPlot.setBounds(boundsForPoints(examples));
	scatterPlot.axes("input", "output");
	scatterPlot.scatter(examples, scatterPlot.color("--plot-point"));
	scatterPlot.functionLine(x => machine.predict(x), scatterPlot.color("--plot-best"), 2.5);
}

function drawScore(): void {
	scorePlot.begin();
	scorePlot.setBounds(boundsForSeries(scoreHistory));
	scorePlot.axes("passes", "score");
	scorePlot.series(scoreHistory, scorePlot.color("--plot-best"), 2);
}

function setText(id: string, text: string): void {
	const element = document.getElementById(id);
	if (element) element.textContent = text;
}

function update(): void {
	const slopes = machine.slopesOn(examples);
	setText("score", machine.scoreOn(examples).toFixed(4));
	setText("passes", machine.passes.toLocaleString());
	setText("weight", machine.weight.toFixed(4));
	setText("bias", machine.bias.toFixed(4));
	setText("weightSlope", slopes.weightSlope.toFixed(4));
	setText("biasSlope", slopes.biasSlope.toFixed(4));
	drawScatter();
	drawScore();
}

function stopAuto(): void {
	if (autoTimer !== null) {
		clearInterval(autoTimer);
		autoTimer = null;
	}
	const button = document.getElementById("autoTrain");
	if (button) button.textContent = "Auto-train";
}

function restart(): void {
	stopAuto();
	machine = new SlopeMachine(START.weight, START.bias);
	scoreHistory = [machine.scoreOn(examples)];
	update();
}

document.getElementById("onePass")?.addEventListener("click", () => {
	machine.step(examples);
	scoreHistory.push(machine.scoreOn(examples));
	update();
});

document.getElementById("autoTrain")?.addEventListener("click", () => {
	if (autoTimer !== null) {
		stopAuto();
		return;
	}
	const button = document.getElementById("autoTrain");
	if (button) button.textContent = "Stop";
	autoTimer = window.setInterval(() => {
		machine.step(examples);
		scoreHistory.push(machine.scoreOn(examples));
		update();
		if (machine.passes >= 300) stopAuto();
	}, 60);
});

document.getElementById("resetMachine")?.addEventListener("click", restart);

document.getElementById("toggleData")?.addEventListener("click", () => {
	usingCurve = !usingCurve;
	examples = usingCurve ? curveExamples : lineExamples;
	const button = document.getElementById("toggleData");
	if (button) button.textContent = usingCurve ? "Data: Curve ↔ Line" : "Data: Line ↔ Curve";
	restart();
});

redrawOnResize(scatterCanvas, drawScatter);
redrawOnResize(scoreCanvas, drawScore);
update();
