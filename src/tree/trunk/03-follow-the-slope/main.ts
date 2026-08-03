/*
## The problem we ran into

> Two test-runs per knob, every step. Fine for 2 knobs — deadly for thousands. Can we know
> which way to nudge without trying?

Here is lesson 02's step in full. For each knob: turn it up a nudge and run the machine
over all 60 examples; turn it down a nudge and run over all 60 again; keep whichever
score is lower. Two runs per knob, every step. Two knobs, four runs a step — fine.

Ten thousand knobs is twenty thousand runs a step, and twenty million runs to train for
a thousand steps. Each of those pairs of runs answers one yes-or-no question about one
knob.

And here is what nags. You probe something like that when it is a locked box — when the
only way to learn anything is to try it and watch. The score is not a locked box. We
wrote it ourselves: take the input, multiply by the first knob, add the second, subtract
the answer we wanted, square that, average over the examples. Every step of it is
written down in front of us.

So why are we poking it like a stranger?
*/

/*
## What earlier lessons taught, imported

From lesson 01, by way of `src/learned/`: repeatable random numbers, the example-maker,
and the score.
*/

import { makeRandom } from "../../../learned/random.ts";
import {
	makeExamples,
	makeCurveExamples,
	type Example,
	type LineRule
} from "../../../learned/data.ts";
import { meanSquaredMistake } from "../../../learned/scoring.ts";

/*
And one import that is not scenery. `startClimb` and `nudgeStep` are lesson 02's method,
imported whole. This lesson claims the new method is cheaper than the old one, and a
claim like that is worth nothing unless both methods run on the same examples from the
same starting knobs. So we race them, further down, with lesson 02's actual code rather
than a description of it.
*/

import { nudgeStep, startClimb } from "../02-nudge-and-keep/main.ts";

/*
### The same machine, standard names

Nothing about the machine changes in this lesson. It multiplies the input by one knob
and adds the other. But from here on the code calls those knobs `weight` and `bias`,
because that is what every codebase you will ever open calls them: `weight` is our
multiplier, `bias` is our add-on. Only the spelling changed.

And the rule we hide from it is the same one: multiply by 2, add 3. The machine never
sees it. We use it to build the examples and, at the end, to mark the homework.
*/

export const SECRET_RULE: LineRule = { multiplier: 2, addOn: 3 };

/*
## The question, before any formula

Stand the machine at weight −3.2, bias 4.1. Ask one question about the weight knob:

> If I turn this knob up by a hair, how far does the score move, per unit of turn?

Call that number the **slope** of the score along that knob. It is one number per knob,
and it says more than two test-runs ever told us:

- Negative means turning the knob up lowers the score. Go up.
- Positive means turning the knob up raises the score. Go down.
- Large means the score is very sensitive to this knob right now.
- Near zero means this knob has stopped mattering. Leave it alone.

Lesson 02 measured that number the only way you can measure a locked box: turn the knob
a real amount, run the machine over everything, see what happened — then throw away
everything except which of the two was smaller.

We do not have a locked box. We have a formula. Asking how a formula moves when one of
its inputs moves is algebra, and algebra costs no test-runs at all.
*/

/*
### Reading the slope off the formula

Take one example: an input x, and the answer we wanted, y. Walk it through.

- The machine's answer is weight × x + bias.
- The mistake is that answer minus y. Call the mistake m.
- This example's share of the score is m × m.

Now turn the weight knob up by a hair, h. The answer moves by h × x — that is what
multiplying by x does to a change. So the mistake moves by h × x as well. Call that move
d, so d = h × x.

The score is the mistake squared, and (m + d) × (m + d) works out to m×m + 2×m×d + d×d.
For a hair-sized d the d×d term is nothing next to the others, so the score moved by
2×m×d. Put d = h × x back in: the score moved by 2 × m × x × h. Per unit of turn, that
is **2 × m × x**. That is the weight slope for this example.

The bias knob is the same walk with an easier middle. Turn it up by h and the answer
moves by h — no x anywhere, because the bias is added straight on. So the score moves by
2 × m × h, and the slope is **2 × m**.

The score of the whole machine is the average over all 60 examples, so its slopes are
the averages of the per-example slopes. That is the entire derivation, and it fits in
one loop.
*/

/*
### The update

Slopes point uphill. We want down. So we move each knob **against** its slope, taking
`stepSize` of it:

- weight = weight − stepSize × weightSlope
- bias = bias − stepSize × biasSlope

`stepSize` is one number we pick, the same for every knob. Too big and the machine leaps
clean over the bottom of the valley and lands higher than it started. Too small and it
inches. We use 0.06 because it behaves on this data — there is no principle behind that
digit, and the demo below is the place to find out what a worse one does.

That is every idea in this lesson. Here is the whole machine.
*/

// How much of the slope we take each pass.
export const STEP_SIZE = 0.06;

// One slope per knob, both read off the score formula rather than measured.
export interface Slopes {
	weightSlope: number;
	biasSlope: number;
}

export class SlopeMachine {
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
		const predictions = examples.map(example => this.predict(example.x));
		const actuals = examples.map(example => example.y);
		return meanSquaredMistake(predictions, actuals);
	}

	/** The two lines of algebra above, summed over the examples and averaged. */
	slopesOn(examples: Example[]): Slopes {
		if (examples.length === 0) return { weightSlope: 0, biasSlope: 0 };

		let weightSlope = 0;
		let biasSlope = 0;
		for (const example of examples) {
			const mistake = this.predict(example.x) - example.y;
			weightSlope += 2 * mistake * example.x; // 2 * m * x
			biasSlope += 2 * mistake; // 2 * m
		}

		// One walk through the examples produced both slopes — not one walk each.
		return {
			weightSlope: weightSlope / examples.length,
			biasSlope: biasSlope / examples.length
		};
	}

	/** Walk the examples once, then move both knobs against their slopes. */
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
every knob's slope is accumulated, because each example drops its contribution into both
sums as it goes past. Add a third knob and the loop gains a third `+=`, not a third walk.

One pass, total, however many knobs. And the machine tried nothing to find out which way
to go; it read the direction off the formula.
*/

/*
## Watch it work

Left: the 60 examples and the machine's current line. Right: the score after each pass.
Press **One pass** to spend exactly one walk through the data.

Watch the two slope readouts. They start large and shrink toward zero as the line
settles. That is not the machine giving up — a slope of zero means turning that knob
either way makes the score worse, which is exactly what arriving looks like.

The **step size** slider is the number from the update rule; moving it starts the run
over. At 0.06 the line walks in. Past 0.14 on this data the score climbs instead of
falling — every step overshoots the bottom of the valley and lands further up the far
side than it started, and a few passes later the readouts are in the billions.
*/

//! demo: training

/*
## Both methods, on the same data, from the same start

Cheap claims deserve a race. Here it is in code: run lesson 02's nudging and this
lesson's slope-following from the same knobs on the same examples, stop each one the
moment its score drops below the same target, and count what each spent. A test-run and
a pass are the same unit of work — one sweep through all 60 examples — so the two
numbers are directly comparable.
*/

export interface Start {
	weight: number;
	bias: number;
}

// A cap so a bad step size cannot hang the page or the terminal.
const GIVE_UP_AFTER = 5000;

export function passesToReach(target: number, examples: Example[], start: Start): number {
	const machine = new SlopeMachine(start.weight, start.bias);
	while (machine.scoreOn(examples) > target && machine.passes < GIVE_UP_AFTER) {
		machine.step(examples);
	}
	return machine.passes;
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
spends **52 test-runs**, slope-following spends **26 passes**. Run `bun run main.ts` in
this folder and it prints both.

Twice as cheap is not the headline. Two knobs is where nudging looks as good as it will
ever look, and it still loses. The headline is that the two numbers scale differently:
nudging's bill is two sweeps per knob per step, and ours is one sweep per step no matter
how many knobs there are. At a thousand knobs, one step of nudging costs two thousand
sweeps and one pass of this still costs one.
*/

/*
## Watch it break

The demo below holds a second machine, starting from weight 0 and bias 0, loaded with
the straight-line examples. Press **200 more passes**: the score falls to about 0.376
and stops. That floor is the wobble we sprinkled on the examples, and no setting of
these two knobs gets under it.

Now press **Feed it the curve**. The examples come from a rule that bends,
y = 0.3 × x × x + 1. Nothing else changes — same machine, same slopes, same update.
Train it as long as you have patience for.

The score falls, flattens, and stops at about 4.73. Twelve times worse than the line,
and nothing is broken. Both slope readouts sit at zero, which means the machine is
standing at the bottom of its valley; ten thousand more passes will not move a digit. It
found the best straight line through curved data, exactly as asked. The best straight
line through curved data is terrible.
*/

//! demo: the-curve

/*
This failure is a different animal from the last two, and the difference is the point.
Lesson 01 was too slow. Lesson 02 was too expensive. Both of those are complaints about
the *search*: search better, get a better answer. Here the search is finished and
flawless, and the answer is still wrong — because the answer we want is not among the
things this machine can say. Multiply and add draws a straight line. It can tilt that
line and it can slide it up and down, and that is its entire vocabulary. You cannot
search your way to a shape you cannot express.

> Our machine is multiply-then-add — a straight line. Feed it curved data and it fails
> forever. Not slow: incapable.
*/

/*
## The same story in a terminal

`bun run main.ts` in this folder prints all three runs: the slopes at the starting spot,
the race against lesson 02, and the machine flattening out against the curve.
*/

// A slope pointing uphill means turn that knob down, and the other way round.
function turnDirection(slope: number): string {
	return slope < 0 ? "up" : "down";
}

export function main(): void {
	const random = makeRandom(7);
	const examples = makeExamples(SECRET_RULE, 60, 1, random);
	const start: Start = { weight: -3.2, bias: 4.1 };

	console.log("trunk/03 — Follow the slope\n");
	console.log("Same machine as the last two lessons: multiply the input by the weight knob,");
	console.log("add the bias knob. Same 60 wobbly examples of multiply by 2, add 3.\n");
	console.log("This time nothing gets poked. The score is a formula we wrote, so we ask the");
	console.log("formula directly: turn this knob a hair, and how far does the score move?\n");

	const machine = new SlopeMachine(start.weight, start.bias);
	const firstSlopes = machine.slopesOn(examples);
	console.log(`Standing at weight ${machine.weight}, bias ${machine.bias}:`);
	console.log(`  score ${machine.scoreOn(examples).toFixed(4)}`);
	console.log(`  weight slope ${firstSlopes.weightSlope.toFixed(2)} per unit of turn`);
	console.log(`  bias slope   ${firstSlopes.biasSlope.toFixed(2)} per unit of turn`);
	const weightWay = turnDirection(firstSlopes.weightSlope);
	const biasWay = turnDirection(firstSlopes.biasSlope);
	console.log(`Each knob moves against its own slope, so the weight knob goes ${weightWay} and`);
	console.log(`the bias knob goes ${biasWay}. The machine ran nothing to find that out.\n`);

	console.log(" passes   score       machine");
	for (let pass = 1; pass <= 200; pass++) {
		machine.step(examples);
		if (pass <= 3 || pass === 10 || pass === 30 || pass === 100 || pass === 200) {
			const row = [
				String(machine.passes).padStart(7),
				`   ${machine.scoreOn(examples).toFixed(4)}`.padEnd(12),
				`weight ${machine.weight.toFixed(4)}, bias ${machine.bias.toFixed(4)}`
			];
			console.log(row.join(""));
		}
	}

	// The race: lesson 02's method and this one, same examples, same start, same target.
	const target = machine.scoreOn(examples) + 0.001;
	console.log(`\nNow race both methods from weight ${start.weight}, bias ${start.bias}, stopping`);
	console.log(`each the moment its score drops under ${target.toFixed(4)}. Counted in sweeps:`);
	console.log(`  nudge and keep:   ${testRunsToReach(target, examples, start)} test-runs`);
	console.log(`  follow the slope: ${passesToReach(target, examples, start)} passes`);
	console.log("Two knobs is nudging at its very best and it still pays double. Nudging spends");
	console.log("two test-runs per knob; one pass hands back a slope for every knob at once.\n");

	// Watch it break: same code, data that bends.
	const curved = makeCurveExamples(60, 1, makeRandom(11));
	const curveMachine = new SlopeMachine(0, 0);

	console.log("Now the same machine on data that bends: y is 0.3 times x times x, plus 1.\n");
	console.log(" passes   score       machine");
	for (let pass = 1; pass <= 2000; pass++) {
		curveMachine.step(curved);
		if (pass === 10 || pass === 100 || pass === 500 || pass === 2000) {
			const row = [
				String(curveMachine.passes).padStart(7),
				`   ${curveMachine.scoreOn(curved).toFixed(4)}`.padEnd(12),
				`weight ${curveMachine.weight.toFixed(4)}, bias ${curveMachine.bias.toFixed(4)}`
			];
			console.log(row.join(""));
		}
	}

	const curveSlopes = curveMachine.slopesOn(curved);
	const weightAtEnd = curveSlopes.weightSlope.toExponential(1);
	const biasAtEnd = curveSlopes.biasSlope.toExponential(1);
	console.log(`\nThe slopes are now ${weightAtEnd} and ${biasAtEnd}: zero, for all purposes.`);
	console.log("The machine is not stuck part-way down the hill; it is standing at the bottom.");
	console.log("That is the best straight line through curved data, and the best straight line");
	console.log("through curved data is nowhere near good enough.\n");
	console.log("Next problem: our machine is multiply-then-add — a straight line. Feed it");
	console.log("curved data and it fails forever. Not slow: incapable.");
}

if (import.meta.main) {
	main();
}
