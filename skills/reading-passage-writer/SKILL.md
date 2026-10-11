---
name: reading-passage-writer
description: Write IELTS Academic Reading passages in Cambridge register on the learner's topic, with paragraph structure that supports the planned question types. Use for every Reading full test or drill.
---

# Reading passage writer

Load `ielts-core` first. Then plan, write, and only afterwards write items (`reading-item-writer`).

## Plan the three passages (full test)

| | Passage 1 | Passage 2 | Passage 3 |
|---|---|---|---|
| Role | Most accessible. Concrete, often historical or descriptive | Mid difficulty. Explanatory, research-based, several sources or actors | Hardest. Argumentative or theoretical, the writer's own position and competing views |
| Genre value | `historical`, `biographical`, `expository`, `feature` | `expository`, `scientific report`, `feature` | `argumentative` (required in at least one passage; usually here) |
| Length | ~750-850 words | ~800-900 words | ~850-950 words |
| Paragraphs | 6-8 | 6-8 (letter them if matching tasks use them) | 6-9 |

For a drill, write one passage at the difficulty the learner asked for (default: Passage 2 level).

Each passage takes a different angle on the learner's topic so the test does not repeat itself. Example for "AI labs": P1 the history of corporate research laboratories (Bell Labs to today); P2 how labs evaluate model safety and why methods differ; P3 an argument about whether self-regulation can work.

## Cambridge register: what to imitate

- A clear title, optionally a one-line standfirst (`subtitle`) like a magazine or journal piece.
- Edited, formal-but-readable prose: varied sentence length (15-30 words typical), topic sentences, explicit links between paragraphs ("This approach, however, ...", "A second explanation ...").
- Attribution and hedging: "According to ...", "researchers at X suggest", "it seems likely that", "critics have argued". Passage 3 states and defends a writer's view ("This, I believe, misreads ...", "It would be a mistake to ...") so YES/NO/NOT GIVEN items have claims to test.
- Specific, checkable detail: dates, quantities, named (generic or historical) people, places, stages of a process, comparisons. Items need this detail.
- No bullet lists, headings inside the passage, rhetorical questions in every paragraph, or second-person address.
- Technical terms only where needed; add a `glossary` entry for at most one or two essential terms.
- Never make the text easier by stating answers in the same words the questions will use. The items paraphrase; the passage states.

## Build in what the items will need

While writing, deliberately plant:
- statements that a later TRUE/FALSE item can paraphrase, and nearby related-but-unstated ideas for NOT GIVEN (e.g. the text gives the year a project began but not its cost);
- for P3, explicit writer claims and some views attributed to others (YES/NO depends on the writer, not on quoted people);
- paragraph-level main ideas distinct enough for matching headings, plus specific details (an example, a reason, a comparison, a date) spread across paragraphs for matching information;
- 2-4 named people/organisations each linked to a clear claim, for matching features;
- a coherent section (a process, a comparison, a sequence of events) for summary/notes/table/flow-chart completion, containing short concrete nouns or noun phrases that can be answers.

## Before submitting

Count the words (target ranges above; the full test total must be 2,150-2,750). Read it once as a learner: is every paragraph coherent on its own, and would a non-specialist follow it?
