//! show: none
/*
## The problem we ran into

> Two test-runs per number, every step. Fine for 2 numbers — deadly for thousands. Can we
> know which way to nudge without trying?

Here is lesson 02's step in full. Take one of the engine's two numbers, nudge it up, and
run the engine over all 60 examples. Put the number back, nudge it down, run over all 60
again. Keep whichever score is lower, then do the same for the other number. Two sweeps
per number, every step. Two numbers is four sweeps a step, and four is nothing.

Ten thousand numbers is twenty thousand sweeps a step, and twenty million sweeps to train
for a thousand steps. Each pair of those sweeps answers one yes-or-no question about one
number.

And here is what nags. You probe something like that when it is a locked box, when the
only way to learn anything about it is to try it and watch what happens. The
mistake-score is not a locked box. We wrote it ourselves: take the input, multiply by the
first number, add the second, subtract the answer we wanted, square that, average over
the examples. Every step of it is written down in front of us.

So why are we poking it like a stranger?
*/

/*
## What earlier lessons taught, imported

From lesson 01, by way of `src/learned/`: repeatable random numbers, the example-maker,
and the mistake-score.
*/

//! code: imports
import { makeRandom } from "../../../learned/random.ts";
import {
	makeExamples,
	makeCurveExamples,
	type Example,
	type LineFormula
} from "../../../learned/data.ts";
import { meanSquaredMistake } from "../../../learned/scoring.ts";

/*
And one import that is not scenery. `startClimb` and `nudgeStep` are lesson 02's method,
imported whole. This lesson is about to claim that its new method is cheaper than the old
one, and a claim like that is worth nothing unless both methods run on the same examples
from the same starting numbers. So we race them, further down, against lesson 02's actual
code rather than against a description of it.
*/

//! code: lesson-02
import { nudgeStep, startClimb } from "../02-nudge-and-keep/main.ts";

/*
### The same engine, standard names

Nothing about the engine changes in this lesson. It multiplies the input by one number
and adds the other. From here on, though, the code calls those two numbers `weight` and
`bias`, because that is what every codebase calls them: `weight` is our multiplier, and
`bias` is our add-on. Only the spelling changed.

The formula we hide from it is the same one too — multiply by 2, add 3. The engine never
sees it. We use it to build the examples and, at the end, to mark the homework.
*/

export const SECRET_FORMULA: LineFormula = { multiplier: 2, addOn: 3 };

//! show: none
/*
## The question, before any formula

Stand the engine at weight −3.2, bias 4.1. Ask one question about the weight:

> If I turn the weight up by a hair, how far does the mistake-score move, per unit of turn?

Call that the **slope** of the score along the weight. There is one such slope for the
weight and one for the bias, and each of them says more than two test-runs ever told us:

- Negative means turning the weight up lowers the score. Go up.
- Positive means turning the weight up raises the score. Go down.
- Large means the score is very sensitive to the weight right now.
- Near zero means the weight has stopped mattering. Leave it alone.

Lesson 02 measured that the only way you can measure a locked box: turn the weight a real
amount, run the engine over everything, see what happened, and then throw away everything
except which of the two scores was smaller.

We do not have a locked box. We have a formula. Asking how a formula moves when one of
its inputs moves is algebra, and algebra costs no test-runs at all.
*/

//! show: none
/*
## Reading the slope off the formula

Take one example: an input x, and the answer we wanted, y. Walk the engine's arithmetic
through it, a line at a time.

$$
answer = weight × x + bias
m = answer − y
this example's share of the score = m × m
$$

That middle line gives the miss a short name, m, and the rest of the walk leans on it.

Now turn the weight up by a hair. Call the hair h. Multiplying by x turns a change of h
into a change of h × x, so the answer moves by h × x, and the miss moves along with the
answer. Call that move d.

$$
d = h × x
$$

The score is the miss squared, so after the turn this example's share is m + d, squared.
Multiply that out.

$$
(m + d) × (m + d) = m×m + 2×m×d + d×d
$$

The first term is the share we already had, so the change is 2×m×d + d×d. And d is
hair-sized, which makes d×d a hair times a hair — far smaller than the rest, so we drop
it. The score moved by 2×m×d. Put d back in terms of h:

$$
the score moved by 2 × m × x × h
$$

Divide by h and we have what we asked for, the move per unit of turn:

$$
weight slope = 2 × m × x
$$

The bias is the same walk with an easier middle. Turn it up by h and the answer moves by
h, with no x anywhere, because the bias is added straight on. So the score moves by
2 × m × h, and per unit of turn:

$$
bias slope = 2 × m
$$

Those two are for one example. The score of the whole engine is the average over all 60,
so each of its slopes is the average of the per-example slopes. That is the entire
derivation, and it fits inside one loop.
*/

/*
## Moving against the slope

Slopes point uphill: a positive slope means the score climbs as that number climbs. We
want down, so we move each of the two numbers **against** its slope, taking `stepSize` of
it.

$$
weight = weight − stepSize × weight slope
bias = bias − stepSize × bias slope
$$

`stepSize` is one number we pick, the same for both. Too big and the engine leaps clean
over the bottom of the valley and lands higher up the far side than it started. Too small
and it inches. We use 0.06 because it behaves on this data. There is no principle behind
that digit, and the demo below is the place to find out what a worse one does.

That is every idea in this lesson. Here is the whole engine.
*/

// How much of the slope we take each pass.
export const STEP_SIZE = 0.06;

//! hide
// One slope for the weight and one for the bias, both read off the score formula rather
// than measured by poking.
export interface Slopes {
	weightSlope: number;
	biasSlope: number;
}
//! end

export class SlopeEngine {
	weight: number;
	bias: number;
	stepSize: number;
	/** How many times we have walked the examples. This is the entire bill. */
	passes = 0;

	constructor(weight: number, bias: number, stepSize: number = STEP_SIZE) {
		this.weight = weight;
		this.bias = bias;
		this.stepSize = stepSize;
	}

	predict(x: number): number {
		return this.weight * x + this.bias;
	}

	scoreOn(examples: Example[]): number {
		const answers = examples.map(example => this.predict(example.x));
		const wanted = examples.map(example => example.y);
		return meanSquaredMistake(answers, wanted);
	}

	/** The two lines of algebra above, summed over the examples and averaged. */
	slopesOn(examples: Example[]): Slopes {
		if (examples.length === 0) return { weightSlope: 0, biasSlope: 0 };

		let weightSlope = 0;
		let biasSlope = 0;
		for (const example of examples) {
			const mistake = this.predict(example.x) - example.y;
			weightSlope += 2 * mistake * example.x; // 2 × m × x
			biasSlope += 2 * mistake; // 2 × m
		}

		// One walk through the examples produced both slopes — not one walk each.
		return {
			weightSlope: weightSlope / examples.length,
			biasSlope: biasSlope / examples.length
		};
	}

	/** Walk the examples once, then move the weight and the bias against their slopes. */
	step(examples: Example[]): void {
		const { weightSlope, biasSlope } = this.slopesOn(examples);
		this.weight -= this.stepSize * weightSlope;
		this.bias -= this.stepSize * biasSlope;
		this.passes++;
	}
}

/*
### What one step costs

Count the work in `step`. One walk through the examples — and during that single walk
both slopes are accumulated, because each example drops its contribution into both sums
as it goes past. Add a third number to the engine and the loop gains a third `+=`, not a
third walk.

One pass, total, however many numbers the engine holds. And it tried nothing to find out
which way to go. It read the direction off the formula.
*/

//! show: SlopeEngine
/*
## Watch it work

Left: the 60 examples and the engine's current line. Right: the score after each pass.
Press **One pass** to spend exactly one walk through the data.

Watch the two slope readouts. They start large and shrink toward zero as the line
settles. That is not the engine giving up. A slope of zero means turning that number
either way makes the score worse, which is exactly what arriving looks like.

The **step size** slider is the number from the update above, and moving it starts the
run over. At 0.06 the line walks in. Past 0.14 on this data the score climbs instead of
falling: every step overshoots the bottom of the valley and lands further up the far side
than it started, and a few passes later the readouts are in the billions.
*/

//! demo: training

/*
## Both methods, same data, same start

A cheap claim deserves a race. Here it is in code. Run lesson 02's nudging and this
lesson's slope-following from the same two numbers on the same examples, stop each one
the moment its score drops below the same target, and count what each spent. A test-run
and a pass are the same unit of work — one sweep through all 60 examples — so the two
counts are directly comparable.
*/

//! hide
/** Where both methods begin, in this lesson's names. */
export interface Start {
	weight: number;
	bias: number;
}
//! end

//! code: the-race
// A cap, so a bad step size cannot hang the page or the terminal.
const GIVE_UP_AFTER = 5000;

export function passesToReach(target: number, examples: Example[], start: Start): number {
	const engine = new SlopeEngine(start.weight, start.bias);
	while (engine.scoreOn(examples) > target && engine.passes < GIVE_UP_AFTER) {
		engine.step(examples);
	}
	return engine.passes;
}

export function testRunsToReach(target: number, examples: Example[], start: Start): number {
	const climb = startClimb(examples, { multiplier: start.weight, addOn: start.bias });
	while (climb.score > target && climb.steps < GIVE_UP_AFTER) {
		nudgeStep(climb, examples);
	}
	return climb.testRuns;
}

/*
On the 60 examples, from weight −3.2 and bias 4.1, down to a score of 0.3773: nudging
spends **52 test-runs**, and slope-following spends **26 passes**.

Twice as cheap is not the headline. Two numbers is where nudging looks as good as it will
ever look, and it still loses. The headline is that the two counts scale differently.
Nudging's bill is two sweeps per number per step, and ours is one sweep per step no
matter how many numbers the engine holds. At a thousand numbers, one step of nudging
costs two thousand sweeps, and one pass of this still costs one.
*/

//! show: SlopeEngine
/*
## Watch it break

The demo below holds a second engine, starting from weight 0 and bias 0, loaded with the
straight-line examples. Press **200 more passes**: the score falls to 0.3763 and stops.
That floor is the wobble we sprinkled on the examples, and no pair of numbers gets under
it — it is the same 0.3763 lesson 02 reached by nudging.

Now press **Feed it the curve**. The examples now come from a formula that bends,
y = 0.3 × x × x + 1. Nothing else changes: same engine, same slopes, same update. Train
it for as long as you have patience for.

The score falls, flattens, and stops at 4.7333. More than twelve times worse than the
line, and nothing is broken. Both slope readouts sit at zero, which means the engine is
standing at the bottom of its valley, and ten thousand more passes will not move a digit.
It found the best straight line through curved data, exactly as asked. The best straight
line through curved data is terrible.
*/

//! demo: the-curve

/*
This failure is a different animal from the last two, and the difference is the point.
Lesson 01 was too slow. Lesson 02 was too expensive. Both of those are complaints about
the *search*: search better, get a better answer. Here the search is finished and
flawless, and the answer is still wrong, because the answer we want is not among the
things this engine can say. Multiply and add draws a straight line. It can tilt that line
and it can slide it up and down, and that is its entire vocabulary. You cannot search
your way to a shape you cannot express.

> Our engine is multiply-then-add — a straight line. Feed it curved data and it fails
> forever — not slow, but incapable.
*/

//! show: none
/*
## The same story in a terminal

`bun run src/tree/trunk/03-follow-the-slope/main.ts` prints all three runs: the slopes at
the starting spot, the race against lesson 02, and the engine flattening out against the
curve. Every number quoted above is in there.
*/

//! hide
export const SEED = 7;
export const CURVE_SEED = 11;
export const EXAMPLE_COUNT = 60;
export const NOISE = 1;
export const START: Start = { weight: -3.2, bias: 4.1 };

// A slope pointing uphill means turn that number down, and the other way round.
function turnDirection(slope: number): string {
	return slope < 0 ? "up" : "down";
}

function describe(engine: SlopeEngine): string {
	return `weight ${engine.weight.toFixed(4)}, bias ${engine.bias.toFixed(4)}`;
}

export function main(): void {
	const random = makeRandom(SEED);
	const examples = makeExamples(SECRET_FORMULA, EXAMPLE_COUNT, NOISE, random);

	console.log("trunk/03 — Follow the slope\n");
	console.log("The same engine as the last two lessons: multiply the input by the weight, then");
	console.log("add the bias. The same 60 wobbly examples of multiply by 2, add 3.\n");
	console.log("This time nothing gets poked. The score is a formula we wrote, so we ask the");
	console.log("formula directly: turn this number a hair, and how far does the score move?\n");

	const engine = new SlopeEngine(START.weight, START.bias);
	const firstSlopes = engine.slopesOn(examples);
	console.log(`Standing at weight ${engine.weight}, bias ${engine.bias}:`);
	console.log(`  score ${engine.scoreOn(examples).toFixed(4)}`);
	console.log(`  weight slope ${firstSlopes.weightSlope.toFixed(2)} per unit of turn`);
	console.log(`  bias slope   ${firstSlopes.biasSlope.toFixed(2)} per unit of turn`);
	const weightWay = turnDirection(firstSlopes.weightSlope);
	const biasWay = turnDirection(firstSlopes.biasSlope);
	console.log(`Each number moves against its own slope, so the weight goes ${weightWay} and the`);
	console.log(`bias goes ${biasWay}. The engine ran nothing to find that out.\n`);

	console.log(" passes   score       the two numbers");
	for (let pass = 1; pass <= 200; pass++) {
		engine.step(examples);
		if (pass <= 3 || pass === 10 || pass === 30 || pass === 100 || pass === 200) {
			const row = [
				String(engine.passes).padStart(7),
				`   ${engine.scoreOn(examples).toFixed(4)}`.padEnd(12),
				describe(engine)
			];
			console.log(row.join(""));
		}
	}

	// The race: lesson 02's method and this one, same examples, same start, same target.
	const target = engine.scoreOn(examples) + 0.001;
	console.log(`\nNow race both methods from weight ${START.weight}, bias ${START.bias}, stopping`);
	console.log(`each the moment its score drops under ${target.toFixed(4)}. Counted in sweeps:`);
	console.log(`  nudge and keep:   ${testRunsToReach(target, examples, START)} test-runs`);
	console.log(`  follow the slope: ${passesToReach(target, examples, START)} passes`);
	console.log("Two numbers is nudging at its very best and it still pays double. Nudging spends");
	console.log("two test-runs per number; one pass hands back a slope for every number at once.\n");

	// Watch it break: same code, data that bends.
	const curved = makeCurveExamples(EXAMPLE_COUNT, NOISE, makeRandom(CURVE_SEED));
	const curveEngine = new SlopeEngine(0, 0);

	console.log("Now the same engine on data that bends: y is 0.3 times x times x, plus 1.\n");
	console.log(" passes   score       the two numbers");
	for (let pass = 1; pass <= 2000; pass++) {
		curveEngine.step(curved);
		if (pass === 10 || pass === 100 || pass === 500 || pass === 2000) {
			const row = [
				String(curveEngine.passes).padStart(7),
				`   ${curveEngine.scoreOn(curved).toFixed(4)}`.padEnd(12),
				describe(curveEngine)
			];
			console.log(row.join(""));
		}
	}

	const curveSlopes = curveEngine.slopesOn(curved);
	const weightAtEnd = curveSlopes.weightSlope.toExponential(1);
	const biasAtEnd = curveSlopes.biasSlope.toExponential(1);
	console.log(`\nThe slopes are now ${weightAtEnd} and ${biasAtEnd}: zero, for all purposes.`);
	console.log("The engine is not stuck part-way down the hill; it is standing at the bottom.");
	console.log("That is the best straight line through curved data, and the best straight line");
	console.log("through curved data is nowhere near good enough.\n");
	console.log("Next problem: our engine is multiply-then-add — a straight line. Feed it curved");
	console.log("data and it fails forever — not slow, but incapable.");
}

if (import.meta.main) {
	main();
}
//! end

//! demo: jargon
