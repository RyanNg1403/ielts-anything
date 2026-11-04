---
name: listening-item-writer
description: Write IELTS Listening question blocks (form, note, table, flow-chart, sentence, summary and short-answer completion; MCQ; choose-two; matching; map and plan labelling) in Cambridge 12-21 style for a script, with exact evidence quotes, then publish and finalize. Use after listening-script-writer.
---

# Listening item writer

## Choosing the blocks

10 questions per part in a full test, in 1-3 blocks (each 3-10 items). Typical shapes:
- **Part 1:** one form or note completion block of 10 gaps, or a table plus notes. Example: Q1-10 notes.
- **Part 2:** single MCQ + map, single MCQ + choose-two, or matching + choose-two. Example: Q11-15 MCQ, Q16-20 map.
- **Part 3:** single MCQ + matching, or choose-two + MCQ. Example: Q21-25 MCQ, Q26-30 matching.
- **Part 4:** note completion, Q31-40, ONE WORD ONLY.

A drill is one part of 4-10 questions on the family the learner asked for.

## Rules per family (`family` value)

**Completion** (`form_completion`, `note_completion`, `table_completion`, `flowchart_completion`, `sentence_completion`, `summary_completion`, `short_answer`). The answer is said in the script exactly as written; the stem paraphrases what is around it. Word limits: ONE WORD AND/OR A NUMBER is usual in Part 1, ONE WORD ONLY in Part 4; use TWO WORDS only for noun phrases. Forms have printed labels and some filled-in values ("Course: Beginners") with gaps as `{{q}}`; notes are short note style under headings; a unit printed beside the gap ("£{{4}} per month") is not part of the answer. List accepted alternatives where Cambridge would: "42" for "forty-two", "7:30" and "7.30", British and American spellings, a word with and without an optional adjective. Never test a word that needs a change of form.

**MCQ** (`mcq`). Exactly three options, A-C. All three are mentioned or suggested in the script; two fail (rejected, corrected, true but not what was asked). Options are short and parallel.

**Choose two** (`mcq_multi`). Five options A-E, `qs` holds two consecutive numbers, one evidence quote per correct letter. The three wrong options are also discussed and ruled out.

**Matching** (`matching`). A printed `question` ("What does the speaker say about each of the following activities?"), an option box with a heading (`optionsTitle`), and 4-6 items (people, places, stages). Either a box of two or three more options than items, each used once (`allowReuse: false`), or a classification of three options A-C used more than once (`allowReuse: true`). Items follow the order they are discussed.

**Map or plan** (`map_labelling`). Part 2 only. Draw it on a 100 x 70 grid (x left to right, y top to bottom, north up). Label the landmarks the speaker uses to give directions (entrance, roads, existing buildings, a lake); never label the places asked about. Put 7-9 lettered markers A, B, C... (two to four more than the questions) at plausible spots, at least 7 units apart; most should be near the route the speaker describes so that each wrong letter is a real possibility. The script walks from a clear starting point ("We're at the main entrance") using left/right, before/after, opposite, next to, north of. Items list the places in the order they are described. Set `compass: true` when directions use north, south, east or west. Feature boxes follow the same rules as Writing maps: buildings and open areas as `[x, y, width, height]`, roads and paths as point lines.

## Evidence and explanations

- `evidence` is copied word for word from one line of the script (a few words to one sentence) and, for completion, contains the answer. The app rejects any quote it cannot find.
- `explanation` is for the learner after marking: what the speaker said and why the tempting option fails ("He first says Tuesday, then corrects himself to Thursday").

## Submit and finalize

1. `show_brief` first (skill `listening`, one outline line per part, no answers or script).
2. `listening_publish_part` once per part (full test: Parts 1-4 in order; question numbers continue: 1-10, 11-20, 21-30, 31-40). Fix every error and resubmit; consider every warning.
3. `listening_finalize`. An independent solver answers from the transcript. For each disagreement: fix the key if the solver is right; rewrite the item or the script if both answers can be defended; confirm the key only when the script clearly settles it.
4. The app then records the audio (a few minutes). Tell the learner in one or two sentences that the test is being recorded and will open from its card, and that they need headphones or speakers. Never reveal the script or answers.
