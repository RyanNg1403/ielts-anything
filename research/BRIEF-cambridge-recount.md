# Correction brief: recount Cambridge Reading statistics deterministically

A review of research/ielts/cambridge/ found counting errors. The per-test question sequences in corpus.md look right, but the derived numbers are not.

## Defects found
1. **Status key splits do not match block sizes.** C19 Test 1 Q1–7 TFNG is recorded as `T2/F3/NG4` (9 answers for a 7-item block). The real key (Ppo R292) is False, False, Not Given, False, Not Given, True, True = T2/F3/NG2. C19 Test 3 Q1–7 has the same error (recorded NG4; real T2/F3/NG2). Other rows may share it.
2. **The Reading block-by-passage table in patterns.md contradicts the ledger.** It credits Passage 3 (Q27–40) with 40 TFNG blocks in 35 tests and 40 YNNG blocks in 29 tests, yet C19 Tests 1–4 all have YNNG and no TFNG in Q27–40. Similar inflation may affect other rows (e.g. Passage 1 notes, Passage 2 matching information).

## What to do
1. Write a script under research/ielts/cambridge/scripts/ that parses every Reading row of corpus.md into blocks `(book, test, first_q, last_q, family)`, assigns each block to a passage by the printed passage boundaries of that test (do not assume 13/13/14; check where each passage's questions actually start), and builds the passage table from those parsed blocks.
2. For TFNG/YNNG, take the answers question by question from the answer keys (local PDF keys for C12–C19, Ppo key pages for C20/C21 and as cross-checks), store them as a per-question CSV (`book,test,q,family,answer,source`), and compute splits from that CSV.
3. Add hard assertions: each block's answer count equals `last_q - first_q + 1`; every test has 40 Reading questions with no gaps or overlaps; every status question has exactly one answer. Print every failure and fix the ledger rows that cause them.
4. Regenerate the tables in patterns.md and the TFNG/YNNG figures quoted in generation-rules.md from the script output. Keep the script and CSV so the numbers are reproducible.
5. While you are at it, apply the same block-sum check to the Listening rows where the block ranges are recorded.

At the end, report: how many ledger rows changed, the corrected passage table, and the corrected TFNG/YNNG splits. Same copyright rules as before: the CSV holds answers like TRUE/FALSE/NOT GIVEN only, no question text.
