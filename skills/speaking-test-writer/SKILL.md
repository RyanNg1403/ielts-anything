---
name: speaking-test-writer
description: Write an IELTS Speaking test (Part 1 interview frames, Part 2 cue card, Part 3 discussion) in Cambridge 12-20 style on the learner's topic, then publish it with speaking_publish. Use for any Speaking test or Speaking part drill.
---

# Speaking test writer

The test is spoken live by a voice examiner and the learner answers by voice. The learner must not see the questions before the test: never put questions, the cue card or the Part 3 themes in chat messages, in `show_brief`, or anywhere except `speaking_publish`.

## The Cambridge shape (36 samples, Cambridge 12-20)

Every sample moves from personal to general:

| Part | What it is | Cambridge sample | What you write |
|---|---|---|---|
| 1 Interview (4-5 min) | Short questions about the candidate's own life, habits and preferences | One frame of 4 questions, e.g. walking: "How much walking do you do in your daily life?" | An opening frame ("Work or studies" or "Home", 3 questions) and one or two familiar-topic frames of 4 questions. 8-12 questions in total. |
| 2 Long turn (3-4 min) | One cue card, 1 minute to prepare, up to 2 minutes talking | "Describe a play or a film you have seen that you would like to see again with friends. You should say: what play or film you'd like to go to see again / who you would go with / what other people have said about this play or film / and explain why you would like to see this play or film again with friends." | `task` "Describe ...", three `prompts`, `explain` "and explain ...", one or two short rounding-off questions. |
| 3 Discussion (4-5 min) | Abstract discussion linked to the Part 2 subject | Two themes of 3 questions, e.g. theatre-going, then working as an actor | Two themes of 3 questions (6 in total, at most 8). |

Real topic sets for calibration: health / waiting a long time for someone / punctuality and patience; songs and singing / a popular film actor / film-going and theatre; clothes / an interesting discussion at work or study / money and young people; art / visiting a friend or relative at work / types of workplace; age / starting to use a new device / technology in education.

## Using the learner's topic

The learner's topic shapes Parts 2 and 3; Part 1 stays everyday and personal, because Part 1 tests whether candidates can talk about their own lives.

- **Part 1:** the opening frame is always work or studies (or home). The topic frame is the most everyday side of the learner's topic. For "AI", ask about using apps or technology day to day, not about models or labs. Every question must be answerable by anyone, including people who are neither working nor studying.
- **Part 2:** a personal experience connected to the topic: a person, place, object, event, activity or time in the candidate's life. "Describe a time when technology helped you learn something", not "Describe the governance of AI labs". The candidate needs no special knowledge.
- **Part 3:** the social and general side of the topic. Questions ask candidates to explain, compare, evaluate and speculate: "Why do you think...?", "How has ... changed?", "Is it a good thing that ...?", "What might happen if ...?". It is not a knowledge quiz; any educated adult must be able to answer. A recent-news topic becomes a general question ("Should governments control new technologies?"), never a question about a named company or event.

## Writing the questions

- Short, natural spoken questions (usually 6-15 words), one idea each, ending with "?". No multi-part questions joined with "and".
- Part 1 mixes present habits, past comparison, preference and future: "Do you...?", "Did you... when you were a child?", "Would you like to...?", "What kind of... do you prefer?".
- Cue card prompts are lower-case reminders without question marks: "what it is", "when you started using it", "how you use it". All prompts describe one coherent subject.
- The `explain` line starts "and explain" and asks for a reason or feeling, so the talk has a point.
- Rounding-off questions are short yes/no or one-line questions: "Do you still use it today?".
- Part 3 themes each start with an easier question and end with a harder evaluative or speculative one.
- British spelling. Neutral, adult register; no slang, no trick questions, no personal sensitivity (health conditions, money troubles, religion, politics of the candidate).

## Drills

A drill is one part (`mode: "drill"`, the other parts null). For a Part 2 drill, still write rounding-off questions. For a Part 3 drill, write the cue card subject into the title so the discussion has a context, but no cue card.

## Publishing

1. `show_brief` with the skill, mode, a title, the topic, the outline ("Part 1 Interview", "Part 2 Long turn", "Part 3 Discussion") and the estimated minutes. No questions in it.
2. `speaking_publish` with the full test. Fix every error it returns and publish again.
3. In chat, one or two sentences: the test is ready, it takes about N minutes, and they will need a microphone and a quiet place. Do not mention or hint at the questions.
