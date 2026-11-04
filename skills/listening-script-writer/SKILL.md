---
name: listening-script-writer
description: Write IELTS Listening scripts (Parts 1-4) in Cambridge 12-21 style on the learner's topic - speakers, accents, sections and speakable text - for the app to record with its own voices. Use for every Listening full test or drill, before listening-item-writer.
---

# Listening script writer

Load `ielts-core` first. Plan and write the script for each part, then write its questions with `listening-item-writer`, then submit the part with `listening_publish_part`. The app adds the narrator ("Part 1. You will hear ..."), the time to read questions, the pauses, and records every line with a voice it casts from your speakers. You write only what the speakers say.

The learner must not see the script or answers before the test: never put them in chat or in `show_brief`.

## The four parts (Cambridge 12-21, 40 tests)

| Part | Situation | Speakers | Typical questions |
|---|---|---|---|
| 1 | Everyday transaction or enquiry: booking, joining, renting, reporting, asking for advice | Exactly 2 (often a customer and an official) | Form, notes or table completion (all 40 tests) |
| 2 | Everyday monologue: a guide, organiser or volunteer leader explaining a place, event or service | 1 (a second voice may introduce them) | Single MCQ (30/40), choose-two (24/40), matching (19/40), map or plan (12/40) |
| 3 | Education or training: students planning or reviewing a project, often with a tutor | 2-4 | Single MCQ (28/40), matching (28/40), choose-two (18/40), completion (10/40); never a map |
| 4 | Academic lecture or talk on one subject | 1 | Note completion, usually ONE WORD ONLY (all 40 tests) |

Difficulty rises from Part 1 to Part 4: concrete facts, then public information and directions, then negotiation and opinions, then sustained academic explanation.

## The learner's topic

Every part touches the topic from a different everyday or academic angle, and needs no specialist knowledge. For "AI labs": Part 1 booking a public tour of a robotics museum; Part 2 a guide explaining the layout and rules of a technology exhibition; Part 3 two students and a tutor planning a presentation on how chatbots are tested; Part 4 a lecture on the history of machine translation. Real named companies and recent events stay out of the script.

## Speakers and accents

- Give each speaker an `id` (used in the lines), a `role` (shown in the transcript after the test), a `sex` and an `accent`.
- Most speakers are British. In a full test give one or two speakers another accent: American, Australian or New Zealand. Mix women and men across the test, and give the two Part 1 speakers different sexes so they are easy to tell apart.
- Names suit the speaker but are easy to spell when spelling is tested.

## Sections

Parts 1, 2 and 3 have two sections: the recording pauses between them so candidates can read the next questions. Split where the topic turns, so each section answers a group of questions (for example Q1-6 and Q7-10, or Q11-15 and Q16-20). Part 4 is one section with no break. The app works out which questions each section previews from your evidence quotes.

## How Cambridge scripts sound

- **Part 1:** short natural turns with contractions, acknowledgements ("Right", "OK, let me just write that down"), questions and answers. A name or street spelled letter by letter, a number, a date, a price. About 600-800 words.
- **Part 2:** a friendly speaker addressing a group ("Good morning, everyone"). Clear signposts ("First, ...", "Now, if you look at the map ...", "Finally, ..."). About 650-850 words.
- **Part 3:** speakers negotiate, agree and disagree, change their minds, and refer to what a tutor or a source said. Opinions are attributed to a person. About 700-900 words.
- **Part 4:** one speaker, organised by headings or stages ("Let's start with ...", "The second reason is ..."), with examples and comparisons. About 700-900 words.

## Answers and distractors

- Answers come in the order of the questions, with at least a sentence between them so the candidate can write.
- The words of a completion answer are said exactly as they must be written. The question paraphrases the surrounding words, never the answer itself.
- Build natural distractors into the conversation, as Cambridge does, without forcing one into every item: a speaker corrects themselves ("It's Tuesday, no, sorry, Thursday"), a plan changes ("We used to start at nine, but now ..."), an option is mentioned and rejected, a related number answers a different question. For choose-two and matching, mention the wrong options too, so hearing a word is not enough.
- Never let an answer depend on outside knowledge.

## Write it to be spoken

The voices read exactly what you write:
- Spell letters as capitals separated by commas: "That's F, I, T, Z, G, E, R, A, L, D."
- Write times with a colon ("7:30", "at 10:15 am") or in words ("half past seven"). Never "7.30", which is read as a decimal.
- Prices with the symbol ("£42.50"), years as digits ("1995"), other numbers as digits or words, consistently.
- No phone numbers or postcodes as answers. No stage directions, sound effects, brackets or speaker names inside the text.
- One line is one turn. Keep a monologue line to a paragraph (2-5 sentences); start a new line for a new paragraph.

## Before submitting

Read each part aloud in your head: does it sound like people talking, is every answer clearly heard once, and would a careful candidate who misses nothing get every question right?
