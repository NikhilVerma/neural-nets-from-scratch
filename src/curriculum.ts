/**
 * The curriculum manifest — the single source of truth for the tree.
 *
 * Every node is a solution; every node's `problem` is the edge that leads INTO it:
 * the plain-English question its parent's lesson ends on. The tree UI, the server's
 * routes, and lesson navigation are all derived from this file.
 *
 * Adding a node = add a folder under src/tree/ + one entry here. Nothing else.
 */

export type Status = "built" | "next" | "planned" | "future";
export type Branch = "trunk" | "language" | "vision";

export interface CurriculumNode {
	/** Folder path under src/tree/, also the URL path. */
	id: string;
	branch: Branch;
	/** Plain-English lesson title. */
	title: string;
	/** id of the parent node; null only for the root. */
	parent: string | null;
	/** The edge: the problem (in plain English) that this node answers. */
	problem: string;
	/** One-line summary of the solution this node teaches. */
	solution: string;
	/** What engineers call the ideas taught here (secondary vocabulary). */
	jargon: string[];
	status: Status;
	/** Side spur off the parent rather than the main path onward. */
	side?: boolean;
}

export const NODES: CurriculumNode[] = [
	// ───────────────────────── trunk — how a machine learns anything
	{
		id: "trunk/01-guess-and-check",
		branch: "trunk",
		title: "Guess and check",
		parent: null,
		problem:
			"There is a hidden formula: a number goes in, another comes out. All we have are examples of its inputs and outputs. Can we build an engine that figures the formula out for us?",
		solution:
			"An engine that holds two numbers rolls them at random and keeps the best pair. Forces us to invent a way to score a guess.",
		jargon: ["loss", "parameters"],
		status: "built"
	},
	{
		id: "trunk/02-nudge-and-keep",
		branch: "trunk",
		title: "Nudge and keep",
		parent: "trunk/01-guess-and-check",
		problem: "Random guessing never settles — can we guess smarter instead of more?",
		solution:
			"Tap each of the two numbers up and down, keep whichever reduces the mistake-score. It converges!",
		jargon: ["hill climbing", "finite differences"],
		status: "built"
	},
	{
		id: "trunk/03-follow-the-slope",
		branch: "trunk",
		title: "Follow the slope",
		parent: "trunk/02-nudge-and-keep",
		problem:
			"Two test-runs per number, every step. Fine for 2 numbers — deadly for thousands. Can we know which way to nudge without trying?",
		solution:
			"The mistake-score is a formula; formulas have slopes; slopes point downhill. One pass, no test-runs.",
		jargon: ["derivative", "gradient descent", "learning rate"],
		status: "built"
	},
	{
		id: "trunk/04-bend-the-line",
		branch: "trunk",
		title: "Bend the line",
		parent: "trunk/03-follow-the-slope",
		problem:
			"Our engine is multiply-then-add — a straight line. Feed it curved data and it fails forever — not slow, but incapable.",
		solution:
			"Chaining two line-machines is still a line — we prove it. A tiny kink between them breaks the collapse.",
		jargon: ["activation function", "ReLU"],
		status: "built"
	},
	{
		id: "trunk/05-a-team-of-neurons",
		branch: "trunk",
		title: "A team of neurons",
		parent: "trunk/04-bend-the-line",
		problem:
			"One input, one output is a toy. Real questions have hundreds of inputs and need more than one opinion.",
		solution:
			"Every input feeds every neuron; stack the teams. First real payoff: a 2-D classification no single neuron can solve.",
		jargon: ["layer", "MLP", "hidden units"],
		status: "next"
	},
	{
		id: "trunk/06-the-grid-trick",
		branch: "trunk",
		title: "The grid trick",
		parent: "trunk/05-a-team-of-neurons",
		problem:
			"Look at this code: loops in loops in loops, index soup. Is there a tidier way to write all this?",
		solution:
			"Every layer is the same dance: grid of numbers times list of inputs. Name the pattern once, write it once.",
		jargon: ["matrix", "vector", "matmul"],
		status: "planned"
	},
	{
		id: "trunk/07-the-machine-that-does-calculus",
		branch: "trunk",
		title: "The machine that does calculus",
		parent: "trunk/06-the-grid-trick",
		problem:
			"Change the wiring, redo the calculus by hand, get it silently wrong. Every architecture change is fragile pencil-work.",
		solution:
			"Record every tiny step of a computation; walk the tape backwards multiplying slopes. Slopes now come free, forever.",
		jargon: ["autograd", "backpropagation", "chain rule"],
		status: "planned"
	},
	{
		id: "trunk/08-the-memorizing-machine",
		branch: "trunk",
		title: "The memorizing machine",
		parent: "trunk/07-the-machine-that-does-calculus",
		problem:
			"Training score hits zero… and answers on fresh examples get worse. It's memorizing the examples, not learning the rule.",
		solution:
			"What overfitting is, and how to catch it: grade on examples the machine has never seen; stop when fresh-example scores turn.",
		jargon: [
			"overfitting",
			"train/validation/test",
			"held-out data",
			"early stopping",
			"regularization"
		],
		status: "planned"
	},
	{
		id: "trunk/09-when-accuracy-lies",
		branch: "trunk",
		title: "When accuracy lies",
		parent: "trunk/08-the-memorizing-machine",
		problem: "Our spam-catcher scores 99% by never flagging anything. When does accuracy lie?",
		solution:
			"Of what you flagged, how much was real? Of the real, how much did you catch? You can't max both — pick your poison per problem.",
		jargon: ["precision", "recall", "precision/recall tradeoff", "thresholds"],
		status: "planned",
		side: true
	},
	{
		id: "trunk/10-training-craft",
		branch: "trunk",
		title: "Training craft",
		parent: "trunk/08-the-memorizing-machine",
		problem:
			"Every single step chews the whole dataset. And plain slope-steps zigzag down valleys. Training crawls.",
		solution:
			"Step after a small random handful — the noise turns out to help. Keep momentum through the zigzag; shrink steps as you close in.",
		jargon: ["minibatch", "SGD", "momentum", "Adam", "learning-rate schedule"],
		status: "planned"
	},
	{
		id: "trunk/11-remove-a-part-and-see",
		branch: "trunk",
		title: "Remove a part and see",
		parent: "trunk/10-training-craft",
		problem: "We've bolted on five tricks. Which ones actually matter — or are we cargo-culting?",
		solution:
			"The scientist's habit: take one piece out, retrain, compare honestly. Used everywhere from here on.",
		jargon: ["ablation"],
		status: "planned",
		side: true
	},

	// ───────────────────────── language — from letters to a talking machine
	{
		id: "language/01-letters-to-numbers",
		branch: "language",
		title: "Letters to numbers",
		parent: "trunk/10-training-craft",
		problem: "Text isn't numbers. What do we feed in?",
		solution:
			"Character IDs, one-slot-lit-up lists so 'z' isn't \"bigger\" than 'a'. Predict next char from one char: almost-names!",
		jargon: ["one-hot encoding", "bigram model", "softmax", "cross-entropy"],
		status: "planned"
	},
	{
		id: "language/02-words-as-neighborhoods",
		branch: "language",
		title: "Words as neighborhoods",
		parent: "language/01-letters-to-numbers",
		problem:
			"One-hot claims every letter is a total stranger to every other. Shouldn't similar things sit near each other?",
		solution:
			"Each symbol becomes a short learned list of numbers — a point in space. Watch similar symbols drift together on their own.",
		jargon: ["embeddings"],
		status: "planned"
	},
	{
		id: "language/03-maps-of-high-dimensions",
		branch: "language",
		title: "Maps of high dimensions",
		parent: "language/02-words-as-neighborhoods",
		problem:
			"We claim the points arranged themselves meaningfully. They live in 32 dimensions. How do we look at them?",
		solution:
			"Squash hundreds of dimensions to two and keep what matters. Doubles as a debugging tool — bad data shows up as wrong clusters.",
		jargon: ["dimensionality reduction", "PCA", "t-SNE", "UMAP"],
		status: "planned",
		side: true
	},
	{
		id: "language/04-a-window-on-the-past",
		branch: "language",
		title: "A window on the past",
		parent: "language/02-words-as-neighborhoods",
		problem: "Predicting from one symbol is amnesia. The machine needs the past.",
		solution:
			"Feed the last N symbols' points, glued side by side, into a trunk network. Noticeably better text.",
		jargon: ["context window", "n-gram MLP"],
		status: "planned"
	},
	{
		id: "language/05-carry-a-memory",
		branch: "language",
		title: "Carry a memory",
		parent: "language/04-a-window-on-the-past",
		problem:
			"Widen the window and the numbers to learn balloon; anything past the edge falls off a cliff. What if we carried a running summary instead?",
		solution:
			"Read left to right, folding each symbol into a running summary. Elegant — and cursed: the whole past squeezed through one keyhole.",
		jargon: ["RNN", "hidden state", "vanishing gradients"],
		status: "planned"
	},
	{
		id: "language/06-paying-attention",
		branch: "language",
		title: "Paying attention",
		parent: "language/05-carry-a-memory",
		problem:
			"Long-range links fade through the keyhole, and one-at-a-time reading can't be parallelized. Can the machine look back at what matters?",
		solution:
			"Each position writes a what-I'm-looking-for note and a what-I-contain note; match notes; take a relevance-weighted average of the past.",
		jargon: ["attention", "query/key/value"],
		status: "planned"
	},
	{
		id: "language/07-the-transformer",
		branch: "language",
		title: "The transformer",
		parent: "language/06-paying-attention",
		problem:
			"One round of glancing is shallow. Stack rounds deep and it refuses to train — scores stall or explode.",
		solution:
			"The engineering that makes depth work: shortcut wires, re-centering, several small attentions side by side, a digest network after each round.",
		jargon: [
			"residuals",
			"layer norm",
			"multi-head attention",
			"positional encoding",
			"transformer block"
		],
		status: "planned"
	},
	{
		id: "language/08-chunks-not-characters",
		branch: "language",
		title: "Chunks, not characters",
		parent: "language/07-the-transformer",
		problem:
			"Character by character, every text is enormously long — and the machine wastes capacity re-learning that q is followed by u. Could it read in chunks?",
		solution:
			"Merge the most common pairs, repeatedly; common words become one symbol, rare words stay spelled out.",
		jargon: ["tokens", "tokenization", "BPE", "vocabulary"],
		status: "planned"
	},
	{
		id: "language/09-a-tiny-gpt",
		branch: "language",
		title: "A tiny GPT",
		parent: "language/08-chunks-not-characters",
		problem: "We have every part. Does it add up to a language machine?",
		solution:
			"Assemble everything; train on real text in the browser; watch it write. About 300 readable lines.",
		jargon: ["GPT", "next-token prediction", "pretraining"],
		status: "planned"
	},
	{
		id: "language/10-how-to-choose-a-word",
		branch: "language",
		title: "How to choose a word",
		parent: "language/09-a-tiny-gpt",
		problem:
			"It outputs probabilities, not words. Always taking the top pick loops and bores; picking at random is unhinged. How to choose?",
		solution: "One dial from safe to wild; or trust only the top few; or only the believable few.",
		jargon: ["sampling", "temperature", "top-k", "top-p"],
		status: "planned"
	},
	{
		id: "language/11-teaching-it-to-talk",
		branch: "language",
		title: "Teaching it to talk",
		parent: "language/10-how-to-choose-a-word",
		problem: "It completes text. It doesn't answer you. Why did ChatGPT feel different?",
		solution:
			"Same machine, new diet: conversations. Start from trained weights instead of from scratch — works for any task, not just chat.",
		jargon: ["fine-tuning", "transfer learning", "SFT", "instruction tuning"],
		status: "future"
	},
	{
		id: "language/12-remember-your-work",
		branch: "language",
		title: "Remember your work",
		parent: "language/09-a-tiny-gpt",
		problem:
			"Generating token 1,000 recomputes everything about the previous 999 — again. Generation crawls.",
		solution:
			"Each token's notes never change once written — so keep them. From quadratic re-work to one new token's work.",
		jargon: ["KV cache"],
		status: "future",
		side: true
	},
	{
		id: "language/13-smaller-numbers",
		branch: "language",
		title: "Smaller numbers",
		parent: "language/09-a-tiny-gpt",
		problem:
			"The learned numbers won't fit in memory. Do we truly need 32 decimal places for each one? 16? 8? …4 bits?",
		solution:
			"Round the learned numbers to coarser grids and measure what survives. Surprisingly much.",
		jargon: ["quantization", "int8/int4"],
		status: "future",
		side: true
	},
	{
		id: "language/14-cheaper-glances",
		branch: "language",
		title: "Cheaper glances",
		parent: "language/09-a-tiny-gpt",
		problem:
			"Every new word glances at every old word. Double the text, quadruple the work. Long documents choke.",
		solution:
			"Only glance nearby; skip most positions; share the contains-notes between heads. Where the tree touches current research.",
		jargon: ["sliding-window attention", "sparse attention", "MQA/GQA"],
		status: "future",
		side: true
	},

	{
		id: "language/15-teacher-and-student",
		branch: "language",
		title: "Teacher and student",
		parent: "language/09-a-tiny-gpt",
		problem:
			"The engine we can afford to run is too small to learn well from raw text on its own. We already have a big engine that learned. Can the small one learn from the big one's answers instead?",
		solution:
			"Train the student on the teacher's full probability answers — soft answers carry far more than right or wrong. Modern engines eat a growing share of teacher-made runs.",
		jargon: ["distillation", "teacher-student", "soft labels", "synthetic data"],
		status: "future",
		side: true
	},
	{
		id: "language/16-what-we-feed-it",
		branch: "language",
		title: "What we feed it",
		parent: "language/09-a-tiny-gpt",
		problem:
			"The engine learns whatever the text teaches it. The internet repeats itself, contradicts itself, and says things we don't want repeated. What do we actually feed it?",
		solution:
			"Corpus building: clean it, de-duplicate it, mix the sources on purpose — and lately, let a teacher engine write part of the diet.",
		jargon: ["training corpus", "data curation", "deduplication", "data mixture"],
		status: "future",
		side: true
	},
	{
		id: "language/17-pointing-at-the-better-answer",
		branch: "language",
		title: "Pointing at the better answer",
		parent: "language/11-teaching-it-to-talk",
		problem:
			"It follows instructions now, but when it does not know, it guesses with full confidence. People cannot write the perfect answer — but they can point at the better of two. Can pointing train it?",
		solution:
			"Collect pairs of answers, let people pick the better one, and train the engine toward the picked side.",
		jargon: ["preference data", "reward model", "RLHF", "DPO"],
		status: "future"
	},

	// ───────────────────────── vision — from pixels to pictures
	{
		id: "vision/01-the-sliding-magnifying-glass",
		branch: "vision",
		title: "The sliding magnifying glass",
		parent: "trunk/10-training-craft",
		problem:
			"An image is a million numbers; our layers would need billions of numbers to learn — and would re-learn 'what an edge looks like' at every position.",
		solution:
			"One small pattern-detector slid across the whole image. A thousandfold fewer numbers to learn, and an edge is an edge anywhere, by construction.",
		jargon: ["convolution", "kernel/filter", "CNN"],
		status: "planned"
	},
	{
		id: "vision/02-naming-what-it-sees",
		branch: "vision",
		title: "Naming what it sees",
		parent: "vision/01-the-sliding-magnifying-glass",
		problem: 'Detectors fire on strokes and corners. How do strokes become "that\'s a 7"?',
		solution:
			"Detectors on detectors — strokes, shapes, digit parts — shrinking as you go, then a vote among ten names.",
		jargon: ["pooling", "feature hierarchy", "image classification", "MNIST"],
		status: "planned"
	},
	{
		id: "vision/03-drawing-instead-of-naming",
		branch: "vision",
		title: "Drawing instead of naming",
		parent: "vision/02-naming-what-it-sees",
		problem: "Naming is reading. Can the machine write — draw an image nobody gave it?",
		solution:
			"Squeeze images through a narrow waist and reconstruct; then sample the waist. Results: smudgy and haunted — and why is the lesson.",
		jargon: ["autoencoder", "latent space"],
		status: "future"
	},
	{
		id: "vision/04-a-smooth-imagination",
		branch: "vision",
		title: "A smooth imagination",
		parent: "vision/03-drawing-instead-of-naming",
		problem:
			"Pick a random point in the waist and you get garbage. The space is full of holes between the training examples.",
		solution:
			"Force each image to claim a soft neighborhood, not a point — the space between examples becomes meaningful, sampling becomes safe.",
		jargon: ["VAE"],
		status: "future",
		side: true
	},
	{
		id: "vision/05-the-forger-and-the-detective",
		branch: "vision",
		title: "The forger and the detective",
		parent: "vision/03-drawing-instead-of-naming",
		problem:
			"The blur comes from averaging. What if, instead of matching pixels, a critic judged whether the image looks real?",
		solution:
			"Two networks trained against each other: one draws, one calls fakes. Sharpness at last.",
		jargon: ["GAN", "generator", "discriminator", "adversarial training"],
		status: "future"
	},
	{
		id: "vision/06-judge-it-patch-by-patch",
		branch: "vision",
		title: "Judge it patch by patch",
		parent: "vision/05-the-forger-and-the-detective",
		problem:
			'One verdict for the whole image is vague feedback — "fake somewhere" doesn\'t say where.',
		solution:
			"The detective grades every small patch separately — local, specific pressure toward realism.",
		jargon: ["PatchGAN"],
		status: "future",
		side: true
	},
	{
		id: "vision/07-sculpting-from-noise",
		branch: "vision",
		title: "Sculpting from noise",
		parent: "vision/05-the-forger-and-the-detective",
		problem:
			"Forger-vs-detective training is a knife's edge: it collapses into repeating the few images that fool the critic. Is there a stable goal that still makes sharp images?",
		solution:
			"Learn one easy skill — remove a little noise — then start from pure static and apply it hundreds of times.",
		jargon: ["diffusion", "denoising"],
		status: "future"
	},
	{
		id: "vision/08-steering-the-noise",
		branch: "vision",
		title: "Steering the noise",
		parent: "vision/07-sculpting-from-noise",
		problem:
			"Our sculptor carves a face from static, but never the face we asked for. How do words steer the carving?",
		solution:
			"Fold a description of the goal into every denoising step, so each little cleanup leans toward the words.",
		jargon: ["conditioning", "text-to-image", "guidance"],
		status: "future"
	}
];

export const nodeById = new Map(NODES.map(node => [node.id, node]));

export function childrenOf(id: string): CurriculumNode[] {
	return NODES.filter(node => node.parent === id);
}
