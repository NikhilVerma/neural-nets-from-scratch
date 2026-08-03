/*
## Where we are going

In this series of lessons, we will teach you how neural networks work by taking you
through step-by-step examples, starting from the basics and adding complexity as you
go along.

## A simple game

Let's start with a simple game. Let's say there is a hidden formula. That formula takes
in a number and returns another number. The formula is not known to you. No one has told
you the formula. The only thing you have is a bunch of numbers which are inputs, and a
bunch of numbers which are outputs. Your job is to figure out what the formula is.

Now, obviously, with this simple example, if the formula is simple enough, you can
probably sit down with a pen and paper and get the formula out yourself. But our goal is
to build an AI engine that can find the formula out for us.

So we will assume, as a start, that the formula is simple. What it does is that it takes
the input number, multiplies it by something, and then adds something to it. That's all:
one multiplication and one addition. We do not know the two values, and our job is to
build an engine that can figure them out.
*/

/*
## Setting up the game

To play this game honestly, we will write it in code, and we will play both sides of it.

First, our side. We pick the formula and we keep it to ourselves: take the number,
double it, then add three. We then pick sixty random numbers, run each one through the
formula, and write down what comes out the other side. Those sixty pairs of numbers —
one in, one out — are the only thing the engine will ever see. It is not allowed to look
at the formula itself; that would be cheating.

Now the engine's side. We agreed the hidden formula is one multiplication and one
addition, so the engine holds a guess with that same shape: two knobs. The first knob
holds the number it multiplies by, and the second knob holds the number it adds on.
If the engine sets its two knobs to the right values, its guess behaves exactly like our
formula. If the values are wrong, its answers drift away from ours.

So here is today's problem in one line: how does the engine find the right two knob
values, when all it can look at is the sixty pairs?
*/

// A pair we hand over: x went in, y came out.
export interface Example {
	x: number;
	y: number;
}

// The engine's guess at the formula: the two knobs.
export interface Knobs {
	multiplier: number;
	addOn: number;
}

// "Double the number, then add three" — the formula we are hiding.
export const SECRET_FORMULA: Knobs = { multiplier: 2, addOn: 3 };

/*
One thing to notice before we build: our hidden formula multiplies and adds, and the
engine's guess also multiplies and adds — the shapes match, and that is on purpose.
Today we are learning how to *search* for the right values, so we want a game the engine
can win in principle. In `trunk/04` we will hand it a formula whose shape it cannot
copy, and that failure gets a lesson of its own.

### Dice we can re-roll

We need random numbers twice in this lesson: once to pick the sixty inputs, and later to
roll the engine's guesses. There is a catch with randomness, though. Every claim on this
page says "this run did that", and if each reload of the page rolled different luck, you
could never tell whether a change to the method helped or the dice happened to land
better. So let's write our own dice. We hand them a starting number — a seed — and they
hand back the same stream of "random" numbers every time.
*/

export function makeRandom(seed: number): () => number {
	let state = seed >>> 0;
	return function random(): number {
		// Step the counter, then scramble it into something that looks like noise.
		// The exact shuffling is not the lesson; being repeatable is.
		state = (state + 0x6d2b79f5) >>> 0;
		let scrambled = Math.imul(state ^ (state >>> 15), state | 1);
		scrambled ^= scrambled + Math.imul(scrambled ^ (scrambled >>> 7), scrambled | 61);
		// Divide by 2^32 to land between 0 and 1.
		return ((scrambled ^ (scrambled >>> 14)) >>> 0) / 4294967296;
	};
}

/*
### The sixty pairs

Now let's make the sixty pairs. We take sixty inputs between -5 and 5 and run each one
through the secret formula. We also add a small wobble to every answer, at most 1 up or
down, because real measurements are never exact — a scale reads a gram light, a sensor
rounds off — and an engine that only works on spotless numbers would not be much of an
engine. The wobble also means no knob setting can hit every pair exactly, and that
detail will matter in a minute.
*/

export const INPUT_LOW = -5;
export const INPUT_HIGH = 5;
export const NOISE = 1;

export function makeExamples(count: number, random: () => number): Example[] {
	const examples: Example[] = [];
	for (let index = 0; index < count; index++) {
		const x = INPUT_LOW + random() * (INPUT_HIGH - INPUT_LOW);
		const wobble = (random() * 2 - 1) * NOISE; // random() is 0…1, so this is -1…1
		examples.push({ x, y: SECRET_FORMULA.multiplier * x + SECRET_FORMULA.addOn + wobble });
	}
	return examples;
}

/*
### The engine's guess

And here is the engine's guess itself, in one line of code: multiply by the first knob,
then add the second.
*/

export function runEngine(knobs: Knobs, x: number): number {
	return knobs.multiplier * x + knobs.addOn;
}

/*
## Right compared to what?

A moment ago we said "if the engine sets its two knobs to the right values". Right
compared to what? The engine cannot look at the formula, so it cannot check its knobs
against the truth. All it has is the sixty pairs. So we need a number that says how
wrong a knob setting is, built out of nothing but those pairs.

Let's build that number together. Take one pair. Run its input through the engine's
guess. Compare what came out with what should have come out. That gap is the guess's
mistake on that one pair.

There are two things to notice about the gap. First, it can be negative, because the
guess overshoots as easily as it undershoots — and a setting that lands 3 too high on
one pair and 3 too low on the next is not a good setting, so we cannot let the two
cancel out. Second, a miss of 4 should hurt more than twice as much as a miss of 2,
because one wild answer ruins an engine that is fine everywhere else.

Squaring the gap does both jobs at once. Negatives disappear, and a miss of 2 costs 4
while a miss of 4 costs 16 — four times as bad, not twice.

So we square every pair's gap and average them over all sixty pairs, and we get one
number for the whole setting. Let's call it the **mistake-score**. Lower is better.
Zero would mean the guess hits every pair dead on, but remember the wobble we added: on
these sixty pairs, even the secret formula itself scores 0.429, not 0. That is roughly
the neighbourhood a good setting should reach.
*/

export function mistakeScore(knobs: Knobs, examples: Example[]): number {
	if (examples.length === 0) return 0;

	let total = 0;
	for (const example of examples) {
		const mistake = runEngine(knobs, example.x) - example.y;
		total += mistake * mistake;
	}
	return total / examples.length;
}

/*
## The simplest thing that could work

We now have an engine holding two knobs, and a number that says how wrong any setting of
those knobs is. So, how do we find good values?

Let's start with the least clever idea anyone could propose. Roll both knobs at random.
Score that setting. Roll again. Keep whichever setting has scored lowest so far, throw
everything else away, and repeat. There is no reasoning in it, no sense of direction,
and no memory beyond the single best setting we have seen.

It is worth building precisely because it is the least clever thing that still counts as
learning from examples. It sets the bar on the floor, every later lesson has to clear
that bar, and we will be able to say by how much.
*/

// We look for each knob somewhere between -5 and +5.
export const GUESS_RANGE = 5;

export function randomKnobs(random: () => number): Knobs {
	return {
		multiplier: (random() * 2 - 1) * GUESS_RANGE,
		addOn: (random() * 2 - 1) * GUESS_RANGE
	};
}

/*
The search has to remember a few things between guesses:

- the best setting so far, and its mistake-score
- the setting we rolled most recently, so the demo can draw it
- how many guesses have gone by since the record last fell

That last one turns out to be the whole lesson.
*/

export interface Search {
	best: Knobs;
	bestScore: number;
	latest: Knobs;
	latestScore: number;
	guessesTried: number;
	guessesSinceImprovement: number;
	lastImprovementAt: number; // the guess number at which the record last fell
}

export function startSearch(): Search {
	return {
		best: { multiplier: 0, addOn: 0 },
		bestScore: Infinity, // no record yet; the first scored guess becomes the record
		latest: { multiplier: 0, addOn: 0 },
		latestScore: Infinity,
		guessesTried: 0,
		guessesSinceImprovement: 0,
		lastImprovementAt: 0
	};
}

// One guess: roll two knob values, score them, keep them only if they score lower
// than the record. Returns true when the record fell.
export function tryOneGuess(search: Search, examples: Example[], random: () => number): boolean {
	const knobs = randomKnobs(random);
	const score = mistakeScore(knobs, examples);

	search.latest = knobs;
	search.latestScore = score;
	search.guessesTried++;

	if (score < search.bestScore) {
		search.best = knobs;
		search.bestScore = score;
		search.guessesSinceImprovement = 0;
		search.lastImprovementAt = search.guessesTried;
		return true;
	}

	search.guessesSinceImprovement++;
	return false;
}

export function tryManyGuesses(
	search: Search,
	examples: Example[],
	random: () => number,
	count: number
): void {
	for (let index = 0; index < count; index++) {
		tryOneGuess(search, examples, random);
	}
}

/*
## Watch it guess

That is the whole method, and the demo below runs the code you just read on our sixty
pairs. The grey dots are the pairs. The pale line is the setting the engine rolled most
recently, and the green line is the best setting it has found so far. Press the buttons
and watch the green line swing into the cloud of dots.
*/

//! demo: search

/*
## Watch it break

Keep pressing, and watch the readout that counts guesses since the last improvement.
The count climbs and does not stop.

Here is a run of 20,000 guesses, seed 7. The record fell at guess 1, 4, 40, 97, 1002,
1748, 10222 and 11565 — and then not once in the remaining 8,435 guesses.

Read those numbers again. The gaps between improvements do not grow steadily. They
multiply. Four guesses to the first improvement, forty to the next, then a hundred,
then a thousand, then ten thousand. Each step down costs roughly ten times what the
step before it cost.

The engine has not got worse at guessing. It is doing exactly the same thing at exactly
the same speed. What shrank is the target: once the green line runs roughly through the
cloud, only a tiny patch of knob values is any better than where it already stands, and
rolling dice into a tiny patch takes a very long time. Run it and watch the shape:
*/

//! demo: staircase

/*
The staircase is that same fact as a picture: a cliff, then flat. It is not flat because
we have arrived. After 20,000 guesses the best setting is a multiplier of 2.075 and an
add-on of 3.204, when the formula is 2 and 3 — still visibly off, and stuck there for
the last 8,435 guesses. It is flat because every further step down now costs about ten
times the last one.

One number in that run is worth a second look. The best setting scores 0.379, which is
*under* the 0.429 the secret formula scores. The engine has bent a little to chase the
wobble in our answers rather than the formula underneath them. That lower score looks
like a win. It is a warning sign, and `trunk/08` explains why.

And look at what we are throwing away. Every guess produces a mistake-score. We read
that score once, to answer "record or not?", and then we bin it. Two guesses that both
lost still told us something: one of them lost by less. We never look at that.

> Random guessing never settles — can we guess smarter instead of more?
*/

/*
## The same story in a terminal

This file is both the page you are reading and a program you can run.
`bun run src/tree/trunk/01-guess-and-check/main.ts` does the 20,000-guess run in a
terminal and prints every number quoted above, so you can check them yourself.
*/

function describe(knobs: Knobs): string {
	return `multiplier ${knobs.multiplier.toFixed(3)}, add-on ${knobs.addOn.toFixed(3)}`;
}

export const SEED = 7;
export const EXAMPLE_COUNT = 60;
export const BUDGET = 20000;

export function main(): void {
	const random = makeRandom(SEED);
	const examples = makeExamples(EXAMPLE_COUNT, random);

	console.log("trunk/01 — Guess and check\n");
	console.log("We pick a formula — double the number, then add three — and keep it to");
	console.log("ourselves. The engine sees 60 pairs of numbers and nothing else. It holds two");
	console.log("knobs: it multiplies the number we give it by the first, then adds the second.");
	console.log("It rolls both knobs at random, scores the setting, and keeps the best one.\n");
	console.log("The wobble we added means nothing scores 0. The formula itself scores");
	console.log(`${mistakeScore(SECRET_FORMULA, examples).toFixed(3)} on these 60 pairs.\n`);

	const search = startSearch();
	const milestones = [1, 10, 100, 1000, 10000, BUDGET];
	const recordsAt: number[] = [];

	console.log("guesses    best score   best setting                         dry spell");
	for (let guess = 1; guess <= BUDGET; guess++) {
		if (tryOneGuess(search, examples, random)) recordsAt.push(guess);
		if (milestones.includes(guess)) {
			const row = [
				String(search.guessesTried).padStart(7),
				search.bestScore.toFixed(4).padStart(13),
				`   ${describe(search.best)}`.padEnd(38),
				String(search.guessesSinceImprovement).padStart(9)
			];
			console.log(row.join(""));
		}
	}

	console.log(`\nThe formula was ${describe(SECRET_FORMULA)}.`);
	console.log(`After ${BUDGET} guesses the best setting is ${describe(search.best)}.\n`);
	console.log(`The record fell at guess: ${recordsAt.join(", ")}`);
	console.log(`The last one was guess ${search.lastImprovementAt}, so the final`);
	console.log(`${search.guessesSinceImprovement} guesses bought nothing.\n`);
	console.log("The gaps between improvements do not grow steadily — they multiply. Each step");
	console.log("down costs roughly ten times what the step before it cost. This search never");
	console.log("settles on an answer. It buys lottery tickets, and the tickets keep getting");
	console.log("dearer.\n");
	console.log(
		"Next problem: random guessing never settles — can we guess smarter instead of more?"
	);
}

if (import.meta.main) {
	main();
}

//! demo: jargon
