# Research brief: every Academic Writing task type, measured from Cambridge 12-21

## Why
We are about to build IELTS Academic Writing in the app: a generator for Task 1 and Task 2 prompts, with Task 1 visuals drawn by code (SVG) from structured data, and a marker. The general rules already exist. This pass fills only the gaps the generator and the SVG renderer need: measured numbers and visual conventions per type.

## Already done: read, do not redo
- `research/ielts/writing.md` (Task 1 families with density guesses marked "unverified", Task 2 families and wording).
- `research/ielts/writing-assessment/` (descriptors, examiner rules, calibration set, grader draft).
- `research/ielts/cambridge/corpus.md` (one-line Writing summary per test, Cambridge 12-21).
Use them as the starting point. Do not repeat their content; refer to them.

## Scope (hard limits)
- Academic only. Cambridge IELTS 12-21 only (books 1-11 are outdated).
- Primary source: the local copies under `corpus/` (`corpus/cambridge/cam12` to `cam20`, OCR text in `corpus/cambridge/text/`, Cambridge 21 pages in `corpus/ppo/`). Task 1 visuals are images: render only the Writing Task 1 pages to PNG (for example with `pdftoppm -f N -l N -r 110`) into `research/ielts/writing-types/.pages/` and look at them. Do not render or read any other section.
- Web: at most 15 fetches, only ielts.org, British Council, IDP or Cambridge pages, and only for visual conventions the books cannot show. No blogs.
- One pass. No second review round, no rewriting finished files. If something cannot be measured within these limits, write it in `gaps.md` and move on.
- Stop when the four deliverables exist. Aim to finish within about 45 minutes.

## Deliverables (write only into `research/ielts/writing-types/`)
1. `task1-ledger.csv`: one row per Task 1 (about 40 rows): `book,test,family,visuals,series,time_points,categories,rows,cols,stages,map_states,map_features,unit,period,source_page`. `family` is one of line, bar, pie, table, process, map, mixed (mixed lists its parts, e.g. `mixed:bar+table`). Leave non-applicable fields empty. Numbers only; no chart data values, no prompt text.
2. `task1-types.md`: per family:
   - frequency in the ledger;
   - measured density (min, median, max of the relevant fields), replacing the "unverified" guesses in writing.md;
   - how the stimulus sentence is built (a pattern with slots, e.g. "The [chart] below shows [what] in [place] [period]."), phrase-length quotes only;
   - visual conventions an SVG renderer must copy: title placement, axis titles and units, legend position, gridlines, value labels, pie percentage labels, table header layout, process arrows, labels and icons, map compass, key, scale, labelling of before/after states, roads and buildings, grey-scale or colour;
   - what the overview and key features are for that family (one short paragraph, pointing to writing.md where already covered);
   - a minimal JSON shape the generator should emit for that family so code can draw it.
3. `task2-types.md`: per family (opinion, discussion plus opinion, problem/cause-solution, advantages-disadvantages, outweigh, positive-negative, two-part direct questions, hybrids): frequency in Cambridge 12-21, the wording pattern with slots (phrase-length quotes only), the answer obligations, and topic domains seen. Note how often prompts are hybrids.
4. `gaps.md`: anything not measured and why.

## Rules
- Copyright: the books are copyrighted. No full prompts, no chart values, no model answers. Patterns with slots and phrase-length quotes (under 15 words) only.
- Every count comes from the ledger. If you estimate, label it "estimate".
- Do not write app code. Do not edit anything outside `research/ielts/writing-types/`.
