# Research brief: how IELTS Academic tests are constructed

## Goal
We are building an app that generates IELTS-style practice tests (all 4 skills) on any topic a learner chooses, e.g. a 3-passage Reading test about AI labs. The generated tests must be indistinguishable in structure and difficulty from real IELTS papers. Your job is to find the construction rules an item writer follows, not test-taker tips.

## What to find, per skill (Listening, Reading, Writing, Speaking)
1. Official format: parts/sections, timing, number of items, word counts, band descriptors.
2. Every question type (e.g. TFNG, YNNG, matching headings, matching features, sentence completion, summary completion with/without word box, MCQ single/multi, diagram/flow-chart/table/note completion, map/plan labelling, short answer). For each: instructions wording as printed on the paper, word-limit phrasing ("NO MORE THAN TWO WORDS AND/OR A NUMBER"), typical item counts per block, and the rules for how items are written.
3. Unwritten / structural rules that hold across real papers. Examples of the kind we want:
   - TFNG/YNNG blocks have enough items that every answer option appears at least once.
   - Answers follow passage order for some types but not others (which ones exactly?).
   - Matching headings: more headings than paragraphs; example paragraph handling.
   - Completion answers are taken verbatim from the text; distractors and paraphrase patterns.
   - Listening: answers appear in order; spelled names/numbers in Part 1; distractor patterns (speaker corrects themselves); map task conventions; accent mix; Part 4 is a monologue lecture with no break.
   - Reading: passage difficulty increases across passages; passage sources (journals, magazines, books); one passage usually argumentative; word count per passage.
   - Writing Task 1 Academic: chart types used (line, bar, pie, table, process, map, mixed), data density, number of time points/categories, what a "key features" overview means.
   - Writing Task 2: question families (opinion, discussion, problem-solution, advantages-disadvantages, two-part) and the exact prompt wording patterns.
   - Speaking: Part 1 topic frames, Part 2 cue card layout (4 bullet lines, "and explain..."), Part 3 abstraction progression, examiner script rules.
4. Answer key and scoring conventions: raw score to band conversion tables (Academic Reading, Listening), what counts as correct (spelling, plurals, hyphenation, numbers), Writing/Speaking band descriptors (public versions, May 2023 revision).

## Source quality rules (important)
- Prefer, in order: official (ielts.org, Cambridge English / Cambridge University Press & Assessment, British Council, IDP) materials, IELTS item-writer guidelines or interviews, Cambridge IELTS practice books (1-19+) analysis, academic papers on IELTS test construction and validation (e.g. IELTS Research Reports), experienced examiners (e.g. Simon/ielts-simon, ex-examiner blogs).
- Treat generic tip blogs and SEO content as low-trust. Only include a rule from them if you can confirm it against real Cambridge papers or an official source.
- For each rule, give: the rule, confidence (confirmed-official / confirmed-by-papers / examiner-claim / unverified), and the source URL(s).
- Flag rules that are commonly repeated online but are false or only "usually" true.

## Deliverables (write into research/ielts/)
- `listening.md`, `reading.md`, `writing.md`, `speaking.md`: one file per skill, structured as above.
- `generation-rules.md`: a single checklist an LLM test generator must satisfy, written as hard constraints (MUST) and soft constraints (SHOULD), grouped by skill and question type. This is the most important file; we will turn it into Codex skills.
- `sources.md`: every source used, with a one-line trust note.

Do not write app code. Do not edit anything outside research/ielts/.
