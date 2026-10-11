# Official Writing calibration set

Checked 11 October 2026. **16 verified Academic scripts**, with official task-level bands and examiner comments. Criterion scores were not published in these collections: record them as null, never reconstruct them as official labels. Summaries below are paraphrases, not full commentary reproductions.

## Collection A: twelve Academic scripts

Source for every A row: [IELTS Academic Writing sample tasks, 26-page PDF](https://ielts.org/cdn/Sample-tests/ielts-academic-writing-sample-tasks-2023.pdf). Page references are physical PDF pages. The printed 2023 filename does not establish that each script was re-rated using the revised descriptors.

| ID | Task / visual or question | Script page; comment page | Published band | Commentary summary |
|---|---|---|---|---|
| A-1A-A | T1 / further-education bars | 9; 9 | 5 | Trends attempted; figures missing; confusing syntax. |
| A-1A-B | T1 / same bars | 10; 10 | 6 | Some omissions; excessive linking; limited structural variety. |
| A-1B-A | T1 / radio–TV lines | 11; 11 | 6 | Coverage adequate; overview needed; repetitive linking. |
| A-1B-B | T1 / same lines | 12; 12 | 7 | Trends compared; language errors preserve meaning. |
| A-1C-A | T1 / brick process | 13; 13 | 5 | Overview missing; features incomplete; frequent errors. |
| A-1C-B | T1 / same process | 14; 15 | 7 | Strong language; inappropriate format; unclear overview. |
| A-1C-C | T1 / same process | 16; 17 | 8.5 | Accurate stages; fluent language; overview could improve. |
| A-2A-A | T2 / upbringing, agreement | 18; 18 | 4 | Position unclear; organisation weak; errors obstruct meaning. |
| A-2A-B | T2 / same question | 19; 20 | 6.5 | Clear position; copied opening; organisation/grammar weaknesses. |
| A-2A-C | T2 / same question | 21; 22 | 8.5 | Developed argument; natural language; occasional overgeneralisation. |
| A-2B-A | T2 / tourism, outweigh | 23; 24 | 5.5 | Copied opening; limited development; lexical errors. |
| A-2B-B | T2 / same question | 25; 26 | 7.5 | Supported position; flexible vocabulary; minor systematic errors. |

## Collection B: four Academic scripts

Source for every B row: [IELTS computer-delivered sample responses, five-page PDF](https://ielts.org/cdn/computer-delivered-sample-tests-academic-writing/ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments.pdf). The [official sample-test landing page](https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test) links this collection. Despite the link label mentioning Part 2, the PDF contains both tasks.

| ID | Task / topic | Script and comment page | Published band | Commentary summary |
|---|---|---|---|---|
| B-T1-1 | T1 / school-transport bar chart | 2 | 6 | Relevant final overview; mechanical reporting; limited range. |
| B-T1-2 | T1 / same chart | 3 | 4 | Incomplete coverage; poor organisation; spelling and grammar obscure meaning. |
| B-T2-1 | T2 / future health, disagreement | 4 | 5.5 | Relevant position; short, underdeveloped response; language errors. |
| B-T2-2 | T2 / same question | 5 | 7.5 | Clear position and rebuttal; sequencing overused; otherwise strong language. |

Pair the scripts with the original visuals/questions through the official landing page. Do not infer the exact question wording solely from an essay's paraphrase.

## Additional official anchors and provenance conflict

[IDP IELTS Focus: Academic Writing Task 2, 2020 student book](https://info.ielts.idp.com/rs/561-EIU-022/images/IELTS%20Focus%20-%20AC%20Writing%20T2%20-%20Student%20updated.pdf) has scored examples at physical PDF pages 43 and 48 (printed pages 42 and 47): tourism Response B = **7**, upbringing Response B = **6.5**. Both are attributed to the IELTS Scores Guide. Their identifiers overlap Collection A; the tourism mark differs from A-2B-B's 7.5. Treat these as separate versioned source records pending full script comparison, not two new independent essays or interchangeable labels. Do not average their bands. The IDP upbringing commentary explicitly discusses deducting copied introduction text from the word count.

The older [British Council sample-response PDF URL](https://takeielts.britishcouncil.org/sites/default/files/academic-writing-sample-candidate-responses-and-examiner-comments.pdf) now redirects to a practice landing page, although search indexing still shows its previous text. Exclude it as an independent live collection; the IELTS-hosted B collection supplies accessible originals.

The [General Training marked-script URL](https://s3.eu-west-2.amazonaws.com/ielts-web-static/production/Sample-tests/General-Training-Writing/ielts-general-training-writing-sample-answers-and-examiner-comments.pdf) returned HTTP 403. A search excerpt identifies an 8.5 response, but neither task identity nor full script was verified. It is excluded from this set. GT Task 1 letters are outside Academic calibration; GT Task 2 can only be a labelled supplementary set after verification.

## Cambridge IELTS books 1–19+

Official [Cambridge IELTS 19 product page](https://shop.cambridge.org/english/product/2700241558), ISBN 9781009454735, confirms authentic papers and sample Writing answers, with access instructions inside the book. [Official frontmatter](https://assets.cambridge.org/97810094/54735/frontmatter/9781009454735_frontmatter.pdf) identifies the edition. The public product material is not an examiner-marked script corpus.

Searches for Cambridge sample answers surfaced third-party book scans and reposted answer keys. They were not admitted. **No book-by-book Cambridge band labels were independently verified from an accessible publisher-hosted answer section.** Books 1–18 and 20+ therefore remain acquisition gaps, rather than invented calibration records. Use legally obtained books/resource banks; distinguish scored candidate work from examiner-written model answers without an explicit score.

## Calibration protocol (proposed)

- Store collection URL, edition, task ID, script/comment page, module, task, visual/question, official task band, commentary summary, extraction method and verification date.
- Obtain script images/text from the originals when grading; several A scripts are handwritten images and need transcription checked against the page. Do not silently repair spelling or punctuation.
- Deduplicate by full response and prompt, not URL. Partner mirrors and edition variants are not independent observations.
- Split by prompt before selecting few-shot examples or test cases. A same-prompt sibling in training leaks task-specific information into evaluation.
- Preserve an untouched holdout. This small set spans task bands 4–8.5 but lacks 0–3 and 9, plus map/table/pie/mixed Task 1 scripts. It cannot establish general examiner-level accuracy.
- Evaluate the model against published task bands; expert-adjudicated analytic labels are needed for criterion-level validation. Re-rating under May 2023 must be recorded as a new judgement, not a correction to the publisher's historic mark.
