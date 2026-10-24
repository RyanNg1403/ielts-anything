---
name: writing-task-writer
description: Write IELTS Academic Writing tasks in Cambridge 12-21 style on the learner's topic - Task 1 (a chart, table, process diagram, map or mixed figure, given as data the app draws) and Task 2 (an essay prompt in any Cambridge question family) - then publish with writing_publish. Use for any Writing test or Writing task drill.
---

# Writing task writer

The app prints the official wording around each task ("You should spend about 20 minutes on this task.", "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.", "Write at least 150 words.", and the Task 2 equivalents). You write only the content: the Task 1 first line and figure data, and the Task 2 premise and question. The app draws line graphs, bar charts, pie charts and tables from your data, so the numbers you give are exactly what the candidate sees. Maps and process diagrams are pictures: you write their data first, then draw them with image generation (see "Drawing maps and process diagrams"). In every case the data is what the marker checks the candidate's report against.

## Length

- Full test: Task 1 and Task 2, 60 minutes (`mode: "full"`).
- Drill: one task (`mode: "drill"`, the other task null). "Task 1 practice", "a chart to describe", "a map task" mean a Task 1 drill; "an essay", "Task 2" mean a Task 2 drill. "A writing test" means a full test.

## Task 1: choosing the figure

Measured on Cambridge 12-20 (36 tasks): map 9, process 7, bar 7, mixed 6, line 5, pie 1, table 1. Pie charts and tables mostly appear inside mixed tasks. If the learner names a type, use it. Otherwise pick the type that fits the topic best, favouring the common ones, and vary it across tests in the same chat.

Pick a type the topic really supports:
- Change over time for several groups: **line** (or bar with years as categories).
- Comparing categories or groups: **bar**.
- Shares of a whole: **pie** (usually two or three pies for different years or groups).
- Exact figures across a few rows and measures: **table**.
- How something is made or works, or a natural cycle: **process**.
- How a place changed or will change: **map**.
- Two related views of one subject: **mixed** (two or three of line, bar, pie, table; never a map or process). Each figure shows a different measure, e.g. a bar chart of amounts and a table of percentage change.

## Task 1: data a candidate can summarise

The task tests whether the candidate can select key features and write an overview. Design the data so that it has one:
- 1-2 clear overall patterns (a dominant category, a general rise, a reversal) that a good overview names.
- 2-4 notable details worth comparing: a crossing point, a peak, a plateau, an exception to the trend, a near-tie.
- Not random noise, and not one dull uniform rise. Not so many details that nothing stands out.

Density (Cambridge measurements; the app rejects data outside its hard limits):
- **Line**: 2-5 series (usually 3-4), 5-12 time points (usually 6-8). Values on one unit and scale.
- **Bar**: 2-10 categories (usually 5-6) and 1-5 series (usually 2-3); at most 30 bars. No negative values.
- **Pie**: 1-4 pies (usually 2-3), 3-8 slices (usually 4-5), each pie adding up to exactly 100. Compared pies use the same slice names, and must differ noticeably: at least two slices change by 8 points or more, or the order of the largest slices changes. Two near-identical pies leave nothing to compare.
- **Table**: 2-8 rows, 2-6 data columns. Put units in the column headings; write cells as printed ("12.5", "+3%", "Free").
- **Process** (drawn as an image): 5-9 stages (usually 7-8), each a short action label ("Crushing into small pieces"); arrows for every link; an arrow from the last stage back to the first for a cycle. Parallel routes list each route's stages one after the other, with arrows splitting and joining. Short arrow labels (at most 4 words) for things that happen between stages ("Washing", "sugar added"). Set `numbered: true` unless it is a natural cycle.
- **Map** (drawn as an image): two plans (now and planned, or two dates), 9-17 labelled features in total. Draw on a 100 x 70 grid, north up: buildings, open areas (car parks, sports fields, playgrounds, beaches and other open land are always `area`, never `building`), trees and water as boxes [x, y, width, height]; roads and paths as lines of [x, y] points. Boxes must not overlap and must be at least 6 x 4; leave about 2 units between neighbours. Features that did not change keep exactly the same box in both plans. Show 4-7 changes: additions, removals, replacements, extensions, a road rerouted. Keep a few landmarks unchanged so the candidate can describe locations ("north of the car park"). Fill the plan as Cambridge plans do: features spread over most of the grid (roads crossing it, buildings along them), not a few boxes in empty space. Set `compass: true`.

Values and labels:
- Invented data must be plausible for the place and time and internally consistent (percentages of a whole add up; totals in a table match their parts). Use round-ish figures as Cambridge does (one decimal place at most).
- Use real places only with real, checked figures (search the web first); otherwise use generic settings: "a European country", "one city", "a seaside village". Never invent statistics and attach them to a real named source.
- Every figure has a short title, every axis and column states its unit, and series names are short (one to three words).

## Drawing maps and process diagrams

Maps and process diagrams are drawn as images, in the style of the Cambridge papers. Do this after the data is final and before `writing_publish`:

1. Look at the Cambridge reference figures with the image viewer: `references/process-recycling.png` and `references/process-sugar.png` for a process diagram, `references/map-harbour.png` and `references/map-park.png` for maps. Match their style; never copy their content.
2. Generate one image with the image generation tool. Write the prompt from your data:
   - Style: a black-and-white line drawing printed on white paper, like the references: thin black outlines, light grey shading at most, plain sans-serif labels. No colour, no photographs, no 3D effects, no decoration.
   - Text: the title at the top, exactly as in the data, and every label exactly as in the data, spelled letter for letter. List every label in the prompt in quotes. No other text anywhere.
   - Process: each stage as a simple pictorial drawing of the equipment or material (as in the references), with its circled number (when `numbered`) and its label next to it; arrows between stages exactly as in the data's arrows, in order, with any arrow labels; a cycle ends with an arrow back to the first stage.
   - Maps: the plans one above the other, each with its heading; a north compass when `compass` is true; roads as double lines, water with small wave marks, trees as simple tree symbols, buildings as labelled outlines; every feature placed as its box says (north is up, x left to right, y top to bottom on a 100 x 70 grid). Features that did not change look and sit exactly the same in both plans.
   - Portrait layout that fits a half page, with large, legible labels.
If you have no image generation tool, do not try another route (no scripts, no API keys): tell the learner in one sentence that maps and process diagrams are not available right now, and offer a chart, table or mixed Task 1 on the same topic instead.

3. Call `writing_publish`. The app attaches your latest image and checks it against the data. If it lists mismatches, generate a corrected image (or fix the data if the data was wrong) and publish again.

## Task 1: the first line

`intro` is the bold first line. Patterns (from Cambridge):
- "The graph below shows [measure] in [place] from [start] to [end]."
- "The bar chart below shows [measure] for [groups] in [place/year]."
- "The charts below show [shares] in [place] in [year] and [year]."
- "The table below gives information about [measure] in [places] in [years]."
- "The diagram below shows how [material] is [made/turned into] [product]." / "The diagram below shows the process for [what]."
- "The plans below show [site] at present and how it will look after [change]." / "The maps below show [place] in [year] and today."
- Mixed: "The chart and table below give information about [subject] in [place] between [years]."

Name what, where and when; match singular and plural to the figures ("graph" for one line graph, "charts" for several); never ask for opinions or causes.

## Task 2: the prompt

Cambridge 12-21 (40 prompts): discussion 11, opinion 10, outweigh 6, hybrid 5, positive-negative 3, two-part 3, problem-solution 1, advantages-disadvantages 1. If the learner names a type, use it; otherwise favour the common families and vary them.

| family | premise | questions (as printed) |
|---|---|---|
| opinion | A claim: "Some people believe that ..." or a plain statement. | "To what extent do you agree or disagree?" |
| discussion | "Some people think that [view A]. Others believe that [view B]." | "Discuss both these views and give your own opinion." |
| outweigh | A trend or policy: "In some countries, ..." | "Do the advantages of this outweigh the disadvantages?" |
| positive-negative | A development: "Nowadays more and more people ..." | "Is this a positive or negative development?" |
| two-part | A situation. | Two direct questions, e.g. "Why is this the case?" and "What can be done to ...?" |
| problem-solution | A problem. | "What are the causes of this problem?" / "What measures could be taken to solve it?" |
| advantages-disadvantages | A practice. | "What are the advantages and disadvantages of ...?" |
| hybrid | A situation. | One direct question plus one stance question, e.g. "Why ...?" and "Do you think this is a positive or negative development?" |

- The premise is one to three sentences, in plain general language, about a debatable issue any educated adult can discuss from their own knowledge and experience. No specialist knowledge, no statistics, no named people, companies or recent events.
- Take the learner's topic to its general, social side: "AI labs" becomes a question about whether governments should fund research with uncertain benefits, or whether workers should be retrained when technology replaces jobs.
- Cambridge Task 2 topics: education, work, technology, transport, environment, health, society and family, culture, government spending, cities and housing.
- `obligations` lists, for the marker, every part a full answer must cover: e.g. ["discuss the view that ...", "discuss the view that ...", "give and support a clear opinion"]. A hybrid or two-part prompt has one obligation per question.

## Publishing

1. `show_brief` with the skill, mode, a title, the topic, the outline ("Task 1 Report: bar chart", "Task 2 Essay: discussion") and the minutes. The candidate may see the tasks in advance, as in the real exam booklet.
2. `writing_publish` with the whole test. Fix every error it returns and publish again; consider every warning.
3. In chat, one or two sentences: the test is ready and how long it takes.
