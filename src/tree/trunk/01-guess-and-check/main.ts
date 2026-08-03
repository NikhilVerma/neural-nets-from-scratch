/*
## The problem

> Nobody can write down the steps that tell spam from real mail, or a 7 from a 1. But examples exist by the million. Can a machine work the steps out from examples alone?

Try writing the steps for spam yourself. You start with "flag it if it mentions a prize". Then a real competition result gets binned, so you add an exception for senders you know. Then spam arrives from a friend whose account was stolen. Every patch you add breaks something that already worked, and the list never closes.

Handwriting is worse. Write down what separates a 7 from a 1. A horizontal bar? Some people cross their 7s, some people put a serif on their 1s, and plenty of people write the bar so short it is a smudge.

What we do have is examples. Every "report spam" click is one. Every hand-filled postcode box that got read correctly is one. Millions of them, already answered by people, sitting in a file. So the question underneath this whole tree is whether the examples are enough on their own — whether the steps can be worked out backwards from the answers.
*/

/*
## Shrink it until it fits on one screen

We cannot start with spam. An email is thousands of words, the right answer is a judgement call, and when our program gets one wrong we will not be able to see why. That is debugging in the dark.

So we shrink the problem down until it fits on one screen, keeping only its shape: examples in, no instructions, and something that has to work the answer out.

Here is the shrunk version. A **rule** is a recipe that takes one number and hands back one number. "Double the number, then add three" is a rule: give it 4 and it hands back 11, give it 0 and it hands back 3. That is everything the word rule means on this page.

We pick a rule. We keep it to ourselves.
*/

/*
## The game

For this test we pick a rule and keep it to ourselves. We then pick sixty random numbers, run each one through the rule, and write down what comes out the other side. Those sixty pairs — number in, number out — are everything we hand over. The rule itself stays hidden. Looking at it would be cheating.

Now the thing that has to find it, which we will call the machine. It has two knobs. Each knob holds a number. The machine takes the number we give it, multiplies that number by the first knob's value, then adds the second knob's value. Multiply, then add. That is the entire machine.

If we set the two knob values correctly, the machine copies our rule. If the values are wrong, it talks nonsense.

So today's problem is this: can we do something that lets the machine find our rule by looking at the sixty pairs alone?
*/

// A pair we hand over: x went in, y came out.
export interface Example {
	x: number;
	y: number;
}

// The two knobs. Every setting of the machine is one of these.
export interface Knobs {
	multiplier: number;
	addOn: number;
}

// "Double the number, then add three" — the rule we are hiding.
export const SECRET_RULE: Knobs = { multiplier: 2, addOn: 3 };

/*
Our rule multiplies and adds, and so does the machine — the rule is written in exactly the two numbers the machine has knobs for. That is on purpose. Today we are testing the searching, so the machine has to be able to copy the rule in principle; otherwise a failure tells us nothing about the search. `trunk/04` hands it a rule it cannot copy, and that failure gets a lesson of its own.

### Dice we can re-roll

We need random numbers twice: to pick the sixty inputs, and to roll the machine's guesses. Every claim on this page is "this run did that". If each reload rolled different luck you could never tell whether a change to the method helped or the dice just landed better. So we write our own dice. Hand it a starting number — a seed — and it produces the same stream of numbers every time.
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

Sixty inputs between -5 and 5, each one run through the secret rule. We also add a small wobble to each answer, at most 1 up or down. Real measurements are never exact — a scale reads a gram light, a sensor rounds off — and a method that only works on spotless numbers is no use to anyone. The wobble also means no setting of the knobs can be perfect, which matters in a minute.
*/

export const INPUT_LOW = -5;
export const INPUT_HIGH = 5;
export const NOISE = 1;

export function makeExamples(count: number, random: () => number): Example[] {
	const examples: Example[] = [];
	for (let index = 0; index < count; index++) {
		const x = INPUT_LOW + random() * (INPUT_HIGH - INPUT_LOW);
		const wobble = (random() * 2 - 1) * NOISE; // random() is 0…1, so this is -1…1
		examples.push({ x, y: SECRET_RULE.multiplier * x + SECRET_RULE.addOn + wobble });
	}
	return examples;
}

/*
### The machine

Multiply, then add — the whole machine, in one line.
*/

export function runMachine(knobs: Knobs, x: number): number {
	return knobs.multiplier * x + knobs.addOn;
}

/*
## Correct compared to what?

We said "if we set the two knob values correctly". Correct compared to what? The machine cannot look at the rule, so it cannot check its knobs against the truth. All it has is the sixty pairs. We need a number that says how wrong a setting is, built out of nothing but those pairs.

Take one pair. Run its input through the machine. Compare what came out with what should have come out. That gap is the machine's mistake on that pair.

Two things about the gap. It can be negative, because the machine overshoots as easily as it undershoots — and a setting that lands 3 too high on one pair and 3 too low on the next is not a good setting, so the two must not cancel out. And a miss of 4 should hurt more than twice as much as a miss of 2, because one wild answer ruins a machine that is fine everywhere else.

Squaring the gap does both jobs at once. Negatives disappear. A miss of 2 costs 4 and a miss of 4 costs 16 — four times as bad, not twice.

Average the squared gaps over all sixty pairs and we get a single number for the whole setting. Call it the **mistake-score**. Lower is better, always. Zero would mean the machine hits every pair dead on, but we put a wobble in the answers, so nothing gets there. Feed the secret rule itself into the score and it comes out at 0.429 on these sixty pairs, not 0. That is roughly the neighbourhood a good setting should reach.
*/

export function mistakeScore(knobs: Knobs, examples: Example[]): number {
	if (examples.length === 0) return 0;

	let total = 0;
	for (const example of examples) {
		const mistake = runMachine(knobs, example.x) - example.y;
		total += mistake * mistake;
	}
	return total / examples.length;
}

/*
## The simplest thing that could work

We have a machine, and we have a number that says how wrong a setting of its knobs is. Now, how do we find good knob values?

Start with the least clever thing anyone could propose. Roll both knobs at random. Score that setting. Roll again. Keep whichever setting scored lowest so far, throw the rest away, repeat. No reasoning, no sense of direction, no memory beyond the single best setting we have seen.

It is worth building precisely because it is the worst thing that still counts as learning from examples. It sets the bar on the floor. Everything later in this tree has to clear it, and we will be able to say by how much.
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
	lastImprovementAt: number; // the guess number that last beat the record
}

export function startSearch(): Search {
	return {
		best: { multiplier: 0, addOn: 0 },
		bestScore: Infinity, // nothing to beat yet, so the first guess always wins
		latest: { multiplier: 0, addOn: 0 },
		latestScore: Infinity,
		guessesTried: 0,
		guessesSinceImprovement: 0,
		lastImprovementAt: 0
	};
}

// One guess: roll two knob values, score them, keep them only if they beat the
// record. Returns true when the record fell.
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

That is the whole method, and the demo below runs the code you just read on sixty pairs. The grey dots are the pairs. The pale line is the setting the machine rolled most recently; the green line is the best setting it has found. Press the buttons and watch the green line swing into the cloud of dots.
*/

//! demo: search

/*
## Watch it break

Keep pressing and watch one readout in particular: guesses since last improvement. It climbs, and it keeps climbing.

Here is a run of 20,000 guesses, seed 7. The record fell at guess 1, 4, 40, 97, 1002, 1748, 10222 and 11565 — and then not once in the remaining 8,435 guesses.

Read those numbers again. The gaps between improvements do not grow steadily. They multiply. Four guesses to the first improvement, forty to the next, then a hundred, then a thousand, then ten thousand. Each step down costs roughly ten times what the step before it cost.

The machine has not got worse at guessing. It is doing exactly the same thing at exactly the same speed. What shrank is the target. Once the green line runs roughly through the cloud, only a tiny patch of knob values is any better than where it already stands, and rolling dice into a tiny patch takes a very long time. Run it and watch the shape:
*/

//! demo: staircase

/*
The staircase is that same fact as a picture: a cliff, then flat. It is not flat because we have arrived. After 20,000 guesses the best setting is a multiplier of 2.075 and an add-on of 3.204, when the rule is 2 and 3 — still visibly off, and stuck there for the last 8,435 guesses. It is flat because every further step down now costs about ten times the last one.

One number in that run is worth a second look. The best setting scores 0.379, which is *under* the 0.429 the secret rule scores. The machine has bent a little to chase the wobble in our answers rather than the rule underneath it. It looks like winning and it is not. Park that; `trunk/08` is entirely about what it costs.

And look at what we are throwing away. Every guess produces a mistake-score. We read that score once, to answer "record or not?", and then bin it. Two guesses that both lost still told us something: one of them lost by less. We never look at that.

> Random guessing never settles — can we guess smarter instead of more?
*/

/*
## The same story in a terminal

This file is both the page you are reading and a program you can run. `bun run src/tree/trunk/01-guess-and-check/main.ts` does the 20,000-guess run in a terminal and prints every number quoted above, so you can check them yourself.
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
	console.log("We pick a rule — double the number, then add three — and keep it to ourselves.");
	console.log("The machine sees 60 pairs of numbers and nothing else. It has two knobs: it");
	console.log("multiplies the number we give it by the first, then adds the second. It rolls");
	console.log("both knobs at random, scores the setting, and keeps the best one it has seen.\n");
	console.log("The wobble we added means nothing scores 0. The rule itself scores");
	console.log(`${mistakeScore(SECRET_RULE, examples).toFixed(3)} on these 60 pairs.\n`);

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

	console.log(`\nThe rule was ${describe(SECRET_RULE)}.`);
	console.log(`After ${BUDGET} guesses the best setting is ${describe(search.best)}.\n`);
	console.log(`The record fell at guess: ${recordsAt.join(", ")}`);
	console.log(`The last one was guess ${search.lastImprovementAt}, so the final`);
	console.log(`${search.guessesSinceImprovement} guesses bought nothing.\n`);
	console.log("The gaps between improvements do not grow steadily — they multiply. Each step");
	console.log("down costs roughly ten times what the step before it cost. This does not settle");
	console.log("on a rule. It buys lottery tickets, and the tickets keep getting dearer.\n");
	console.log(
		"Next problem: random guessing never settles — can we guess smarter instead of more?"
	);
}

if (import.meta.main) {
	main();
}

//! demo: jargon
