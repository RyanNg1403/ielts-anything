# IELTS Academic practice-test generation checklist

Research checked 11 October 2026. Use this checklist with [Listening](listening.md), [Reading](reading.md), [Writing](writing.md), [Speaking](speaking.md) and the [source register](sources.md). It governs **practice-test authoring**, not official IELTS certification.

**MUST** is a release gate for the proposed generator. **SHOULD** is a default that may be overridden with a recorded reason. Each item distinguishes an official requirement from a chosen authoring policy. Confidence labels mean:

- **confirmed-official**: an IELTS partner explicitly states the fact; preparation guidance is identified where applicable.
- **confirmed-by-papers**: observed in an identified official sample, not proof of a universal frequency or rule.
- **examiner-claim**: attributed testimony, including historical research evidence.
- **unverified; design recommendation**: our proposed quality gate or default, not an IELTS mandate.

Public materials establish format and many task mechanics, but do not expose the complete confidential item-writing specification. Structural fidelity can be checked deterministically; equivalent difficulty requires expert review and learner pretesting. Do not promise that an uncalibrated generated test is indistinguishable from an operational IELTS test. [DEV], [IW]

**Cambridge evidence scope:** the notes below use only Cambridge 12–20 local Academic PDFs (four tests each) and Cambridge 21 question pages; books 1–11 do not shape these rules. Full source rows, page locators and denominators are in [the Cambridge ledger](cambridge/corpus.md) and [its pattern report](cambridge/patterns.md). Cambridge observations refine practice defaults but do not turn released-paper frequencies into official quotas.

## 1. Gates for every generated test

- [ ] **MUST** identify the product as IELTS-style practice, set `Academic`, and declare delivery mode before assigning timers. Listening/Speaking are shared with General Training; Academic Reading/Writing have their own content. **confirmed-official** [F-L], [F-R], [F-W], [F-S]. Product labelling is **unverified; design recommendation**.
- [ ] **MUST** produce a complete package: candidate materials, instructions, stimuli, answer sheet/interface, answer key or assessment rubric, and timings. Listening additionally needs playable audio and an aligned transcript; Speaking needs examiner-facing prompts and a cue card. **unverified; design recommendation**, informed by official package components [HUB], [P-L], [P-R], [P-W], [P-S]. A transcript-only exercise is not a complete Listening simulation. **Cambridge evidence:** 36 local C12–20 sets include all four skills; C21 lacks audio/transcript, Task 1 images and Speaking, so its question pages alone do not form a complete test. [corpus.md](cambridge/corpus.md), [gaps.md](cambridge/gaps.md)
- [ ] **MUST** validate counts, question numbering, word limits, option labels, referenced paragraph/visual labels, answer cardinality and key coverage programmatically. **unverified; design recommendation**; official count and response constraints [F-L], [F-R]. **Cambridge evidence:** the C12–21 ledger contains 40 Listening and 40 Reading sets; numbering, caps and key coverage vary by block. C13 T1 Q8 is omitted by the OCR sidecar but verified FALSE from the complete PDF key, p.119. The corpus supports checking every paper independently. [patterns.md](cambridge/patterns.md), [corpus.md](cambridge/corpus.md)
- [ ] **MUST** attach an internal evidence record to each objectively marked item: exact source span or audio timestamp, intended reasoning, answer form, alternatives and why distractors fail. Keep that record out of the candidate view. **unverified; design recommendation**, informed by item-writing/editing research [IW], [DEV].
- [ ] **MUST** have an independent reviewer solve each item from the candidate material alone and reject ambiguity, missing evidence, multiple unintended answers and inaccurate keys. An LLM review is useful but is not psychometric validation. **unverified; design recommendation**, informed by official editing/pretesting [DEV], [IW].
- [ ] **MUST** distinguish externally verified rules, observed sample patterns and invented authoring defaults in the test specification. **unverified; design recommendation**. Never turn a sample's block size, visual density or answer distribution into an official quota. Evidence context: variable counts [F-L], [F-R].
- [ ] **MUST** use original or appropriately licensed stimuli; no copied operational paper presented as generated work. **unverified; design recommendation**. Official samples are references for structure [HUB]. **Cambridge evidence:** the new generation rules are based on C12–21 observations, while the deliverables use paraphrases and aggregates; Cambridge's full papers remain private and are not candidate content. [gaps.md](cambridge/gaps.md)
- [ ] **SHOULD** use the learner's chosen topic as a theme across varied settings, genres and viewpoints. For “AI labs”, include accessible social, historical, organizational and scientific contexts rather than assume specialist knowledge in every passage. **unverified; design recommendation**, grounded in non-specialist Reading and accessible Writing requirements [F-R], [F-W].
- [ ] **SHOULD** select a balanced mixture of task types and skills rather than insert every available type in every test. No public source requires all types on each paper. **unverified; design recommendation**; variable question counts/types [F-L], [F-R] and balance process [DEV]. **Cambridge evidence:** Reading mixes vary by printed passage position: Passage 1 has 34 TFNG blocks across 34 tests, Passage 2 has 26 matching-information blocks across 26 tests, and Passage 3 has 6 TFNG blocks across 6 tests plus 25 YNNG blocks across 25 tests. These are sample observations, not target quotas. [patterns.md](cambridge/patterns.md)
- [ ] **MUST**, before claiming comparable difficulty, conduct trained item-writer review, pretest with an appropriate learner sample, inspect item facility/discrimination and timing, revise weak items, and compare against suitable official practice material under matched conditions. Record sample size and uncertainty. **unverified; design recommendation** derived from official editing, pretesting and standards fixing [DEV]. Do not apply a made-up universal statistical threshold. **Cambridge evidence:** retired-book structures and answer splits provide no learner facility, discrimination or version-equating data; the corpus cannot establish comparable difficulty. [gaps.md](cambridge/gaps.md)

## 2. Listening

### Format, audio and sequencing

- [ ] **MUST** provide four parts with ten scored answers each, forty total; Part 1 is an everyday two-person conversation, Part 2 an everyday monologue, Part 3 an educational/training conversation with two main speakers, Part 4 an academic monologue. **confirmed-official** [F-L]. Partner guidance permits up to four Part 3 speakers; that maximum is supported by indexed guidance [L-SPEAKERS], whose direct page returned 403. **Cambridge evidence:** all 40 C12–21 sets show four ten-question parts; P1/P4 are completion-oriented while P2/P3 vary in selection, matching, map and completion blocks. [patterns.md](cambridge/patterns.md)
- [ ] **MUST** play recordings once in exam mode and place answer-bearing information in question order. Multi-answer groups need a shared order group rather than an invented sequence between interchangeable answer slots. **confirmed-official** [F-L]; grouped key example **confirmed-by-papers** [P-L] pp.11–13. **Cambridge evidence:** local question numbers and audioscripts are aligned across the 36 PDF-backed tests; grouped answers such as M2 remain a shared unordered selection. Cambridge 21 lacks the scripts needed for this cross-check. [corpus.md](cambridge/corpus.md), [gaps.md](cambridge/gaps.md)
- [ ] **MUST** target approximately thirty minutes of Listening material, including administration/pause structure. For a paper-style simulation allow ten minutes for final transfer; for computer-style simulation use the partner-described two-minute final check. Do not add both allowances. **confirmed-official** [F-L], [GUIDE], [COMPUTER].
- [ ] **MUST** include instructions, preview and checking opportunities; do not interpret “heard once” as a ban on scheduled silence. **confirmed-official** [F-L]; scheduled pause **confirmed-by-papers** [P-L] p.31.
- [ ] **SHOULD** include intermediate preview/check pauses in Parts 1–3. **confirmed-official** indexed expert guidance [PAUSE]; exact durations are **unverified; design recommendation**. A scheduled Part 2 pause is **confirmed-by-papers** [P-L] p.31; distinguish this from [PAUSE-CONFLICT]'s overbroad wording.
- [ ] **MUST** make Part 4 a continuous academic talk without an internal question-set preview break. **confirmed-official** partner teaching guidance [L-PART4], [L-PART4-ALT], both inspected via search-index text because direct downloads failed/redirected. Exact silence/preview durations remain **unverified**; a natural speech pause is not a question-set break.
- [ ] **MUST** omit the old worked Part 1 example when modelling the post-January-2020 format. Older sample examples may be studied as item-writing evidence. **confirmed-official** partner dated guidance [CHANGE-2020]; old example **confirmed-by-papers** [P-L] pp.3–4.
- [ ] **SHOULD** use a range of authentic, intelligible accents across the paper; do not require a fixed nationality quota. **confirmed-official** accent variety [F-L]; allocation is **unverified; design recommendation**.
- [ ] **SHOULD** make Part 1 include natural personal details, names/spelling, dates, numbers or booking information when the scenario supports them. Do not require every one in every Part 1. **confirmed-by-papers** possibilities [P-L] pp.3–6; frequency/default **unverified; design recommendation**. **Cambridge evidence:** C12–21 P1 settings include enquiries, bookings, courses, clubs, rentals and services, but their answer fields differ; use scenario-relevant details rather than a fixed checklist. [corpus.md](cambridge/corpus.md)
- [ ] **MUST** render actual audio and check its runtime, speaker differentiation, pronunciation of keyed words, pacing and correspondence with the final transcript. **unverified; design recommendation**. A word-count estimate cannot verify the listening stimulus. Context: audio construct [F-L] and development review [DEV].

### Multiple choice: single and multiple answers

- [ ] **MUST** use three options A–C for the standard single-answer Listening MCQ, one defensible key, and plausible options that match the question grammatically. **confirmed-official** [F-L]; item-quality gate **unverified; design recommendation**.
- [ ] **MUST** print an explicit selection instruction for multi-answer items, such as `Choose TWO letters, A–E.` Use the actual option range and requested count; allocate that many scored question numbers and accept the specified answers in either order where the key does. **confirmed-official** [F-L]; examples [BC-L]. **Cambridge evidence:** choose-two and larger multiple-selection groups recur with different option banks and numbers of answer slots; the exact instruction is printed per group, not safely inferred from a generic example. See, e.g., C12 T1 Listening pp. 10–29 and C16 T1 Listening pp. 10–31 in [corpus.md](cambridge/corpus.md).
- [ ] **SHOULD** use semantic distractors: an initially suggested option later corrected, a rejected alternative, another person's preference or a detail that answers a different question. The final relevant statement must settle the key. **confirmed-by-papers** [P-L] pp.8–9, 26–27; authoring default **unverified; design recommendation**.
- [ ] **SHOULD** use roughly 2–5 scored answers per MCQ block as a working layout target, expanding when needed. This is not a measured typical range or an official rule. **unverified; design recommendation**; two-item sample [P-L] p.8. **Cambridge evidence:** Part 2/3 family presence across all 40 tests is 30/40 and 28/40 for single-answer MCQ, 24/40 and 18/40 for multi-answer MCQ, and 19/40 and 28/40 for matching; map/plan occurs in 12/40 Part 2 papers and none of the Part 3 papers, while completion occurs in 2/40 and 10/40. Blocks vary and can mix formats within one ten-question part. These sample counts do not establish a universal block size. [patterns.md](cambridge/patterns.md)

### Matching

- [ ] **MUST** supply numbered source items and a clearly labelled option set; specify whether options can be reused when the task permits reuse. Answers are letters, not rewritten phrases. **confirmed-official** [F-L]; reuse and differing set sizes **confirmed-by-papers** [P-L] pp.18, 22.
- [ ] **MUST** check that each item has one intended matching outcome even if the same option answers several items. **unverified; design recommendation**, operationalizing matching [F-L] and review [DEV].
- [ ] **SHOULD** use approximately 4–6 items per matching block and vary option-to-item ratios according to the task. No universal surplus or no-reuse rule applies to all matching. **unverified; design recommendation**; four/five-item examples [P-L] pp.18, 22.

### Plan, map and diagram labelling

- [ ] **MUST** provide a readable visual with distinct numbered targets and a printed option list for the verified current public format. **confirmed-official** [F-L]. A word-limited extraction variant needs separate verified specimen evidence before being treated as authentic; it was not established by the inspected plan sample [P-L] p.26. This evidence gate is **unverified; design recommendation**.
- [ ] **MUST** make the audio's starting location, orientation and route/referents recoverable from the visual. Avoid indistinguishable landmarks, overlapping labels and answers that depend on guessing image geometry. **unverified; design recommendation**, informed by entrance/landmark directions [P-L] pp.26–27. **Cambridge evidence:** route/map tasks recur in Listening P2 (e.g. Cambridge 13 Test 2 and Cambridge 20 Test 3); they use named locations or proposed changes, supporting a visual/audio consistency check rather than a universal map layout. [corpus.md](cambridge/corpus.md)
- [ ] **SHOULD** include stable anchors and plausible movement/replacement distractors; verify that former and current locations cannot both answer the target. **confirmed-by-papers** pattern [P-L] pp.26–27; default **unverified; design recommendation**.
- [ ] **SHOULD** use approximately 4–6 scored targets per block; do not copy the sample's nine labelled locations as a mandatory count. **unverified; design recommendation**; five-target sample [P-L] p.26.

### Form, note, table, flow-chart and summary completion

- [ ] **MUST** select the layout that serves the discourse: form for transactions, notes for main points, table for comparable fields, flow-chart for stages, summary for connected information. **confirmed-official** task definitions [F-L].
- [ ] **MUST** state the exact applicable cap, e.g. `NO MORE THAN TWO WORDS AND/OR A NUMBER`, and state whether responses come from the recording or a supplied list. Do not leave an unstated limit. **confirmed-official** [F-L]; printed variants [P-L] pp.3, 29–30. **Cambridge evidence:** the C12–20 book pages use several real variants, including ONE WORD ONLY, ONE WORD AND/OR A NUMBER and NO MORE THAN TWO WORDS; C21 also shows caps in Ppo text. Copy the applicable local instruction, not one default. [corpus.md](cambridge/corpus.md)
- [ ] **MUST** ensure the spoken answer fits the printed sentence/field grammatically, under the limit, without an unsupported change of word form. Avoid a preprinted unit that makes the expected full answer duplicate that unit. **unverified; design recommendation**, grounded in response rules [F-L] and key alternatives [P-L] pp.3–6, 29–33.
- [ ] **SHOULD** use 4–8 gaps per block or a justified split such as notes plus a table. Treat this as a layout default; inspected blocks have eight form gaps, six note gaps and four table gaps. **unverified; design recommendation**; observations **confirmed-by-papers** [P-L] pp.3, 29–30.

### Sentence completion and short answers

- [ ] **MUST** give a word/number cap and provide enough context for a unique answer. Sentence-completion keys must complete the sentence; short-answer keys must answer the asked detail. **confirmed-official** [F-L]; uniqueness gate **unverified; design recommendation**.
- [ ] **MUST** explicitly request two answers when one question asks for a pair; score distinct requested answers and encode whether either order is allowed. **confirmed-by-papers** [P-L] pp.11–13.
- [ ] **SHOULD** use 3–6 scored answer slots per block, with useful paraphrase between question and recording. **unverified; design recommendation**; four sentence slots and six short-answer slots [P-L] pp.11, 14.

### Objective key and score

- [ ] **MUST** award one mark per correct scored answer, maximum forty; reject answers exceeding the limit and evaluate spelling/grammatical form. **confirmed-official** [F-L], [SCORE].
- [ ] **MUST** store optional words, accepted alternatives, singular/plural alternatives and unordered groups explicitly from item-specific evidence. Do not accept arbitrary synonyms or make all singular/plural forms equivalent. **unverified; design recommendation**; real key notation **confirmed-by-papers** [P-L] pp.7, 13, 17, 33.
- [ ] **MUST** count hyphenated compounds as one word and keep contraction rules aligned with official guidance. Distinguish `AND`, `OR` and `AND/OR`; numbers and preprinted units need item-specific validation. **confirmed-official** [F-L]; implementation gate **unverified; design recommendation**.
- [ ] **MUST** accept permitted capital-letter response styles; do not impose sentence case as a hidden penalty. **confirmed-official** partner guidance [CAPS].
- [ ] **MUST** describe raw-to-band conversion as an estimate: official anchors are approximately 16→5, 23→6, 30→7 and 35→8; thresholds vary by version. Use the fully labelled illustrative table in [listening.md](listening.md), not a universal deterministic IELTS conversion. **confirmed-official** [SCORE], [SCORE-IDP].

## 3. Academic Reading

### Paper and passages

- [ ] **MUST** provide three passages, forty scored items and sixty minutes including answer transfer; total text length 2,150–2,750 words. Do not add a Reading transfer allowance. **confirmed-official** [F-R]. **Cambridge evidence:** all 40 C12–21 sets contain three passages and 40 items; every sampled test places Q1–13, Q14–26 and Q27–40 in passages 1–3 respectively. The corpus's passage lengths are only layout estimates and do not independently verify the official total-word range. [patterns.md](cambridge/patterns.md), [gaps.md](cambridge/gaps.md)
- [ ] **MUST** use accessible texts aimed at non-specialists from suitable book/journal/magazine/newspaper/online genres, including at least one detailed logical argument; provide a simple glossary where necessary for technical terminology. **confirmed-official** [F-R].
- [ ] **SHOULD** allocate roughly 700–950 words to each passage while enforcing the official total independently; use approximately 13/13/14 scored answers. Neither equal lengths nor that exact split is compulsory. **unverified; design recommendation** based on totals [F-R]. **Cambridge evidence:** the 40 papers do use a 13/13/14 question split, but observed page-layout length is not reliable enough to refine a per-passage word target. The split is a sample pattern, not an official quota. [patterns.md](cambridge/patterns.md)
- [ ] **SHOULD** build a plausible increase in overall challenge across passages using discourse complexity, inference, paraphrase and item demands. Do not require every successive item to be harder or classify a passage from vocabulary alone. **unverified; design recommendation**; older partner training [BC-DIFFICULTY], item/text distinction [IW].
- [ ] **MUST** preserve coherent paragraphs, factual consistency and the relevant argumentative structure when adapting a source. Do not create an answer merely by placing an isolated artificial sentence in the text. **unverified; design recommendation**, informed by source adaptation and item-writing research [IW], [CONSTRUCT].

### Multiple choice

- [ ] **MUST** use four options A–D for standard single-answer Reading MCQ, one defensible key and question order following text order. **confirmed-official** [F-R].
- [ ] **MUST** state the number of answers and letter range for multi-answer MCQ, allocate corresponding scored slots, and encode order-independent answer groups where appropriate. **confirmed-official** [F-R]; two-answer blocks and either-order key **confirmed-by-papers** [P-R] pp.25–26. **Cambridge evidence:** choose-two groups recur in Reading, sometimes adjacent to another choose-two block; the numbered slots and answer sequence are recorded per test in [corpus.md](cambridge/corpus.md). No fixed number of such blocks appears across C12–21. [patterns.md](cambridge/patterns.md)
- [ ] **MUST** reject options that become correct through outside knowledge or unsupported assumptions. Distractors must address the same question and fail against the passage. **unverified; design recommendation**, informed by item-writing evidence [IW].
- [ ] **SHOULD** use 3–5 single-answer items or a 2–3-answer selection group per block; these are proposed defaults, not official frequency statistics. **unverified; design recommendation**; inspected examples [P-R] pp.25, 28.

### TRUE / FALSE / NOT GIVEN; YES / NO / NOT GIVEN

- [ ] **MUST** use TFNG for identifying information and YNNG for identifying the writer's views/claims, with their distinct response labels and explanatory legends. Do not swap labels casually. **confirmed-official** [F-R]. **Cambridge evidence:** both label families appear in the 40-paper corpus and are attached to different question instructions; the keyed aggregate is tracked separately by family. [patterns.md](cambridge/patterns.md)
- [ ] **MUST** make TRUE/YES explicitly supported, FALSE/NO contradicted, and NOT GIVEN neither supported nor contradicted by the supplied passage. Absence alone must not be scored FALSE/NO. **confirmed-official** [F-R], [YNNG].
- [ ] **MUST** evaluate scope, quantity, modality, comparison, time and attribution when deciding support/contradiction. Avoid a double-barrelled statement with independently conflicting truth conditions. **unverified; design recommendation**, informed by official definitions and examples [YNNG], [P-R] pp.13–14.
- [ ] **MUST** order statements by the relevant text locations. Official Cambridge teaching material describes text order; current format descriptions do not supply every boundary case, especially absent-information anchoring. **confirmed-official** dated teaching guidance [YNNG]; practical NG anchoring **unverified; design recommendation**. **Cambridge evidence:** local question sequences include TFNG and YNNG blocks at different points in each passage, and multiple blocks can recur; retain local question order rather than assuming one binary block per paper. [corpus.md](cambridge/corpus.md)
- [ ] **SHOULD** use roughly 4–7 statements, with sufficient context to locate absent-information items. The inspected TFNG block has three; that is permitted. **unverified; design recommendation**; sample **confirmed-by-papers** [P-R] pp.13–14.
- [ ] **MUST NOT** enforce “all three labels occur in every block” as an official constraint. No sufficiently strong source establishes that quota. Varied outcomes across an item bank are a useful design aim, but never change a key to satisfy a quota. **unverified** quota; bank diversity **unverified; design recommendation**. No quota appears in the consulted specification [F-R]; observed three-label sample [P-R] pp.13–14 does not establish necessity. **Cambridge evidence:** across 265 keyed TFNG slots, T/F/NG counts are 93/93/79; across 145 YNNG slots, Y/N/NG are 48/52/45. That near-balanced aggregate does not imply balanced blocks. [patterns.md](cambridge/patterns.md)

### Matching information

- [ ] **MUST** label paragraphs/sections and ask for specific information, such as an example, reason or description. Do not confuse locating a detail with choosing the paragraph's main heading. **confirmed-official** [F-R].
- [ ] **MUST** allow paragraph letters to repeat only as permitted by the task and print the reuse instruction when relevant. Not every paragraph must be used. **confirmed-official** [F-R].
- [ ] **SHOULD** shuffle information prompts; do not promise passage order for this type. Use approximately 4–7 prompts as an authoring target. **unverified; design recommendation**; task mechanics [F-R].

### Matching headings

- [ ] **MUST** supply more headings than the paragraphs/sections to be matched; prohibit reuse of a heading. Headings must capture main ideas rather than isolated details. **confirmed-official** [F-R]. **Cambridge evidence:** heading blocks appear in multiple passage positions and in only a subset of tests; their locations and question spans vary, so do not require one in every passage. [patterns.md](cambridge/patterns.md)
- [ ] **MUST** separate any worked example from scored items and ensure its heading cannot be selected again. If only selected paragraphs are assessed, name them accurately. **confirmed-official** [F-R]; example B plus four scored paragraphs **confirmed-by-papers** [P-R] p.15.
- [ ] **SHOULD** list paragraph prompts in document order and shuffle the heading bank. Use 4–7 scored paragraphs and approximately 2–4 surplus headings as a design target, not a universal ratio. **unverified; design recommendation**; sample has eight headings [P-R] p.15.
- [ ] **MUST** review competing headings at paragraph level; reject two equally good summaries or a heading that fits only by importing outside knowledge. **unverified; design recommendation**, informed by local/global reading constructs [CONSTRUCT].

### Matching features and sentence endings

- [ ] **MUST**, for features, supply a clearly defined category bank (people, periods, groups, theories etc.) and make attribution recoverable from the passage. Print reuse permission when appropriate. **confirmed-official** [F-R]; reusable groups **confirmed-by-papers** [P-R] p.4.
- [ ] **SHOULD**, for features, avoid assuming passage order or a mandatory option surplus; use 4–6 items as a design default. **unverified; design recommendation**; mechanics [F-R].
- [ ] **MUST**, for endings, provide more endings than beginnings; arrange beginnings in passage order and make each chosen completion both grammatical and textually correct. **confirmed-official** [F-R].
- [ ] **SHOULD**, for endings, use 3–5 beginnings with approximately 2–4 surplus endings. Do not make grammar alone reveal every key. **unverified; design recommendation**; three/six sample [P-R] p.21.

### Sentence completion and short answers

- [ ] **MUST** state the word/number cap, require answers from the passage and order questions by passage information. Answers must fit without invented word-form changes. **confirmed-official** [F-R].
- [ ] **MUST** distinguish a sentence gap from a short factual question; check the sentence's grammar or question's requested entity. **confirmed-official** task definitions [F-R]; quality check **unverified; design recommendation**.
- [ ] **SHOULD** use 3–6 items per block with paraphrased stems, while ensuring a bounded answer is available verbatim. **unverified; design recommendation**; five one-word sentence gaps [P-R] p.36.

### Summary, note, table and flow-chart completion

- [ ] **MUST** choose one response mechanism: passage extraction with a printed limit, or selection from a lettered word/phrase bank. Do not ask for letters and copied passage words ambiguously. **confirmed-official** [F-R]; both summary variants **confirmed-by-papers** [P-R] pp.39, 42.
- [ ] **MUST** make extracted answers appear in the passage and fit the gap's grammar; for option-bank tasks, require the requested letter and validate each full option in context. **confirmed-official** [F-R]; item validation **unverified; design recommendation**.
- [ ] **SHOULD** anchor a block to a coherent passage section; answer locations need not follow question order for these layouts. **confirmed-official** [F-R].
- [ ] **SHOULD** use 3–6 gaps per block; a word box may contain surplus entries, but its exact size/reuse policy is task-specific. **unverified; design recommendation**; three flow-chart, five table, six notes, four word-box summary gaps [P-R] pp.7, 10, 32, 39.

### Diagram labelling

- [ ] **MUST** provide a legible diagram and distinct targets connected to described features; state the word cap and require passage-derived answers. **confirmed-official** [F-R].
- [ ] **SHOULD** localize the relevant description but do not assume answer order matches the diagram labels. Use 3–6 targets as a design default. **confirmed-official** order qualification [F-R]; default **unverified; design recommendation**, five-target sample [P-R] p.45.
- [ ] **MUST** check visual label placement and arrow endpoints at rendered size; no answer may depend on an unreadable or ambiguous drawing. **unverified; design recommendation**, operationalizing visual labelling [F-R].

### Reading keys and bands

- [ ] **MUST** mark forty answers at one mark each and enforce spelling, required grammatical form and word limits. **confirmed-official** [F-R], [SCORE].
- [ ] **MUST** use item-specific alternatives, optional words and unordered groups; count hyphenated compounds as one word and allow permitted capital-letter responses. Do not apply blanket stemming or synonym acceptance. **confirmed-official** limits/case [F-R], [CAPS]; key notation **confirmed-by-papers** [P-R] pp.26, 46; data model **unverified; design recommendation**.
- [ ] **MUST** label band output approximate. Official Academic anchors are approximately 15→5, 23→6, 30→7, 35→8, with test-version variation. The fuller IDP table uses 16–19 for band 5, so disclose that discrepancy rather than silently universalize it. Use the annotated table in [reading.md](reading.md). **confirmed-official** [SCORE], [SCORE-IDP].

## 4. Academic Writing

### Format and assessment

- [ ] **MUST** provide two tasks in sixty minutes: Task 1 minimum 150 words and Task 2 minimum 250 words. Recommend approximately twenty/forty minutes; do not impose separate locked official task timers. **confirmed-official** [F-W].
- [ ] **MUST** request connected text in appropriate academic/semi-formal register, not bullet-note answers. **confirmed-official** [F-W].
- [ ] **MUST** assess Task 1 with Task Achievement, Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy; Task 2 substitutes Task Response. Criteria are equally weighted within a task; Task 2 contributes twice Task 1. **confirmed-official** [F-W], [SCORE], [W-CRITERIA].
- [ ] **MUST** use the public Writing descriptors updated May 2023. Provide evidence for each criterion; do not award bands from word count, error count or an essay template alone. **confirmed-official** rubric [W-BANDS]; evidence policy **unverified; design recommendation**.
- [ ] **MUST NOT** claim an official fixed one-band underlength penalty or an undisclosed exact component-rounding algorithm. Give an estimated assessment and identify uncertainty. **unverified** fixed penalty/rounding; published principles [F-W], [SCORE].

### Task 1: visual report

- [ ] **MUST** provide actual visual information and a prompt requesting a summary of main features and relevant comparisons. The answer must be possible from the visual, without outside facts or opinions. **confirmed-official** [F-W]; prompt examples **confirmed-by-papers** [P-W] pp.3–5.
- [ ] **MUST** validate titles, units, scales, dates, category labels, legend, totals and rounding; remove contradictory data and unintended graph distortions. **unverified; design recommendation**, operationalizing accurate supplied-information reporting [W-CRITERIA].
- [ ] **SHOULD** rotate among line/bar/pie charts, tables, natural/manufacturing processes, maps/site changes and suitable combinations or diagrams. These are supported preparation categories, not a compulsory per-test distribution. **confirmed-official** partner guidance [W-VISUAL], [W-TYPES]; rotation **unverified; design recommendation**. **Cambridge evidence:** the 40 Task 1 prompts group into 22 numerical charts/tables, 10 maps/plans and 8 processes; combined visual families occur, and C21's four images are unavailable. The counts describe this sample only. [patterns.md](cambridge/patterns.md), [gaps.md](cambridge/gaps.md)
- [ ] **SHOULD** use manageable density: about 2–4 line series with 4–8 time points; 2–6 bar categories with useful comparison groups; 2–3 pie charts with 3–6 categories; 3–6 table rows with 2–5 columns; 5–9 process stages; or 2–3 map states with several salient changes. These are **unverified; design recommendations**, not frequencies measured from Cambridge books. See [writing.md](writing.md) for exceptions and sample evidence [P-W]. **Cambridge evidence:** the corpus shows single and combined visuals with differing dates, categories and plan states, but it does not justify a universal density range. Check the source visual in the relevant test row before using any specific data shape. [corpus.md](cambridge/corpus.md)
- [ ] **MUST** ensure a report has meaningful key features: dominant trends and comparisons for numerical data, overall stages/branches for processes, major changes for maps. Do not design a visual whose only possible response is an unstructured list. **confirmed-official** achievement construct [W-CRITERIA], [W-BANDS]; stimulus gate **unverified; design recommendation**.
- [ ] **MUST** assess overview quality through the descriptors: a clear overview is a band-7 Task Achievement feature; band 6 involves an attempted relevant overview. Do not require exactly two sentences, forbid every number in an overview or invent causal explanations absent from the visual. **confirmed-official** descriptor distinction [W-BANDS]; template quotas **unverified**.
- [ ] **SHOULD** keep the two tasks independently answerable even when themed alike; Task 2 must not require remembered figures from Task 1. **unverified; design recommendation**, informed by distinct task demands [F-W].

### Task 2: prompt families and obligations

- [ ] **MUST** state a clear proposition/situation and explicit response demand, using accessible societal/general-interest topics; avoid specialist knowledge as a prerequisite. **confirmed-official** [F-W]; clarity gate **unverified; design recommendation**.
- [ ] **MUST** extract the actual response obligations before drafting the rubric. Teaching categories overlap; “five families” is not a closed official grammar. **confirmed-official** partner guidance [W-FAMILIES], [W-PROMPTS]; obligation model **unverified; design recommendation**. **Cambridge evidence:** dominant coding of the 40 C12–21 prompts yields 12 both-views/position, 9 direct-opinion, 7 comparative advantage/disadvantage, 7 positive/negative evaluation and 5 causes/problems/two-part prompts. Hybrids can be coded differently; preserve the prompt's actual demands. [patterns.md](cambridge/patterns.md)
- [ ] **MUST**, for opinion prompts such as `To what extent do you agree or disagree?`, require a supported position on the stated proposition and allow qualified agreement. **confirmed-by-papers** wording [P-W] p.6; response construct [W-BANDS]. **Cambridge evidence:** nine prompts in the dominant-family coding ask for direct agreement/disagreement or a supported opinion, including Cambridge 13 Test 1 p. 29; exact topic and obligation are paraphrased in [corpus.md](cambridge/corpus.md). [patterns.md](cambridge/patterns.md)
- [ ] **MUST**, for discussion-plus-opinion prompts, include both views and the opinion obligation; assess all three. Use the conventional `Discuss both views and give your own opinion.` pattern when applicable. **confirmed-official** partner guidance [W-PROMPTS], [W-FAMILIES]. **Cambridge evidence:** twelve of the 40 coded prompts require both sides/views and a position; examples and test/page ranges are in the Task 2 table and ledger. [patterns.md](cambridge/patterns.md)
- [ ] **MUST**, for causes/problems/solutions, assess exactly what is asked: causes differ from effects or problems; solutions differ from mere evaluation. Do not silently add a cause question to a problems-and-solutions prompt. **confirmed-official** partner guidance [W-PROBLEMS]; precision gate **unverified; design recommendation**. **Cambridge evidence:** five prompts are coded as cause/problem/solution or another explicit two-part response, with additional hybrids assigned by their dominant obligation; preserve the exact prompt demand rather than its broad family label. [patterns.md](cambridge/patterns.md)
- [ ] **MUST**, for advantages/disadvantages enumeration, require both sides; for `Do the advantages outweigh the disadvantages?`, additionally require comparative judgment. **confirmed-official** partner guidance [W-PROMPTS], [W-OUTWEIGH]; specimen [P-W] p.7. **Cambridge evidence:** seven prompts are coded to this comparative family; some require explicit outweigh judgment while others request both advantages and disadvantages. The ledger's paraphrase preserves the distinction. [patterns.md](cambridge/patterns.md), [corpus.md](cambridge/corpus.md)
- [ ] **MUST**, for `Is this a positive or negative development?`, assess evaluation of the specified development rather than only listing advantages. **confirmed-official** partner prompt pattern [W-EVALUATE]; assessment construct [W-BANDS]. **Cambridge evidence:** seven prompts are coded as positive/negative-development evaluation; three are hybrids that also ask for causes/how a trend arose, so both obligations must be retained. [patterns.md](cambridge/patterns.md)
- [ ] **MUST**, for two-part or hybrid prompts, preserve each question's scope and assess every requested part. Two questions are not automatically causes-and-solutions. **confirmed-official** partner guidance [W-PROMPTS]. **Cambridge evidence:** five prompts in the exclusive dominant-family coding are two-part/cause/problem tasks, while other positive/negative prompts also contain a causal demand; see the test-level paraphrases in [corpus.md](cambridge/corpus.md).
- [ ] **SHOULD** use a concise topic setup plus one or two explicit demands and the conventional support-with-reasons/examples instruction. Avoid contradictions, obscure premises and unnecessary nested demands. **confirmed-by-papers** compact prompts [P-W] pp.6–7; authoring default **unverified; design recommendation**.
- [ ] **MUST** allow several defensible positions and examples; do not create a factual answer key for an opinion essay or require a memorized four-paragraph template. **confirmed-official** assessment construct [W-BANDS], [W-CRITERIA]; authoring gate **unverified; design recommendation**.

## 5. Speaking

### Format and examiner-facing materials

- [ ] **MUST** provide a recorded interview simulation with three parts lasting approximately 11–14 minutes: Part 1 4–5 minutes, Part 2 3–4 including preparation/follow-up, Part 3 4–5. **confirmed-official** [F-S]. **Cambridge evidence:** the 36 local Speaking samples reproduce the Part 1 familiar-topic, Part 2 cue-card, Part 3 broader-discussion progression; C21 has no supplied Speaking section. The prompts do not provide candidate response timing data beyond the printed card directions. [patterns.md](cambridge/patterns.md), [gaps.md](cambridge/gaps.md)
- [ ] **MUST** keep candidate materials and examiner instructions separate. Timed exam mode should elicit speech without coaching, model answers or corrective feedback during the interview. **unverified; design recommendation**, informed by interview samples [P-S] and script research [SCRIPT].
- [ ] **SHOULD** use standardized openings and topic frames, with controlled follow-ups rather than unrestricted chatbot conversation. The amount of examiner flexibility differs by part. **confirmed-by-papers** [P-S]; historical evidence [SCRIPT]; authoring policy **unverified; design recommendation**.
- [ ] **MUST NOT** claim that historical examiner permissions in the 2021 research report are the complete current confidential script. Separate old repeat/rephrase rules from present practice design. **examiner-claim / historical documentary evidence** [SCRIPT]; current-policy completeness **unverified**.

### Part 1: familiar topics

- [ ] **MUST** include introduction/identity checking followed by questions about familiar topics such as home, work, studies and interests. Questions should invite personal answers without technical expertise. **confirmed-official** [F-S]. **Cambridge evidence:** C12–20 Part 1 samples cycle through everyday topics such as health, technology, places, food, work/study and hobbies; there is no single topic schedule across the 36 samples. [corpus.md](cambridge/corpus.md)
- [ ] **SHOULD** prepare a work/study or home frame plus two other familiar frames, with about 3–4 available prompts each; use the time limit to decide how many to ask. This is not a public fixed question count. **unverified; design recommendation**; historical framing [SCRIPT], sample topic sets [P-S] p.3. **Cambridge evidence:** printed Part 1 frames vary from topic to topic and list several short questions; the 36 samples do not establish a fixed count or mandatory topic sequence. [corpus.md](cambridge/corpus.md)
- [ ] **MUST** adapt work/study assumptions to the candidate and avoid repeatedly asking for information already supplied. **unverified; design recommendation**, informed by historical examiner guidance [SCRIPT].
- [ ] **SHOULD** mix description, routine, preference and brief reasons in natural language; avoid an artificial grammar-test sequence. **confirmed-by-papers** prompt diversity [P-S] p.3; default **unverified; design recommendation**.

### Part 2: individual long turn

- [ ] **MUST** supply one cue card with a clear main topic, supporting prompts and an explanation demand; allow one minute of preparation with notes and a 1–2 minute uninterrupted long turn, followed by one or two brief related questions. **confirmed-official** timing/supporting points [F-S]; layout pattern [P-S]. **Cambridge evidence:** all 36 PDF-backed Speaking samples include one Part 2 cue-card topic with supporting points; the Part 3 themes are related but do not demand the same personal example. [patterns.md](cambridge/patterns.md)
- [ ] **SHOULD** use the familiar `Describe ...`, `You should say:`, three supporting prompts and `and explain ...` structure. Four content demands are a useful default; exactly four visible bullet glyphs is not established as a universal rule. **unverified; design recommendation** grounded in specimen conventions [P-S]; inspected PDF has a layout/extraction defect discussed in [speaking.md](speaking.md). **Cambridge evidence:** all 36 local cue cards have one main topic, supporting points and an explanation demand; wording and visible layout vary, so preserve legibility rather than count bullet glyphs. [patterns.md](cambridge/patterns.md), [corpus.md](cambridge/corpus.md)
- [ ] **MUST** render and inspect the cue card; all supporting points and the explanation line must be visibly legible and kept separate from timing/examiner notes. **unverified; design recommendation**; do not reproduce the defect in [P-S] p.5.
- [ ] **MUST** let the candidate choose a plausible personal example without proving specialist facts; avoid forcing one culturally narrow life experience. **unverified; design recommendation**, grounded in personal long-turn construct [F-S].
- [ ] **MUST NOT** score one mark per bullet or penalize a planned time-limit interruption as a separate scoring event. Use the whole-test analytic criteria. **confirmed-official** [F-S], [S-CRITERIA].

### Part 3: discussion

- [ ] **MUST** connect discussion to Part 2 while moving to more general/abstract matters and eliciting explanation, analysis, discussion and speculation. **confirmed-official** [F-S]. **Cambridge evidence:** the 36 samples move from personal Part 2 topics to wider themes such as cities, work, culture, technology and policy; the ledger records the individual links. [corpus.md](cambridge/corpus.md), [patterns.md](cambridge/patterns.md)
- [ ] **SHOULD** prepare two related subthemes with about 4–6 main questions total plus optional probes; use responses and the 4–5 minute allowance to select turns. This is not a fixed official question quota. **unverified; design recommendation**; two-subtheme sample [P-S] pp.6–7.
- [ ] **SHOULD** progress from groups/social patterns to causes, comparisons, consequences, policy or future possibilities when coherent. No public rule requires every question to follow that exact ladder. **unverified; design recommendation**; abstract construct [F-S] and samples [P-S].
- [ ] **MUST** keep follow-ups relevant and neutral; elicit depth without teaching the answer, endorsing a viewpoint or turning the discussion into a specialist knowledge quiz. **unverified; design recommendation**, informed by construct [F-S] and historical script research [SCRIPT].

### Speaking assessment

- [ ] **MUST** assess Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, and Pronunciation with equal weighting across performance throughout the test. There is no separate Task Achievement criterion or public Part 2 double weighting. **confirmed-official** [F-S], [SCORE], [S-CRITERIA].
- [ ] **MUST** consult the current linked public Speaking descriptors, rather than assume they carry the Writing document's May-2023 revision label. The inspected Speaking PDF does not verify that date. **confirmed-official** current descriptor content [S-BANDS]; shared-date claim **unverified**.
- [ ] **MUST** retain audio for pronunciation and fluency assessment. A text-only response cannot support a complete Speaking band estimate; label any partial language feedback accordingly. **unverified; design recommendation**, grounded in criteria [S-CRITERIA], [S-BANDS].
- [ ] **MUST NOT** impose a British-accent requirement, idiom quota, answer-length formula or memorized vocabulary checklist as a band rule. Evaluate intelligibility, appropriate language and sustained performance. **confirmed-official** descriptor construct [S-BANDS]; quotas **unverified**.

## 6. Release record

- [ ] **MUST** attach a final validation report listing structural checks, independently solved keys, reviewed visuals/audio, unresolved uncertainties and calibration status. **unverified; design recommendation**, informed by review/pretesting [DEV].
- [ ] **MUST** block release of a complete simulation if stimuli are missing, timings/counts fail, keys remain ambiguous, labels cannot resolve, or a required cue-card line is unreadable. **unverified; design recommendation**, informed by task packages [HUB] and review [DEV].
- [ ] **SHOULD** retain versioned source provenance, answer evidence, review changes and learner-pretest results so subsequent revisions can be checked against the same specification. **unverified; design recommendation**, informed by development/editing/pretesting workflow [DEV], [IW].
- [ ] **MUST** distinguish “format checked”, “expert reviewed” and “learner calibrated” in product claims. Completion of this checklist alone demonstrates neither official IELTS approval nor established equivalent difficulty. **unverified; design recommendation**, grounded in public test-development processes [DEV].

<!-- Source link definitions -->
[DEV]: https://www.ielts.org/organisations/ielts-for-organisations/how-we-develop-the-test
[IW]: https://ielts.org/cdn/Research/investigation-of-process-of-writing-academic-reading-test-items-for-ielts-green-et-al-2010.pdf
[F-L]: https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-listening
[F-R]: https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading
[F-W]: https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-writing
[F-S]: https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-speaking
[HUB]: https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test
[P-L]: https://cdn.ielts.org/Sample-tests/ielts-listening-sample-tasks-2023.pdf
[P-R]: https://ielts.org/cdn/Sample-tests/ielts-academic-reading-sample-tasks-2023.pdf
[P-W]: https://ielts.org/cdn/Sample-tests/ielts-academic-writing-sample-tasks-2023.pdf
[P-S]: https://ielts.org/cdn/ielts-downloadable-assets/ielts-sample-tests/ielts-speaking-sample-tasks-2023.pdf
[L-SPEAKERS]: https://ielts.idp.com/prepare/article-free-listening-practice-questions/
[GUIDE]: https://ielts.org/cdn/ielts-guides/ielts-guide-for-test-takers.pdf
[COMPUTER]: https://ielts.idp.com/bangladesh/about/which-test-do-i-take/ielts-on-computer/listening-preparation
[PAUSE]: https://ielts.idp.com/ielts-community/results-topics/listening?page=6
[PAUSE-CONFLICT]: https://ielts.idp.com/prepare/article-ielts-listening-test-myths-debunk
[L-PART4]: https://takeielts.britishcouncil.org/sites/default/files/listening_part_4_note_taking_in_lectures.pdf
[L-PART4-ALT]: https://takeielts.britishcouncil.org/sites/default/files/listening_part_4_keeping_up_with_the_speaker.pdf
[CHANGE-2020]: https://ielts.idp.com/vietnam/about/news-and-articles/article-ielts-test-format-explained/
[BC-L]: https://takeielts.britishcouncil.org/prepare/ielts-free-practice-mock-tests/academic/listening
[SCORE]: https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail
[CAPS]: https://takeielts.britishcouncil.org/blog/capital-letters-in-english-common-errors-and-how-to-fix-them
[SCORE-IDP]: https://ielts.idp.com/vietnam/results/scores
[BC-DIFFICULTY]: https://www.britishcouncil.org.ar/sites/default/files/how_to_prepare_students_for_ielts_handout_0.pdf
[CONSTRUCT]: https://ielts.org/cdn/Research/construct-validity-in-the-ielts-academic-reading-test-moore-et-al-2010.pdf
[YNNG]: https://www.cambridgeenglish.org/images/ielts-academic-reading-task-type-2-identifying-information-and-task-type-3-identifying-writers-views-and-claims-activity.pdf
[W-CRITERIA]: https://ielts.org/cdn/ielts-downloadable-assets/ielts-guidance-and-support/ielts-guides/ielts-writing-key-assessment-criteria.pdf
[W-BANDS]: https://ielts.org/cdn/ielts-guides/ielts-writing-band-descriptors.pdf
[W-VISUAL]: https://ielts.idp.com/prepare/article-ielts-academic-writing-task-1-how-to-analyse-graphs
[W-TYPES]: https://ielts.idp.com/prepare/article-ielts-writing-task-1-question-types
[W-FAMILIES]: https://ielts.idp.com/vietnam/about/news-and-articles/article-ielts-writing-task-2/en-gb
[W-PROMPTS]: https://ielts.org/news-and-insights/ielts-writing-task-2-how-to-understand-ielts-question-prompts
[W-PROBLEMS]: https://ielts.idp.com/vietnam/about/news-and-articles/article-ielts-writing-task-2-problem-and-solution/en-gb
[W-OUTWEIGH]: https://ielts.idp.com/vietnam/about/news-and-articles/article-ielts-writing-task-2-advantages-disadvantages-essay
[W-EVALUATE]: https://ielts.idp.com/vietnam/about/news-and-articles/article-positive-or-negative/en-gb
[SCRIPT]: https://ielts.org/cdn/ielts-research-reports/towards-new-avenues-for-the-ielts-speaking-test-inoue-et-al-2021.pdf
[S-CRITERIA]: https://ielts.org/cdn/ielts-downloadable-assets/ielts-guidance-and-support/ielts-guides/ielts-speaking-key-assessment-criteria.pdf
[S-BANDS]: https://ielts.org/cdn/ielts-guides/ielts-speaking-band-descriptors.pdf
