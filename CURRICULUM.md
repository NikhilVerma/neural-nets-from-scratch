# The Curriculum Tree

This project is organized as a **tree**, not a list.

- **Every edge is a problem**, written as a plain-English question: something we tried that broke, got too slow, or hit a wall.
- **Every node is a solution**: the simplest thing that answers that problem — and nothing more.

You never learn a concept because "it's next in the book." You learn it because the thing you just built failed in front of you, and this is the smallest fix. The main page of the site renders this tree; clicking a node opens its lesson.

## Where edges come from

Three rules keep the tree honest:

1. **No node without a felt problem.** Every lesson ends by *demonstrating* the failure its child edge describes. The learner watches it break before they're offered the fix.
2. **Research gets reverse-engineered.** Most techniques exist because a researcher hit a wall and wrote a paper about the fix. The paper leads with the fix; we lead with the wall. Before adding any technique as a node, we must be able to answer: *what pain were its authors feeling?* — and write that pain as the edge, in plain English. If we can't articulate the edge, the node isn't ready to be added. (Example: GANs don't enter as "adversarial training, a novel idea" — they enter as "our generated images are blurry mud because averaging over possibilities makes mud; what if a critic judged realism instead?")
3. **One primary parent.** Some techniques answer several pains at once (diffusion fixes both GAN instability and VAE blur). The tree shows one primary edge; the lesson opens by acknowledging the other debts. We choose a readable tree over a technically complete diagram.

Jargon policy: plain English is the primary text everywhere. The engineer's term for each idea appears once, in parentheses, so learners can connect what they built to what the world calls it — listed below as `(jargon: ...)`.

Statuses: **next** = build first · **planned** = designed, build later · **future** = sketched only.

---

## Trunk — how a machine learns anything

```
[trunk/01] GUESS AND CHECK                                             (next)
   An engine holding two numbers rolls them at random and keeps the best pair.
   Forces us to invent a way to score a guess. (jargon: loss, parameters)
      │
      │  "Random guessing never settles — can we guess smarter instead of more?"
      ▼
[trunk/02] NUDGE AND KEEP                                              (next)
   Tap each of the two numbers up/down, keep whichever reduces the mistake-score.
   It converges! (jargon: hill climbing, finite differences)
      │
      │  "Two test-runs per number, every step. Fine for 2 numbers — deadly
      │   for thousands. Can we KNOW which way to nudge without trying?"
      ▼
[trunk/03] FOLLOW THE SLOPE                                            (next — existing 1.1 code lands here)
   The mistake-score is a formula; formulas have slopes; slopes point
   downhill. One pass, no test-runs. (jargon: derivative, gradient descent,
   learning rate)
      │
      │  "Our engine is multiply-then-add — a straight line. Feed it curved
      │   data and it fails forever — not slow, but INCAPABLE."
      ▼
[trunk/04] BEND THE LINE                                               (planned)
   Chaining two line-machines is still a line (we prove it). A tiny kink
   between them breaks the collapse. (jargon: activation function, ReLU)
      │
      │  "One input, one output is a toy. Real questions have hundreds
      │   of inputs and need more than one opinion."
      ▼
[trunk/05] A TEAM OF NEURONS                                           (planned)
   Every input feeds every neuron; stack the teams. First real payoff:
   a 2-D classification no single neuron can solve. (jargon: layer, MLP,
   hidden units)
      │
      │  "Look at this code: loops in loops in loops, index soup.
      │   Is there a tidier way to WRITE all this?"
      ▼
[trunk/06] THE GRID TRICK                                              (planned)
   Every layer is the same dance: grid of numbers × list of inputs. Name the
   pattern once, write matmul once. Notation as a tool of thought.
   (jargon: matrix, vector, matmul)
      │
      │  "Change the wiring, redo the calculus by hand, get it silently
      │   wrong. Every architecture change is fragile pencil-work."
      ▼
[trunk/07] THE MACHINE THAT DOES CALCULUS                              (planned)
   Record every tiny step of a computation; walk the tape backwards
   multiplying slopes. ~100 lines. Slopes now come free, forever.
   (jargon: autograd, backpropagation, chain rule — this node is micrograd)
      │
      │  "Training score hits zero... and answers on FRESH examples get
      │   worse. It's memorizing the examples, not learning the rule."
      ▼
[trunk/08] THE MEMORIZING MACHINE                                      (planned)
   What overfitting is and how to catch it: grade on examples the machine
   has never seen; stop when fresh-example scores turn. (jargon:
   overfitting, train/validation/test split, held-out data, early stopping,
   regularization)
      │
      ├──"Our spam-catcher scores 99% by never flagging anything.
      │   When does accuracy LIE?"
      │  ▼
      │  [trunk/09] WHEN ACCURACY LIES                        (planned, side node)
      │     Of the things you flagged, how many were real? Of the real ones,
      │     how many did you catch? You can't max both — pick your poison
      │     per problem. (jargon: precision, recall, the precision/recall
      │     tradeoff, thresholds)
      │
      │  "Every single step chews the WHOLE dataset. And plain slope-steps
      │   zigzag down valleys. Training crawls."
      ▼
[trunk/10] TRAINING CRAFT                                              (planned)
   Step after a small random handful (noise turns out to help!); remember
   your momentum through the zigzag; shrink steps as you close in.
   (jargon: minibatch, SGD, momentum, Adam, learning-rate schedule)
      │
      ├──"We've bolted on five tricks. Which ones actually matter — or
      │   are we cargo-culting?"
      │  ▼
      │  [trunk/11] REMOVE A PART AND SEE                     (planned, side node)
      │     The scientist's habit: take one piece out, retrain, compare
      │     honestly. Used everywhere from here on. (jargon: ablation)
      │
      ▼
   ════ THE TRUNK ENDS IN A CHOICE, NOT A WALL ════
   We have a general learning machine. The question is no longer
   "how do we learn?" but "what do we point it at?"
      │
      ├── "Text isn't numbers. What do we feed in?"          → LANGUAGE branch
      └── "An image is a million numbers; our layers would    → VISION branch
           need billions of numbers to learn."
```

---

## Language branch — from letters to a talking machine

```
[language/01] LETTERS TO NUMBERS                                       (planned)
   Character IDs, one-slot-lit-up lists so 'z' isn't "bigger" than 'a'.
   Predict next char from one char: almost-names! (jargon: one-hot
   encoding, bigram model)
      │
      │  "One-hot claims every letter is a TOTAL STRANGER to every other.
      │   Shouldn't similar things sit near each other?"
      ▼
[language/02] WORDS AS NEIGHBORHOODS                                   (planned)
   Each symbol becomes a short LEARNED list of numbers — a point in space.
   Watch similar symbols drift together on their own. (jargon: embeddings)
      │
      ├──"We claim the points arranged themselves meaningfully. They live
      │   in 32 dimensions. How do we LOOK at them? "
      │  ▼
      │  [language/03] MAPS OF HIGH DIMENSIONS               (planned, side node)
      │     Squash hundreds of dimensions to 2 and keep what matters:
      │     straight-line shadows vs keep-your-neighbors maps. Also a
      │     debugging tool — bad data shows up as wrong clusters. Used by
      │     nearly every later lesson. (jargon: dimensionality reduction,
      │     PCA, t-SNE, UMAP)
      │
      │  "Predicting from ONE symbol is amnesia. The machine needs
      │   the past."
      ▼
[language/04] A WINDOW ON THE PAST                                     (planned)
   Feed the last N symbols' points, glued side by side, into a trunk
   network. Noticeably better text. (jargon: context window, n-gram MLP)
      │
      │  "Widen the window and the numbers to learn balloon; anything past it
      │   falls off a cliff. What if we carried a running SUMMARY instead?"
      ▼
[language/05] CARRY A MEMORY                                           (planned)
   Read left to right, folding each symbol into a running summary.
   Elegant — and cursed: the whole past squeezed through one keyhole.
   (jargon: RNN, hidden state, vanishing gradients)
      │
      │  "Long-range links fade through the keyhole, and reading one-at-a-
      │   time can't be parallelized. When you see 'it', you LOOK BACK for
      │   what 'it' means. Can the machine look back at what matters?"
      ▼
[language/06] PAYING ATTENTION                                         (planned)
   Each position writes a what-I'm-looking-for note and a what-I-contain
   note; match notes; take a relevance-weighted average of the past.
   Relevance computed from content, on the fly. (jargon: attention,
   query/key/value)
      │
      │  "One round of glancing is shallow. Stack rounds deep and it
      │   refuses to train — scores stall or explode."
      ▼
[language/07] THE TRANSFORMER                                          (planned)
   The engineering that makes depth work, each shown failing without it:
   shortcut wires, re-centering, several small attentions side by side,
   a digest network after each round. That block, repeated. (jargon:
   residuals, layer norm, multi-head attention, transformer block)
      │
      │  "Character-by-character, every text is enormously long — and the
      │   machine wastes capacity re-learning that q is followed by u.
      │   Could it read in CHUNKS?"
      ▼
[language/08] CHUNKS, NOT CHARACTERS                                   (planned)
   Merge the most common pairs, repeatedly; common words become one
   symbol, rare words stay spelled out. Why every real model does this.
   (jargon: tokens, tokenization, BPE, vocabulary)
      │
      │  "We have every part. Does it add up to a language machine?"
      ▼
[language/09] A TINY GPT                                               (planned)
   Assemble everything; train on real text in the browser; watch it write.
   ~300 readable lines. (jargon: GPT, next-token prediction, pretraining —
   this node is nanoGPT/microGPT)
      │
      ├──"It outputs PROBABILITIES, not words. Always taking the top pick
      │   loops and bores; picking at random is unhinged. How to choose?"
      │  ▼
      │  [language/10] HOW TO CHOOSE A WORD                            (planned)
      │     One dial from safe to wild; or only trust the top few; or only
      │     trust the believable few. (jargon: sampling, temperature,
      │     top-k, top-p)
      │        │
      │        │  "It completes text. It doesn't ANSWER you. Ask a question,
      │        │   get three more questions back. Why did ChatGPT feel
      │        │   different?"
      │        ▼
      │     [language/11] TEACHING IT TO TALK                          (future)
      │        Same machine, new diet: conversations. Start from trained
      │        weights instead of from scratch — works for any task, not
      │        just chat. (jargon: fine-tuning, transfer learning, SFT,
      │        instruction tuning; RLHF as a further leaf — this node is
      │        the nanochat idea)
      │
      ├──"Generating token 1,000 recomputes everything about the previous
      │   999 — again. Generation crawls."
      │  ▼
      │  [language/12] REMEMBER YOUR WORK                              (future)
      │     Each token's notes never change once written — so keep them.
      │     Generation goes from quadratic re-work to one new token's work.
      │     (jargon: KV cache)
      │
      ├──"The learned numbers won't fit in memory. Do we truly need 32
      │   decimal places for each one? 16? 8? ...4 bits?"
      │  ▼
      │  [language/13] SMALLER NUMBERS                                 (future)
      │     Round the learned numbers to coarser grids and see what survives.
      │     Surprisingly much. (jargon: quantization, int8/int4)
      │
      └──"Every new word glances at EVERY old word. Double the text,
          quadruple the work. Long documents choke."
         ▼
         [language/14] CHEAPER GLANCES                                 (future)
            Only glance nearby; skip most positions; share the contains-
            notes between heads. Where the tree touches current research.
            (jargon: sliding-window attention, sparse attention, MQA/GQA)
```

---

## Vision branch — from pixels to pictures

```
[vision/01] THE SLIDING MAGNIFYING GLASS                               (planned)
   One small pattern-detector slid across the whole image. A thousandfold
   fewer numbers to learn, and an edge is an edge ANYWHERE by construction.
   (jargon: convolution, kernel/filter, CNN)
      │
      │  "Detectors fire on strokes and corners. How do strokes become
      │   'that's a 7'?"
      ▼
[vision/02] NAMING WHAT IT SEES                                        (planned)
   Detectors on detectors — strokes, shapes, digit parts — shrinking as
   you go, then a vote among ten names. Draw a digit, watch it guess.
   Graded with trunk/08's held-out data and trunk/09's honest measures.
   (jargon: pooling, feature hierarchy, image classification, MNIST)
      │
      │  "Naming is reading. Can the machine WRITE — draw an image nobody
      │   gave it?"
      ▼
[vision/03] DRAWING INSTEAD OF NAMING                                  (future)
   Squeeze images through a narrow waist and reconstruct; then sample the
   waist. Results: smudgy and haunted — and WHY is the lesson: averaging
   over possibilities makes mud. (jargon: autoencoder, latent space)
      │
      ├──"Pick a random point in the waist and you get garbage. The space
      │   is full of holes between the training examples."
      │  ▼
      │  [vision/04] A SMOOTH IMAGINATION                              (future)
      │     Force each image to claim a soft NEIGHBORHOOD, not a point —
      │     the space between examples becomes meaningful, sampling
      │     becomes safe. (jargon: VAE)
      │
      └──"The blur comes from averaging. What if, instead of matching
          pixels, a CRITIC judged whether the image looks REAL?"
         ▼
         [vision/05] THE FORGER AND THE DETECTIVE                      (future)
            Two networks trained against each other: one draws, one calls
            fakes. Sharpness at last. (jargon: GAN, generator,
            discriminator, adversarial training)
            │
            ├──"One verdict for the WHOLE image is vague feedback —
            │   'fake somewhere' doesn't say where."
            │  ▼
            │  [vision/06] JUDGE IT PATCH BY PATCH                     (future)
            │     The detective grades every small patch separately —
            │     local, specific pressure toward realism. (jargon:
            │     PatchGAN)
            │
            │  "Forger-vs-detective training is a knife's edge: it
            │   collapses into repeating the few images that fool the
            │   critic. (And the VAE path stays blurry.) Is there a STABLE
            │   goal that still makes sharp images?"
            ▼
         [vision/07] SCULPTING FROM NOISE                              (future)
            Learn one easy skill — remove a LITTLE noise — then start from
            pure static and apply it hundreds of times. (jargon: diffusion,
            denoising)
```

---

## Future branches (sketched only — attach points reserved)

- **Decisions branch**, off the end of the trunk: "there's no answer key — only rewards, and they arrive late" → reinforcement learning.
- **Sound branch**, off vision/01: "sound becomes a picture (spectrogram) — can the magnifying glass hear?"
- **Scale wall**, off language/09: "one browser tab isn't enough" — the honest node where TypeScript stops being the right tool; we say so and point at llm.c / GPU-land. Hardware-level optimization stays **out of scope** for this tree.

---

## Coverage map (requested concepts → nodes)

| Concept | Node |
|---|---|
| Loss, gradient descent, learning rate | trunk/01–03 |
| Activations, MLP, matrices | trunk/04–06 |
| Autograd / backprop | trunk/07 |
| Overfitting, held-out/test data | trunk/08 |
| Precision/recall tradeoff | trunk/09 |
| Batches, Adam, schedules | trunk/10 |
| Ablation | trunk/11 |
| Tokens (and why) | language/08 |
| Embeddings | language/02 |
| PCA, t-SNE, UMAP | language/03 |
| RNN | language/05 |
| Attention, transformers | language/06–07 |
| Temperature, top-k, top-p | language/10 |
| Fine-tuning | language/11 |
| KV cache | language/12 |
| Quantization | language/13 |
| Sparse/sliding attention, MQA/GQA | language/14 |
| CNN | vision/01 |
| VAE | vision/04 |
| GAN | vision/05 |
| PatchGAN | vision/06 |
| Diffusion | vision/07 |
