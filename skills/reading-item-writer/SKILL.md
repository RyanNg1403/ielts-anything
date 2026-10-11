---
name: reading-item-writer
description: Write IELTS Academic Reading question blocks (TFNG, YNNG, MCQ, matching, completion) in Cambridge 12-21 style for a written passage, with exact evidence quotes and explanations. Use after reading-passage-writer.
---

# Reading item writer

## Which question families go where (Cambridge 12-21, 40 tests)

Counts are blocks (tests that had one). Use them to choose a realistic mix, not as quotas.

| Family (`family` value) | Passage 1 (Q1-13) | Passage 2 (Q14-26) | Passage 3 (Q27-40) |
|---|---|---|---|
| TRUE/FALSE/NOT GIVEN (`tfng`) | 34 | 5 | 6 |
| YES/NO/NOT GIVEN (`ynng`) | 1 | 6 | 25 |
| Note completion (`note_completion`) | 25 | 3 | 1 |
| Table completion (`table_completion`) | 9 | 0 | 1 |
| Summary completion (`summary_completion` / `summary_bank`) | 4 | 23 | 27 |
| Flow-chart completion (`flowchart_completion`) | 1 | 0 | 0 |
| Sentence completion (`sentence_completion`) | 2 | 10 | 3 |
| Short answer (`short_answer`) | 1 | 0 | 0 |
| Sentence endings (`sentence_endings`) | 0 | 1 | 8 |
| Matching information (`matching_information`) | 5 | 26 | 8 |
| Matching features (`matching_features`) | 3 | 14 | 9 |
| Matching headings (`matching_headings`) | 1 | 6 | 5 |
| MCQ single (`mcq`) | 0 | 6 | 28 |
| MCQ choose two (`mcq_multi`) | 4 | 24 | 0 |

Typical shapes:
- **Passage 1:** TFNG (6-8 items) + note or table completion (5-7 gaps). Example: Q1-7 TFNG, Q8-13 notes.
- **Passage 2:** matching information (4-6) + summary or sentence completion, or two choose-two blocks. Example: Q14-18 matching information, Q19-22 sentence completion, Q23-24 and Q25-26 choose two.
- **Passage 3:** MCQ (4-5) + summary completion or sentence endings + YNNG (4-6). Example: Q27-30 MCQ, Q31-35 summary (word bank), Q36-40 YNNG.

2-4 blocks per passage. Each block 3-8 items.

## Rules per family

**TFNG / YNNG.** TFNG tests facts; YNNG tests the writer's claims. TRUE/YES: the passage supports the paraphrased statement. FALSE/NO: the passage directly contradicts it. NOT GIVEN: the passage neither confirms nor contradicts it, but it is about something the passage discusses. Check scope, quantity, time, comparison and certainty words ("all/some", "first", "more than", "always", "may"): these are what make FALSE/NOT GIVEN. Statements follow passage order. Never test two ideas in one statement. Across Cambridge keys the split is about one-third each (TFNG 93/93/79, YNNG 48/52/45), but do not force every label into every block. Never let a key depend on outside knowledge. NOT GIVEN items have an empty evidence string; TRUE/FALSE/YES/NO need a quote.

**MCQ (single).** Four options A-D, one correct. Distractors use words from the passage but fail the question: wrong scope, wrong actor, true but irrelevant, the opposite. Questions follow passage order. Options are parallel in grammar and similar in length.

**MCQ choose two (`mcq_multi`).** Five options A-E; `qs` holds two consecutive numbers; `answers` two letters; one evidence quote per correct letter.

**Matching information.** Prompts point to a specific detail ("a reference to the cost of ...", "an example of ...", "a comparison between ..."), not a main idea. Prompts are in random order. Set `allowReuse` true if a paragraph is the answer twice. The evidence quote must come from the keyed paragraph.

**Matching headings.** Heading bank has 2-4 more headings than the paragraphs tested; each heading summarises a whole paragraph's main idea. Write distractor headings that pick up a detail of a paragraph but not its main point. List paragraphs in order.

**Matching features.** A bank of 3-6 people/organisations/periods (A, B, C...). Each prompt paraphrases a claim or finding attributed to one of them. Prompts are not in passage order.

**Sentence endings.** 3-5 beginnings in passage order, 2-3 more endings than beginnings. Wrong endings should be grammatical, so grammar alone does not reveal the key.

**Completion (sentence, summary, notes, table, flow-chart, short answer).** Answers are copied exactly from the passage, within the word limit. Choose the tightest realistic limit: ONE WORD ONLY is most common in recent books; TWO WORDS for noun phrases; add a number only if an answer is a number. The surrounding stem paraphrases the passage; the answer word itself does not change form (no singular/plural or tense change). Notes and tables use note style ("Main cause: {{9}}"); summaries are connected prose. Gaps are written `{{q}}` (sentence completion uses `____`). List accepted alternatives where Cambridge would (e.g. a hyphenated form, or the word with and without an optional adjective).

**Summary with word bank (`summary_bank`).** 3-4 more options than gaps, mixing correct answers with plausible nouns from the same topic. The answer is the letter.

## Evidence and explanations

- `evidence` is copied character for character from one paragraph (10-40 words). The app rejects any quote it cannot find.
- `explanation` is for the learner after marking: one or two plain sentences saying where the answer is and why the tempting alternative is wrong ("The passage says the plan was approved 'within weeks', so 'immediately' overstates it - FALSE").

## Submit

Call `reading_publish_passage` once per passage (numbers continue across passages). Fix every error it returns and resubmit. After all passages are accepted, load `reading-key-auditor` and call `reading_finalize`.
