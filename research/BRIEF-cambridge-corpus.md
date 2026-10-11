# Research brief: Cambridge IELTS books as the canonical reference

## Why
The first research pass relied mostly on official ielts.org / British Council pages and barely used the Cambridge IELTS books (Cambridge English / Cambridge University Press & Assessment, IELTS 1-20 Academic). Those books contain retired real exam papers and are the most canonical reference for how a test actually looks. Our generator must imitate them.

## What to produce
A statistical and structural profile of the Academic tests in the Cambridge IELTS books, as many books and tests as you can cover (prioritise the recent ones, 10-20, since the format drifts over time).

For each test you can access, record:
- Listening: per part, the question types in order, item counts per block, instruction wording and word limits, context (e.g. Part 1 enquiry about a club), speakers and genders, accents if documented, the distractor patterns used.
- Reading: per passage, title, topic domain, approximate word count, source type, question types in order with item counts, instruction wording and word limits, answer distribution for TFNG/YNNG (how many T/F/NG), whether headings/matching lists have extra options, which question types follow passage order.
- Writing: Task 1 visual type and data shape (number of series, time points, categories), Task 2 question family and exact prompt wording.
- Speaking: the sample Part 1 topics, Part 2 cue cards, Part 3 themes.

Then aggregate: frequency of each question type by section and position, typical block sizes, TFNG answer ratios, passage length ranges, how much the question-type mix varies between tests, and how the register of each passage reads (sentence length, vocabulary level, academic hedging) with 2-3 short quoted examples per section, kept under fair-use length.

## Sources
Use legally accessible material only: Cambridge's official free sample tests and book previews, the IELTS answer keys and test breakdowns published on reputable teaching sites (state which), and examiner/teacher analyses of specific Cambridge tests. Record for every data point which book/test it came from and the URL. Do not download pirated PDFs. If a test cannot be verified, mark it as missing; do not guess.

## Deliverables (write into research/ielts/cambridge/)
- `corpus.md` (or `corpus.csv` plus notes): one row/section per test with the fields above.
- `patterns.md`: the aggregated patterns, with counts behind every claim.
- `register.md`: how the language of Cambridge passages and scripts reads, with the short quoted examples, so a writer model can match it.
- `gaps.md`: which books/tests could not be verified and what we would need (e.g. the user's own copies).
- Then update research/ielts/generation-rules.md: add a "Cambridge evidence" note next to every rule the corpus confirms, contradicts or refines. Do not delete existing rules; mark contradicted ones.

Do not write app code.
