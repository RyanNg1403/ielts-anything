---
name: reading-key-auditor
description: Audit an IELTS Reading answer key before and after the app's independent solver pass; decide whether disputed items are wrong, ambiguous or correct. Use when calling reading_finalize.
---

# Reading key auditor

`reading_finalize` runs an independent solver that answers the paper without the key. When it reports disagreements, decide for each item:

1. **Key wrong.** The solver's answer is better supported by the text. Fix the key (and explanation/evidence), resubmit that passage with `reading_publish_passage`, then finalize again.
2. **Item ambiguous.** Both answers can be defended. Rewrite the item: sharpen the statement's scope word, make a distractor clearly fail, or change the passage sentence. Resubmit the passage.
3. **Key right, solver wrong.** The text clearly settles it and a careful candidate would agree with the key. List the question in `confirmedKeys` with a one-line reason that cites the passage.

Use option 3 sparingly. A solver mistake usually means the item rewards a trick rather than reading.

## Common causes of disputes

- TFNG FALSE vs NOT GIVEN: FALSE needs the passage to state the opposite; if it is only implied or absent, it is NOT GIVEN.
- YNNG items that test a quoted person's view instead of the writer's.
- Completion answers that need a word-form change, exceed the word limit, or have two places in the text that fit.
- MCQ distractors that are also true according to another paragraph.
- Matching information prompts that describe a whole paragraph (that is a heading) or that fit two paragraphs.
- Headings that summarise only part of a paragraph.

Before the first finalize, reread every key once yourself with these causes in mind.
