# Listing Lab — local question matching

A React + Lexical product-description editor with five formatting controls: **bold, italic, bullets, numbered lists and headings**. Choose a product type to load the relevant descriptor questions. The browser finds supporting passages in your description using **one small MiniLM encoder and one shared answerability head**.

The current demo separates the product taxonomy from the learned matcher. The taxonomy decides **which questions to ask**; the matcher checks **whether the description answers them**. Adding a category does not require a separate model. Product type is selected by the user, not inferred from the description.

| Part | Current implementation |
| --- | --- |
| Editor | React + Lexical; text and formatting stay in the current tab's session storage |
| Taxonomy | Original, project-authored categories and descriptors; no Etsy API integration |
| Semantic model | Frozen, quantized MiniLM-L3 shared by every category |
| Trained component | One small logistic regression head shared by every descriptor |
| Answer | Best supporting sentence/clause, or `null` when no passage meets the threshold |
| Browser runtime | Local WASM inference in a Web Worker |
| Rewriting controls | Selection menu only; no summarization or rewriting model connected |

## Run locally

On this computer, double-click `start.command`, then open **http://127.0.0.1:5173/**. Keep its terminal open. Stop with Control-C.

For a fresh checkout, install Node.js 20.19+ or 22.12+ and pnpm, then:

```sh
pnpm install
pnpm model:setup
pnpm model:train
pnpm dev
```

Setup downloads the pinned quantized MiniLM model and installs local WASM assets. Training runs locally. After setup, editor text never goes to an external service. Keep the local server running: this is not an offline PWA. Switching product types may fetch a new **local** taxonomy pack; inference on an already loaded type requires no network request.

## Use the editor

1. Select **Product type**: chairs/benches, mugs/cups, candles, necklaces, shirts/tops, art prints, bags/totes, or blankets/throws.
2. Write a description, or click **Try an example** to replace it with that product type's sample.
3. Expand a descriptor to see its question and supporting sentence/clause, or “not found.”

Changing product type keeps your text and reuses the same loaded model. The checklist and its count change with the category. Text and formatting are saved in sessionStorage for the current tab. Checks update after a 300 ms typing pause and clear when evidence is deleted.

Highlighting text still opens the **edit selection** menu (Summarize, Shorten, use simpler language, convert to bullet points). This is **menu only**; rewriting is not connected. Alt+Enter focuses the menu for a text selection.

## How the single model works

```text
Product type → small pack of descriptor questions, definitions and examples
Description → sentences/clauses → MiniLM embeddings
Passage + descriptor embeddings → shared answerability head
                                      ↓
                           supporting passage or null
```

The frozen `paraphrase-MiniLM-L3-v2` encoder has approximately 17.4 million parameters, 384-dimensional embeddings, and a roughly 17 MB quantized ONNX file. It runs in a Web Worker using Transformers.js / ONNX Runtime **WASM**, not WebGPU. The head is a tiny logistic regression over ten semantic similarity features. It is trained once across descriptors; there are no separate per-category models or fixed descriptor output neurons.

Each descriptor has a question, definition, positive examples and near-miss examples. Their embeddings are calculated during preparation, not each time the user types. The shared head judges whether each passage supplies the requested information. A descriptor is detected if its best passage exceeds the validation-selected threshold.

For example, selecting **Candles** loads the question “What kind of wick does the candle use?” A description containing “uses a braided cotton wick” can supply the answer. The UI displays that supporting passage under Wick Type. It does not generate a new sentence or convert the answer to a structured value such as `cotton`.

For each passage/descriptor pair, the matcher compares the passage embedding with the question, definition, positive examples and near misses. Ten features summarize those similarities and their differences. The trained head standardizes the features, applies its shared weights and produces a score. The highest-scoring passage is retained for each descriptor; a passage may answer several questions. Descriptor IDs identify results but are not inputs to the learned scoring function.

During editing, the worker reuses cached embeddings for unchanged passages. New edits replace pending work, and the UI ignores results for older revisions. Switching category reuses the same encoder and passage cache, then scores against the new category's questions.

This is **question-conditioned evidence matching**, not generative question answering or a fine-tuned extractive QA transformer. Answers are supplied passages (with whitespace normalized by segmentation), not rewritten summaries or narrowly extracted values. The score is not a calibrated probability. It cannot verify certifications or other seller claims. A question such as “What is the material?” should not itself count as an answer; boundary handling remains imperfect.

Only one encoder loads in the app. At most three category packs and 500 passage embeddings are cached in the worker. The catalog contains category metadata; only the selected category's descriptor vectors are fetched. This keeps browser work tied to the selected product type instead of the size of the whole taxonomy. For thousands of categories, shard the catalog by branch and deduplicate shared descriptor packs as a later optimization.

Encoder source/revision: `public/models/source.json`. Upstream license: Apache-2.0. [Model card](https://huggingface.co/sentence-transformers/paraphrase-MiniLM-L3-v2).

## Original taxonomy and training data

`data/marketplace-taxonomy.mjs` defines **eight product families and 30 descriptors**. They are an independently authored demonstration of common handmade/vintage marketplace concepts. They are **not Etsy's taxonomy** and use no Etsy API data, scraped listings, or Etsy IDs. The schema includes provenance metadata.

`data/question-dataset.mjs` combines the project's authored examples with new product-specific examples, missing-information challenges, and deterministic multi-sentence descriptions. Running training exports readable snapshots:

There are two distinct kinds of examples. **Support examples** in the taxonomy describe what an answer or near miss looks like; their embeddings are available during inference. **Labeled training passages** teach the shared head how to use the similarity features. Validation passages select the threshold, and test passages measure performance after fitting. Training updates the head's weights, not MiniLM's transformer weights, and editing text in the browser does not train either component.

| File | Purpose | Examples |
| --- | --- | ---: |
| `data/question-dataset/training.jsonl` | Fit shared head | 690 |
| `data/question-dataset/validation.jsonl` | Select threshold | 155 |
| `data/question-dataset/test.jsonl` | Evaluate seen descriptors | 80 |
| `data/question-dataset/unseen.jsonl` | Evaluate descriptors withheld from head training | 40 |

A row looks like:

```json
{"text":"It smells of fresh pine.","labels":["scent"],"source":"original-marketplace-expansion"}
```

`labels` contains **every descriptor actually stated**, using IDs from the taxonomy. Use `[]` for text that supplies none. Optional `category` restricts evaluation to that category's descriptors. Composite rows record `parents` for split auditing. Training expands each passage against all 26 training descriptor profiles into **17,940 binary question/passage pairs**. Four descriptors—wick type, gemstone, framing and print process—are excluded from both fitting and threshold selection.

Exact overlaps across splits and with support examples are removed. Composite parents stay in their own split. This does not eliminate semantic/template similarity; these are small synthetic seed sets, not independent real-world benchmarks. Exported JSONL files are generated snapshots: edit the source modules, not the snapshots.

## Train or extend it

### Add a category

In `data/marketplace-taxonomy.mjs`, add a category with a stable `id`, `name`, `path`, descriptor IDs and a sample description. Reuse existing descriptors where their meaning is the same. The current UI chooses a leaf category; paths do not automatically inherit descriptor lists.

### Add a descriptor

Add a definition following this shape (the source file uses a compact `d(...)` helper):

```js
{
  id: 'scent',
  name: 'Scent',
  question: 'What does the item smell like?',
  definition: 'The fragrance, aroma, or explicit absence of fragrance.',
  examples: [
    'It has a lavender fragrance.',
    'The aroma combines cedar and vanilla.',
    'This candle is unscented.'
  ],
  nonAnswers: [
    'What does it smell like?',
    'The fragrance has not been specified.'
  ]
}
```

Use several diverse positive examples, including explicit negative facts when relevant (e.g. “no assembly required” answers Assembly). Near misses should mention the subject without answering it. Distinguish related concepts: responsibly sourced wood is not a named certification; a design style is not necessarily a theme.

Add independently worded, correctly labeled passages to `data/question-dataset.mjs`. Its new-descriptor pools currently assign the first six examples to training, the next two to validation, and the final two to test. Existing descriptor examples also live in `data/training.mjs` and `data/additional-training.mjs`. Include complete descriptions, negatives, ambiguity and overlaps. Never copy the same paraphrase family into multiple evaluation splits when expanding this seed dataset. Review labels manually before trusting accuracy figures.

A new descriptor can be scored by the shared head using its runtime profile without adding a new output neuron. Transfer is not guaranteed: add training examples and evaluate it when quality matters. The four deliberately withheld descriptor IDs are listed in `unseenDescriptorIds`; remove an ID from that experiment if you want to train on it.

### Rebuild and validate

```sh
pnpm model:train
pnpm test
pnpm test:model
pnpm build
```

Training:

1. Loads the local frozen MiniLM encoder and caches passage embeddings in ignored `data/question-embeddings.json`.
2. Computes descriptor and passage similarity features; fits one shared logistic head.
3. Selects a global threshold by validation F1, then reports held-out and unseen-descriptor results.
4. Writes `public/models/question-matcher.json`, `public/taxonomy/*.json`, the JSONL datasets and `data/question-evaluation.json`.

Refresh the browser after training. Taxonomy packs and the head have fingerprints so mismatched builds fail visibly. Changing only data does not download or fine-tune MiniLM. Cached embeddings are tied to the pinned encoder metadata; delete the cache if changing encoder behavior manually. There is no GPU requirement for this training script.

The current preparation command rebuilds both the head and taxonomy packs together. There is no separate taxonomy-only build command yet, even when a change could theoretically reuse the existing head.

## Where the implementation lives

| File | Responsibility |
| --- | --- |
| `src/main.jsx` | Lexical editor, product-type selector, worker messages and evidence UI |
| `src/SelectionToolbar.jsx` | Floating selection menu |
| `src/classifier.worker.js` | Loads MiniLM and category packs, caches embeddings and schedules inference |
| `src/classifier.js` | Splits descriptions into candidate passages; also retains legacy scoring utilities |
| `src/question-matcher.js` | Shared similarity features, scoring and supporting-passage selection |
| `data/marketplace-taxonomy.mjs` | Category definitions, descriptor questions and runtime support examples |
| `data/question-dataset.mjs` | Builds labeled training and evaluation splits |
| `scripts/train-questions.mjs` | Fits the head, selects its threshold and generates model/taxonomy artifacts |
| `scripts/evaluate-questions.mjs` | Runs local inference smoke checks |
| `public/taxonomy/catalog.json` | Generated category metadata used by the selector |
| `public/taxonomy/<category>.json` | Generated questions and support embeddings for one category |
| `public/models/question-matcher.json` | Shared head weights, feature normalization, threshold and fingerprints |
| `data/question-evaluation.json` | Generated benchmark metrics and per-example errors |

## Current results and limits

The current synthetic benchmark uses threshold **0.75**:

| Evaluation | Precision | Recall | F1 |
| --- | ---: | ---: | ---: |
| Seen descriptors | 90.4% | 61.2% | 73.0% |
| Four withheld descriptors, with runtime support examples | 67.9% | 47.5% | 55.9% |

The original long chair description detects **11 of 14 expected details**. It currently misses capacity, finish and personalization; it correctly avoids inferring certification or theme. This is an architectural experiment, not a demonstrated accuracy improvement over the previous fixed-label model. Inspect every case in `data/question-evaluation.json` before drawing broader conclusions. The unseen test is **example-supported transfer**, not zero-shot transfer without examples.

The next quality step is a larger, independently reviewed set of question/passage pairs, with complete multi-label annotations, hard negatives and held-out product families. If similarity features remain insufficient, a small cross-encoder trained for answerability is a future alternative; it is not implemented here.

The former fixed-label MiniLM/USE comparison remains available in `docs/legacy-model-comparison.md`. Its browser model switch has been replaced. For those historical experiments, use `pnpm model:train:legacy` or `pnpm model:train:use`; they do not update the current app's shared head.
