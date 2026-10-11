# Research brief: high-fidelity IELTS Academic Writing assessment

## Goal
We will build a Codex skill that grades IELTS Academic Writing (Task 1 and Task 2) the way a trained examiner does, and a generator that writes prompts indistinguishable from real ones. There are many low-quality "band 9 samples" and corrections online. Filter that noise out and keep only what is accurate.

## What to find
1. The public Writing band descriptors (revised May 2023) for Task 1 and Task 2, all four criteria: Task Achievement / Task Response, Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy. Quote them exactly, band 0-9, with the official source URL.
2. Rules examiners apply that sit on top of the descriptors:
   - How the overall Writing band is computed (Task 2 weighting, criterion averaging, rounding).
   - Under-length penalties (150 / 250 words), how words are counted, what counts as memorised or off-topic text, copying the prompt, missing overview in Task 1, unclear position in Task 2, bullet points, titles.
   - Band "ceilings" (e.g. no clear overview limits TA, no position limits TR), and what separates 6 from 7, 7 from 8.
3. Official examiner-marked scripts: Cambridge IELTS books (1-19+) sample answers with examiner comments, ielts.org / British Council / IDP official sample scripts with band scores. Collect as many official marked scripts as you can locate (URLs plus band, task type, and the examiner's commentary). These are our calibration set.
4. Prompt construction: Task 1 visual types (line, bar, pie, table, process, map, mixed) with data density norms; Task 2 question families and exact wording patterns, drawn from Cambridge books and official samples.
5. Research literature: IELTS Research Reports and academic papers on Writing rating reliability, rater behaviour, and automated scoring of IELTS writing, including what LLM graders get wrong (score compression around 6-7, over-rewarding vocabulary, etc.).

## Source quality rules
- Trust order: official IELTS partners (ielts.org, Cambridge, British Council, IDP), Cambridge IELTS books, IELTS Research Reports and peer-reviewed papers, identifiable ex-examiners. Treat SEO tip blogs and unattributed band-9 samples as untrusted unless they match an official source.
- For every rule: rule, confidence (official / examiner-claim / unverified), source URL. Flag popular online myths (e.g. "you must use complex vocabulary for 7+", "never use I").

## Deliverables (write into research/ielts/writing-assessment/)
- `descriptors.md`: verbatim public descriptors, both tasks.
- `examiner-rules.md`: scoring mechanics, penalties, ceilings, band boundaries.
- `calibration-set.md`: list of official marked scripts with URLs, bands, commentary summary.
- `grader-skill-draft.md`: a draft grading procedure for an LLM, step by step, with output format (band per criterion, evidence quotes, corrections), including known LLM grader failure modes and how to guard against them.
- `sources.md`: sources with trust notes.

Do not write app code. Do not edit anything outside research/ielts/writing-assessment/. Another agent is writing research/ielts/*.md at the same time; do not touch those files.
