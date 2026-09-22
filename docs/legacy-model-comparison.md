> Historical notes for the previous fixed-label comparison. The current app uses the shared question matcher described in ../README.md. The model switch and default described below no longer apply. Run `pnpm model:train:legacy` in place of this document's old `pnpm model:train` command.

# Listing Lab — local concept detection

A React + Lexical editor with **five toolbar controls** (bold, italic, bullets, numbered lists and an H2 heading toggle), and live detection of all 16 product descriptors in the supplied reference.

## Run locally

The dependencies, encoder and trained classifier have already been prepared on this computer.

**Double-click `start.command`**, then visit **http://127.0.0.1:5173**. Keep the terminal window open while using the demo. Stop it with Control-C. Only one server can use port 5173 at a time.

With Node.js 20.19+ or 22.12+ and pnpm installed, the normal commands are:

```sh
pnpm install
pnpm model:setup
pnpm model:train
pnpm model:setup:use
pnpm model:train:use
pnpm dev
```

`model:setup` needs internet access to download the encoder from Hugging Face. It copies the ONNX runtime assets from the installed dependency. All model files are served from localhost afterward; **no external service receives editor text**. Running inference does not make network requests after initialization. This is a locally served application, not an installable offline PWA: keep the local server running to load/reload the page.

## Using the demo

- Type a description or choose **Try an example** (replaces the current description).
- Use **Detection model** to switch between **Universal Sentence Encoder Lite** and **MiniLM-L3** on the same description. USE Lite is the default for this experiment; the selection is remembered per tab. Switching unloads the previous worker, clears its scores, and reanalyzes the draft without altering the text.
- Green checks identify details detected in the description. Click a descriptor to see its supporting sentence or clause, or an example of missing information.
- Detections update after a 300 ms typing pause, including when text is deleted. Formatting changes do not trigger inference.
- **Clear description** empties the editor. Keyboard undo/redo is available.
- Highlight text to show a floating **edit selection** dropdown with **Summarize**, **Shorten**, **use simpler language**, and **convert to bullet points**. This is currently a menu-only UI: choosing an option closes it without changing the text. Rewriting will be connected later. With a selection active, Alt+Enter focuses the dropdown; arrow keys navigate its menu and Escape closes it.
- Text and formatting are saved in sessionStorage for the current browser tab so a refresh restores them. Closing the tab ends the draft session.
- All descriptors are suggestions; there is no requirement to fill every one. Certification detection means a statement was supplied, not that the claim is verified.

## What is actually trained?

There are two frozen pretrained encoders, each with separately trained classifier weights:

- **MiniLM-L3**: `paraphrase-MiniLM-L3-v2`, a 17.4-million-parameter encoder with a roughly 17 MB quantized ONNX file and 384-dimensional embeddings.
- **Universal Sentence Encoder Lite**: the TensorFlow.js browser model, with 512-dimensional embeddings and about 28 MB of model/vocabulary assets. This is the Lite variant, not the full or multilingual USE model.

A **task-specific multi-label logistic regression head** is trained on normalized embeddings from each encoder: 16 independent outputs, allowing one sentence to supply several descriptors. The encoders are frozen, not fully fine-tuned. Both heads use identical training/validation/test splits and training settings, with thresholds selected independently on validation data. This is supervised classification, not a keyword/regex detector and not a generative LLM.

MiniLM runs through **Transformers.js / ONNX Runtime WASM**; USE Lite runs through **TensorFlow.js WASM**. Both run inside a Web Worker with the tiny classifier head evaluated in JavaScript. Only the selected encoder is loaded. Models, vocabulary, and WASM files are served from this project, without cloud inference. WebGPU is not enabled in this version. Full sentences and substantive clauses are scored independently, allowing details in dense sentences to survive pooling. Short noun lists retain their context, and questions are not split into affirmative-looking clauses. Generic punctuation and conjunction boundaries select spans; only the trained model assigns descriptor labels. Span embeddings are cached within the worker, and obsolete results are ignored while typing. Long paragraphs are segmented into overlapping windows so their tails are retained, though extreme token-heavy text can still encounter an encoder's token limit.

Sources: [encoder model card](https://huggingface.co/sentence-transformers/paraphrase-MiniLM-L3-v2), [ONNX conversion](https://huggingface.co/Xenova/paraphrase-MiniLM-L3-v2), [local Transformers.js models](https://huggingface.co/docs/transformers.js/custom_usage). Encoder source and revision are recorded in `public/models/source.json`. Upstream model license: Apache-2.0.

## Accuracy and limitations

### USE comparison

Results on the same 28 test examples (511 training and 63 validation examples), without training on the test set:

| Encoder | Precision | Recall | F1 | Exact label-set match |
| --- | ---: | ---: | ---: | ---: |
| MiniLM-L3 | 80.0% | 80.0% | 80.0% | 67.9% |
| USE Lite | 90.5% | 76.0% | 82.6% | 75.0% |

USE has fewer false positives on this tiny set, but misses more positive labels. It is an alternative to compare, not a demonstrated universal improvement. On the separate known dining-chair regression, MiniLM detects all 14 stated details; USE detects 12, missing **Features** and **Seat Height**. Both correctly leave **Certifications** and **Theme** unchecked for that paragraph. USE also misses Material in the isolated responsibly-sourced-wood sentence. Reports are in `data/evaluation-use.json` and `data/regression-evaluation-use.json`.

The official browser implementation and model identity are documented in the [TensorFlow.js USE README](https://github.com/tensorflow/tfjs-models/tree/master/universal-sentence-encoder). Download origins, sizes and hashes are recorded in `public/models/use-source.json`. The package declares older TensorFlow.js peer versions; this project pins its core and converter to 4.22.0 to share one tested runtime with the WASM backend.

To reproduce the experiment, run `pnpm model:setup:use`, `pnpm model:train:use`, and `pnpm model:evaluate:use`. The last command reports experimental misses without treating them as build errors. The USE setup command needs internet access only to download the official TensorFlow-hosted assets. Training and inference then use local files. The model's 512-dimensional head is stored separately in `public/models/classifier-use.json`, so MiniLM's classifier remains intact.

Browser smoke check on this computer: first analysis of the same 163-word chair description took approximately **1.64 seconds with USE** and **0.97 seconds with MiniLM**, after each model's warm-up. These single-run observations exclude model loading and the typing debounce, are not statistically controlled benchmarks, and vary by hardware. Repeated unchanged spans are cached. USE's graph, vocabulary and weights total **28.37 MB**, compared with **17.45 MB for MiniLM's ONNX weights**; runtime bundles and classifier heads are additional. Peak browser memory has not been measured.

### Shared limitations and MiniLM baseline

This is an **experimental English-language demo**, trained on a small hand-authored seed dataset, not production seller data:

- 511 training examples; 63 separate validation examples for per-label thresholds. These include hardware contents, furniture compatibility, functional features, mixed details, and sourcing/style distinctions.
- The unchanged 28-example smoke test now scores **80.0% micro precision, 80.0% micro recall, 80.0% micro F1**, 67.9% exact label-set match, through the same sentence-and-clause path as the browser. The initial sentence-only version scored 86.4% precision and 76.0% recall: recall improved, with a precision tradeoff on this tiny set.
- The supplied long dining-chair description is a separate development regression, not a held-out accuracy claim. It now detects all 14 stated concepts, including age group, dimensions, capacity, features, hardware contents and compatibility. “Responsibly sourced” does not identify a certification; decor styles do not establish a theme. The exact user paragraph is not included in training or threshold selection.
- These are small smoke-benchmark results, not statistically robust production accuracy estimates. See `data/evaluation.json` for every expected and predicted result, including failures.
- Known weaknesses: indirect descriptions of capacity, compatibility, features and personalization; multiple concepts packed into one sentence; occasional false detections on questions and descriptor-only phrases.
- “No assembly required” counts as assembly information. Unknown/missing details should not count, but the experimental model can make mistakes.
- Seat Height is trained as its own specific category; an isolated seat-height measurement need not also trigger Dimensions. A named product type should be stated, rather than inferred from care instructions.
- There is no entity extraction, claim validation or automatic form filling in this version. Scores are not calibrated probabilities and are not displayed as certainty percentages.

For a stronger next version, collect real listing sentences, label overlapping categories consistently, enlarge the validation/test sets, and train/evaluate on that corpus. Keep test examples out of training and threshold selection.

## Train the descriptor classifiers

Training updates the small classifier head for each encoder. It does **not** fine-tune MiniLM or USE, and it does not train the selection-menu rewriting actions. Both classifiers learn the same 16 descriptor labels from the same dataset.

### 1. Open the project and prepare the models

On the original development computer:

```sh
cd "/Users/hcnewsom/Documents/ChatGPT/Concept Detection Demo"
```

On another computer, change into your own checkout directory. You need Node.js 20.19+ or 22.12+ and pnpm available in your terminal. Check with `node --version` and `pnpm --version`.

For a fresh checkout, install dependencies and download the encoders:

```sh
pnpm install
pnpm model:setup       # MiniLM model and ONNX runtime assets
pnpm model:setup:use   # USE Lite model, vocabulary and TensorFlow WASM assets
```

These setup steps require internet access. Skip them when the dependencies and model assets are already present; normal retraining runs locally. Run both setup commands if you want to use both choices in the editor.

### 2. Add labeled examples

Add new training rows inside the existing `additionalTraining` array in [data/additional-training.mjs](data/additional-training.mjs). This array is already imported by the main dataset. For example, insert these objects before its closing `];`:

```js
{ text: 'An oak chair with a reinforced backrest.',
  labels: ['Product Type', 'Material', 'Features'] },
{ text: 'Delivered ready to use; no assembly is needed.',
  labels: ['Assembly'] },
{ text: 'Please provide the dimensions.',
  labels: [] },
```

Each row has a `text` string and a `labels` array. Include **every applicable label**, because an omitted label is treated as a negative during training. An empty array means the text supplies none of the descriptors. Use these exact, case-sensitive names from [src/descriptors.js](src/descriptors.js):

```text
Age Group, Assembly, Capacity, Care, Certifications, Compatibility,
Contents, Dimensions, Features, Finish, Material, Personalization,
Product Type, Seat Height, Style, Theme
```

Use varied wording, different product types, mixed-concept sentences, and negative examples. Label details actually supplied: a question about dimensions is not a measurement; responsibly sourced wood is Material, not evidence of a named Certification; farmhouse is Style, while an animal motif is Theme. A statement such as “no assembly required” still supplies Assembly information.

The files are JavaScript modules, not standalone JSON datasets. Generated JSON examples can be reviewed and copied into the arrays, but there is currently no JSON import command or formal schema validator. Review generated labels, reject unknown names, and remove duplicates before training.

### 3. Keep training, validation, and testing separate

| Split | Where to edit | Purpose |
| --- | --- | --- |
| Training | `additionalTraining` in `data/additional-training.mjs`, or `training` in `data/training.mjs` | Fits classifier weights |
| Validation | `additionalValidation` in `data/additional-training.mjs`, or `validation` in `data/training.mjs` | Selects a detection threshold for each label |
| Test | `test` in `data/training.mjs` | Measures performance after training and threshold selection |
| Known regressions | `data/regressions.mjs` | Checks specific descriptions and category boundaries during development |

Splits are defined manually; the script does not randomly divide the data. Keep duplicates, paraphrases of the same seed, and sentences from the same source description in one split. Do not copy test examples into training or adjust thresholds to make the test report look better. Keep a human-reviewed test set of realistic descriptions when expanding with generated data. Known regression results are useful development checks, not independent accuracy estimates.

### 4. Train one or both classifiers

```sh
pnpm model:train       # Train the MiniLM classifier
pnpm model:train:use   # Train the USE Lite classifier
```

Run both after a dataset change if you want an up-to-date comparison. The scripts share training code but write separate classifier files; training one does not update the other.

[scripts/train.mjs](scripts/train.mjs) performs these steps:

1. Loads the selected local encoder through [scripts/encoder.mjs](scripts/encoder.mjs).
2. Computes normalized embeddings, or reuses a matching embedding cache.
3. Trains 16 independent logistic classifiers, allowing multiple labels per example.
4. Selects per-label thresholds on validation examples using the same sentence-and-clause analysis as the browser. Threshold selection favors precision using F0.5.
5. Evaluates on the test split, prints metrics, and saves the classifier and report.

The encoder identity, source metadata and dataset are fingerprinted. Changing examples or labels invalidates that encoder's cache automatically; you normally do not need to delete it. Cache files are `data/embeddings.json` and `data/embeddings-use.json` and are ignored by Git. If you change embedding preprocessing code, remove the affected cache before retraining because code changes are not included in the fingerprint.

### 5. Inspect the outputs and check regressions

Training overwrites the selected model's classifier and evaluation report. Save the previous versions in Git or make a copy before an experiment if you want to compare or roll back.

| Output | MiniLM | USE Lite |
| --- | --- | --- |
| Classifier weights and thresholds | `public/models/classifier.json` | `public/models/classifier-use.json` |
| Test metrics and individual predictions | `data/evaluation.json` | `data/evaluation-use.json` |
| Regression report, after running the commands below | `data/regression-evaluation.json` | `data/regression-evaluation-use.json` |

Interpret the reported metrics as follows:

- **Precision:** how many predicted labels were correct; low precision means more false detections.
- **Recall:** how many expected labels were detected; low recall means more missed details.
- **F1:** combines precision and recall. These three metrics are micro-averaged across label decisions.
- **Exact match:** how often an example's entire predicted label set matched its expected set.

Inspect individual `cases`, not just the aggregate scores. The comparison figures earlier in this README are a recorded baseline; training does not automatically update this document.

```sh
pnpm test                 # Core logic and both classifier artifact checks
pnpm test:model           # MiniLM regressions; exits with an error on a mismatch
pnpm model:evaluate:use   # USE regressions; reports misses without asserting success
```

The USE evaluation command can finish successfully even when the report contains `missed` or `unexpected` labels. To require an exact match for every known USE regression, run:

```sh
node scripts/evaluate-description.mjs --use --assert
```

The current USE baseline has known regression misses, so that strict command is expected to fail until those cases improve. `pnpm test` expects both trained classifier files to exist.

### 6. Try the new classifier in the browser

```sh
pnpm dev
```

If the local server is already running, keep it running rather than starting another on port 5173. Open [the local demo](http://127.0.0.1:5173/), reload the page to load the new weights, and select the encoder you retrained under **Detection model**. Try descriptions that were not used in training, then inspect the evidence behind detected labels. Switching models lets you compare on the same draft.

If you use `pnpm preview` instead of the development server, rebuild first with `pnpm build` so the new classifier files are copied into `dist`.

### Common training problems

- **`node` or `pnpm` is not found:** install the prerequisites or add them to your terminal's PATH. The double-click launcher can use Codex's bundled Node, but that does not make `node` and `pnpm` available in your shell.
- **Missing encoder files or source metadata:** rerun the matching `model:setup` command before training.
- **Syntax error after editing examples:** check commas, quotes, and array brackets in the dataset module. `node --check data/additional-training.mjs` checks its JavaScript syntax, not label correctness.
- **The editor shows old results:** reload and check which encoder is selected; retraining MiniLM does not change USE's classifier or vice versa.
- **New data improves one category but hurts another:** inspect false positives and missed labels, correct inconsistent annotations, and add diverse examples. Do not fix this by moving failing test examples into training.

## Development

```sh
pnpm test
pnpm test:model
pnpm build
pnpm preview
```

`data/training.mjs` and `data/additional-training.mjs` contain the labeled examples and split definitions. `scripts/train.mjs` is deterministic and reuses a fingerprinted embedding cache. It calibrates and evaluates the same scoring path used by the browser, then writes the trained head and evaluation report. `data/regressions.mjs` and `scripts/evaluate-description.mjs` check the supplied description and category boundaries, writing `data/regression-evaluation.json`. `scripts/setup-model.mjs` downloads the local encoder/runtime assets. `src/classifier.worker.js` owns local inference, `src/classifier.js` handles segmentation and scoring, and `src/main.jsx` implements the editor.

Large downloaded model files, WASM runtime files, dependencies, and build output are ignored by Git; the trained head and dataset are included. Re-run setup when installing a fresh checkout; it uses the upstream revision pinned in `public/models/source.json`. To upgrade the pretrained encoder intentionally, remove that source manifest, `public/models/encoder`, and `data/embeddings.json`, rerun setup, and retrain.

The optional `read_detected_details` WebMCP tool is exposed only when the browser supports it. It returns the same description and detection state shown in the UI.
