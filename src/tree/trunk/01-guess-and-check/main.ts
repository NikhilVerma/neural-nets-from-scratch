//! show: none
/*
## Where we are going

In this series of lessons, we will teach you how neural networks work by taking you
through step-by-step examples, starting from the basics and adding complexity as you
go along.
*/

//! show: none
/*
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
formula, and write down what comes out the other side. The engine only sees those sixty
pairs of numbers and nothing else. It has to figure out what the formula is from those
numbers alone.

Here are the first five pairs, exactly as the engine receives them:

| number in | number out |
| --- | --- |
| -4.88 | -7.64 |
| 4.77 | 12.94 |
| 0.21 | 3.24 |
| -0.34 | 1.80 |
| 0.53 | 4.53 |
| … | … |

~ Sharp eyes will notice the outputs sit a whisker off the formula: -4.88 doubled plus
three is -6.76, yet we wrote down -7.64. That is deliberate, and explained just below.

We agreed the hidden formula is one multiplication and one addition, so the engine
holds a guess with that same shape: a number it multiplies by, and a number it adds on.
The engine's job is to guess those two numbers correctly. If it gets them right, its
guess behaves exactly like our formula. If they are wrong, its answers drift away from
ours.

So here is today's problem in one line: how does the engine find the right two numbers,
when all it can look at is the sixty pairs?
*/

// A pair we hand over: x went in, y came out.
export interface Example {
	x: number;
	y: number;
}

// The engine's guess at the formula: the two numbers it thinks the formula uses.
export interface Guess {
	multiplier: number;
	addOn: number;
}

// "Double the number, then add three" — the formula we are hiding.
export const SECRET_FORMULA: Guess = { multiplier: 2, addOn: 3 };

/*
To be fair, the engine is somewhat cheating here: it already knows that something gets
multiplied and something gets added. That is okay. We will make it harder in later
lessons — `trunk/04` hands it a formula whose shape it does not know, and that failure
gets a lesson of its own.

### Dice we can re-roll

We are about to lean on random numbers, and there is one catch: if every visit rolled
fresh numbers, this page would tell one story and your screen would tell another. We
want you to be able to check every number we quote. So our dice are fixed: every run
rolls the same numbers, on this page and on yours.

~ For the curious: the dice start from a fixed number, called a seed, and the rolling
code sits in `main.ts`. How it shuffles numbers is not today's lesson, so the page
leaves it out.
*/

//! hide
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
//! end

/*
### The sixty pairs

Now let's make the sixty pairs. We take sixty inputs between -5 and 5 and run each one
through the secret formula. Then, before writing each answer down, we wobble it a
little — at most 1 up or down. That is the whisker you saw in the table.

Is that cheating? It would be, if the formula stopped deciding the answers. It does
not: every answer starts from the formula, and the wobble only smudges the copy we
write down. We do it because the pairs an engine meets outside this game are always
measured by something — a scale that reads a gram light, a sensor that rounds — and
measured numbers arrive smudged. An engine that expects spotless numbers would fail on
its first real job.

The wobble has a side effect that will matter in a minute: since the written answers
are not exactly on the formula, no guess can hit every pair dead on. Not even the true
formula scores zero here.
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
## Right compared to what?

A moment ago we said "the engine's job is to guess those two numbers correctly". But
the engine cannot look at the formula, so it can never check its guess against the
truth. All it has is the sixty pairs. So we need a number that says how wrong a guess
is, built out of nothing but those pairs.

Let's build that number together, with one pair in hand. Say the input is 4, and the
formula's answer is 11. The engine's guess answers 13 instead. The gap between them is
2: the guess landed 2 too high. On another pair the guess might land 2 too low, and
then the gap is -2.

We want to add the gaps up across all sixty pairs, and those minus signs get in the
way. A guess that lands 2 too high on one pair and 2 too low on the next would add up
to zero, as if it made no mistakes at all. So before adding, we make every gap
positive.

There are two easy ways to do that. We could drop the minus sign, so -2 counts as 2.
Or we could multiply each gap by itself — called squaring — so 2 becomes 4 and -2 also
becomes 4. Both fix the adding-up problem.

We pick squaring, for one extra reason: it punishes big misses much harder than small
ones.

$$
miss by 2 → 2 × 2 = 4
miss by 8 → 8 × 8 = 64
$$

Compare two guesses across the sixty pairs. One misses every pair by 1. The other is
perfect on fifty-nine pairs and misses one by 8.

$$
sixty small misses → 60 × (1 × 1) = 60
one disaster → 59 × 0 + 8 × 8 = 64
$$

Squaring makes the steady guess win, and that is the behaviour we want. It has one
more advantage, but it only makes sense in `trunk/03`, when we start asking this
number for directions.

So we square every pair's gap and average them over all sixty pairs, and we get one
number for the whole guess. Let's call it the **mistake-score**. Lower is better. Zero
would mean the guess hits every pair dead on, but remember the wobble we added: on
these sixty pairs, even the secret formula itself scores 0.429, not 0. That is roughly
the neighbourhood a good guess should reach.
*/

export function mistakeScore(guess: Guess, examples: Example[]): number {
	if (examples.length === 0) return 0;

	let total = 0;
	for (const example of examples) {
		// The engine's answer (multiply, then add) minus the answer we wrote down.
		const mistake = guess.multiplier * example.x + guess.addOn - example.y;
		total += mistake * mistake;
	}
	return total / examples.length;
}

/*
## The simplest thing that could work

We now have an engine that holds a guess, and a number that says how wrong any guess
is. So, how do we find the right two numbers?

Let's start with the least clever idea anyone could propose: roll both numbers at
random, score that guess, and roll again, keeping whichever guess has scored lowest so
far. Why random? Because at this point the engine knows nothing. It has no idea where
the two numbers live, and rolling blindly is the one strategy that needs no knowledge
at all. That makes it the honest place to start, and it sets the floor: every later
lesson has to beat it, and we will be able to say by how much.
*/

// We look for each of the two numbers somewhere between -5 and +5.
export const GUESS_RANGE = 5;

export function randomGuess(random: () => number): Guess {
	return {
		multiplier: (random() * 2 - 1) * GUESS_RANGE,
		addOn: (random() * 2 - 1) * GUESS_RANGE
	};
}

/*
The search has to remember a few things between guesses:

- the best guess so far, and its mistake-score
- how many guesses it has tried
- how many of those have gone by since the record last fell

That last one turns out to be the whole lesson.
*/

//! hide
export interface Search {
	best: Guess;
	bestScore: number;
	guessesTried: number;
	guessesSinceImprovement: number;
}

export function startSearch(): Search {
	return {
		best: { multiplier: 0, addOn: 0 },
		bestScore: Infinity, // no record yet; the first scored guess becomes the record
		guessesTried: 0,
		guessesSinceImprovement: 0
	};
}
//! end

//! code: the-search
// One guess: roll two numbers, score them, keep them only if they score lower
// than the record. Returns the roll, so the demo can draw it.
export function tryOneGuess(search: Search, examples: Example[], random: () => number): Guess {
	const guess = randomGuess(random);
	const score = mistakeScore(guess, examples);
	search.guessesTried++;

	if (score < search.bestScore) {
		search.best = guess;
		search.bestScore = score;
		search.guessesSinceImprovement = 0;
	} else {
		search.guessesSinceImprovement++;
	}
	return guess;
}

//! hide
export function tryManyGuesses(
	search: Search,
	examples: Example[],
	random: () => number,
	count: number
): Guess {
	let latest: Guess = search.best;
	for (let index = 0; index < count; index++) {
		latest = tryOneGuess(search, examples, random);
	}
	return latest;
}
//! end

//! show: the-search
/*
## Watch it guess

That is the whole method, and the demo below runs the code you just read on our sixty
pairs. The grey dots are the pairs. The pale line is the setting the engine rolled most
recently, and the green line is the best setting it has found so far. Press the buttons
and watch the green line swing into the cloud of dots.
*/

//! demo: search

//! show: the-search
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
cloud, only a tiny patch of number pairs is any better than where it already stands, and
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

And look at what we are wasting. Every guess produces a mistake-score. We read that
score once, to answer "record or not?", and then we throw it away. The two guesses
could have taught us something — one lost by less than the other — but our engine
never uses that. Right now, nothing it sees ever teaches it anything.

> Random guessing never settles — can we guess smarter instead of more?
*/

/*
## The same story in a terminal

This file is both the page you are reading and a program you can run.
`bun run src/tree/trunk/01-guess-and-check/main.ts` does the 20,000-guess run in a
terminal and prints every number quoted above, so you can check them yourself.
*/

//! hide
function describe(guess: Guess): string {
	return `multiplier ${guess.multiplier.toFixed(3)}, add-on ${guess.addOn.toFixed(3)}`;
}

export const SEED = 7;
export const EXAMPLE_COUNT = 60;
export const BUDGET = 20000;

export function main(): void {
	const random = makeRandom(SEED);
	const examples = makeExamples(EXAMPLE_COUNT, random);

	console.log("trunk/01 — Guess and check\n");
	console.log("We pick a formula — double the number, then add three — and keep it to");
	console.log("ourselves. The engine sees 60 pairs of numbers and nothing else. It guesses");
	console.log("two numbers: one it multiplies the input by, and one it adds on. It rolls");
	console.log("both at random, scores the guess, and keeps the best one it has seen.\n");
	console.log("The wobble we added means nothing scores 0. The formula itself scores");
	console.log(`${mistakeScore(SECRET_FORMULA, examples).toFixed(3)} on these 60 pairs.\n`);

	const search = startSearch();
	const milestones = [1, 10, 100, 1000, 10000, BUDGET];
	const recordsAt: number[] = [];

	console.log("guesses    best score   best setting                         dry spell");
	for (let guess = 1; guess <= BUDGET; guess++) {
		tryOneGuess(search, examples, random);
		if (search.guessesSinceImprovement === 0) recordsAt.push(guess);
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
	console.log(
		`The last one was guess ${search.guessesTried - search.guessesSinceImprovement}, so the final`
	);
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
//! end

//! demo: jargon
