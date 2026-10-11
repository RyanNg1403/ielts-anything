# Coverage gaps and limits

Checked 11 October 2026. The corpus contains all four Academic tests from Cambridge 12–20 using local PDFs/OCR, plus four Cambridge 21 question sets from Ppo. Books 1–11 are excluded from the statistics and format profile. See [corpus.md](corpus.md) for the per-test page map and evidence source for each row.

## Source and coverage boundaries

- **Cambridge 12–20:** local PDFs/OCR are primary. The complete Cambridge 13, 15 and 20 Academic PDFs and matching OCR sidecars replace earlier partial PDFs or scraped text. Ppo is a cross-check for question sequences and keys. The supplied C20 PDF/OCR set has no readable answer-key section, so C20 status ratios use its Ppo keys as a documented exception.
- **Cambridge 21:** Ppo is the only supplied source. Its Reading pages provide text, questions and keys; Listening pages provide questions and keys but not audio or audioscripts; Writing pages provide prompt text but omit the Task 1 images; no Speaking sample was supplied. Thus C21 visual family labels rely on page captions and cannot verify visual data shape.
- **Older books:** Cambridge 1–11 are outside this profile. None of their block counts, wording, instructions or answer ratios contributes to the patterns or generation rules. They may be used only in separate historical comparison work.
- **Cambridge 20 pagination:** resource-bank inserts and OCR footers conflict with the contents-page pagination. Test spans are cited by PDF scan page, not by unreliable printed page numbers.
- **Cambridge 12 OCR:** its sidecar labels the four Academic papers Tests 5–8; the ledger maps them to actual Tests 1–4 using the printed contents and PDF. When OCR question labels conflict with the printed PDF, the PDF controls.

## Incomplete or uncertain observations

- Cambridge 13 Test 1's OCR sidecar omits Reading Q8, but the complete PDF key shows FALSE on printed p. 119. The status is included in the aggregate; the key is not inferred from the ratio. See the Test 1 row in [corpus.md](corpus.md).
- Cambridge 17's Reading OCR does not reliably recover every passage title in Tests 2–4; some Cambridge 14, 15, 16 and 18 titles are also marked unreadable. Topic summaries are retained only where supported by the text. Cambridge 21 titles and genres were not reliably captured in Ppo.
- Reading passage lengths are estimates from page layout (approximately 650–1,000 words), not counts of the extracted text. OCR artifacts, image text and page boundaries make exact automated counts unreliable.
- The corpus records contexts, task families, instructions and ranges when legible, but it does not contain a fully normalized transcription of all 160 Listening parts. Exact per-block answer counts/instruction wording are not equally recoverable from every OCR page. [patterns.md](patterns.md) reports broad Part 2/3 family presence across all 40 tests; those are not block or answer-slot counts.
- The complete Cambridge 13 and 15 PDFs resolve older scraped-text conflicts or omissions in C13 Test 3 Part 2 and C15 Tests 1 and 3 Part 3; the complete Cambridge 20 PDF supplies all four Listening papers. Local PDFs also fill the Ppo Listening omissions for Cambridge 16 Tests 1–3 and Cambridge 19 Test 4 Part 3. Cambridge 21 remains Ppo-only; its audio/transcript is unavailable, so script-level distractor or speaker analysis excludes those four tests.
- Individual distractor mechanisms are visible in specific item/script pairs, but no systematic annotation has been completed for every item. The report describes examples qualitatively and makes no rate claim.
- Speaker roles are identifiable in many scripts, but speaker gender is not consistently labelled and accent is not systematically documented. Audio exists for Cambridge 12–20, but this pass did not classify accents by listening; no demographic/accent inference is made from names or OCR.
- Speaking prompts are summarized by Part 1 topics, Part 2 cue-card topic, and Part 3 themes. Full prompt wording and examiner/candidate recordings are not reproduced. Cambridge 17 Test 4, previously unclear in OCR, is now recovered from its PDF/OCR at printed pp. 94–95.
- Writing Task 2 prompt families are paraphrased, not transcribed. The prompt's test/page range in [corpus.md](corpus.md) locates the source; the compact excerpts in [register.md](register.md) are phrase-level only. This preserves the response obligation without copying 40 prompt blocks.
- Cambridge 21's missing Listening audio/transcripts and Writing visuals prevent the same detail level as the 36 PDF-backed Cambridge 12–20 tests. Ppo is an unofficial scraped source; its page IDs are retained for traceability and its results are not treated as Cambridge-verified primary data.

## Copyright and redistribution

The Cambridge books and audio remain in the user's private `corpus/cambridge/` tree. They are not copied into the deliverables, committed, uploaded or redistributed. The research files contain bibliographic/source locators, task labels, paraphrases and aggregate counts. They do not include passage bodies, full question/answer blocks, full prompts, sample essays or audioscripts; the few register examples are short phrases only. Ppo text follows the same restriction.

## What would close the remaining gaps

The main useful additions would be a Cambridge 21 licensed PDF/audio pack with its Speaking section; a visual check of all C21 Task 1 images; clearer page scans/OCR for titles and exact Listening block instructions; and a manual acoustic review of Cambridge 12–20 accents/speaker labels. A full distractor annotation or exact passage word-count study would also require page/audio-level coding and independent quality review. Public Cambridge descriptions support the book's authentic-paper purpose, while IELTS' public development page describes editing, pretesting and task/topic/genre/accent balancing; neither publishes the confidential live-paper specifications or item statistics needed to remove these limits.
