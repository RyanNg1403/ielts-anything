"""Recount Cambridge Academic Reading blocks and status keys."""

from __future__ import annotations

import argparse
import csv
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path

CAMBRIDGE_DIR = Path(__file__).resolve().parents[1]
IELTS_DIR = CAMBRIDGE_DIR.parent
CORPUS_PATH = CAMBRIDGE_DIR / "corpus.md"
BOUNDARIES_PATH = CAMBRIDGE_DIR / "passage_boundaries.csv"
STATUS_PATH = CAMBRIDGE_DIR / "question_status.csv"
PATTERNS_PATH = CAMBRIDGE_DIR / "patterns.md"
RULES_PATH = IELTS_DIR / "generation-rules.md"
FIRST_BOOK = 12
LAST_BOOK = 21
TESTS_PER_BOOK = 4
QUESTIONS_PER_TEST = 40
LISTENING_PARTS = 4
QUESTIONS_PER_LISTENING_PART = 10

READING_FAMILY_ORDER = (
    "TFNG",
    "YNNG",
    "Notes completion",
    "Table completion",
    "Summary completion",
    "Flow-chart completion",
    "Diagram labelling",
    "Sentence completion",
    "Short answers",
    "Sentence endings",
    "Matching information",
    "Matching features",
    "Matching headings",
    "Single-answer MCQ",
    "Multi-answer MCQ (M2)",
)
STATUS_ANSWERS = {
    "TFNG": {"TRUE", "FALSE", "NOT GIVEN"},
    "YNNG": {"YES", "NO", "NOT GIVEN"},
}
RANGE_RE = re.compile(
    r"(?<![A-Za-z0-9])(?:Q\s*)?(\d{1,2})\s*[\u2013\u2014-]\s*(\d{1,2})(?!\d)",
    re.IGNORECASE,
)
FAMILY_PATTERNS = (
    ("TFNG", re.compile(r"\bTFNG\b", re.IGNORECASE)),
    ("YNNG", re.compile(r"\bYNNG\b", re.IGNORECASE)),
    ("Multi-answer MCQ (M2)", re.compile(r"\bM2\b", re.IGNORECASE)),
    ("Single-answer MCQ", re.compile(r"\bMCQ\b", re.IGNORECASE)),
    (
        "Matching information",
        re.compile(r"\bmatching information\b", re.IGNORECASE),
    ),
    (
        "Matching features",
        re.compile(r"\bmatching (?:features|people(?:/ideas)?)\b", re.IGNORECASE),
    ),
    ("Matching headings", re.compile(r"\bheadings\b", re.IGNORECASE)),
    ("Notes completion", re.compile(r"\bnotes\b", re.IGNORECASE)),
    ("Table completion", re.compile(r"\btable\b", re.IGNORECASE)),
    ("Summary completion", re.compile(r"\bsummary\b", re.IGNORECASE)),
    (
        "Flow-chart completion",
        re.compile(r"\bflow[ -]?chart\b", re.IGNORECASE),
    ),
    ("Diagram labelling", re.compile(r"\bdiagram labels?\b", re.IGNORECASE)),
    ("Short answers", re.compile(r"\bshort answers?\b", re.IGNORECASE)),
    (
        "Sentence completion",
        re.compile(r"\bsentence completion\b", re.IGNORECASE),
    ),
    ("Sentence endings", re.compile(r"\bsentence endings\b", re.IGNORECASE)),
)


@dataclass(frozen=True)
class Block:
    """One consecutive question block in a ledger row."""

    book: int
    test: int
    first_q: int
    last_q: int
    family: str
    line_number: int


@dataclass(frozen=True)
class PassageBoundary:
    """Printed question range for one Reading passage."""

    first_q: int
    last_q: int


@dataclass
class CorpusRows:
    """Accumulated Reading blocks and Listening/Reading source rows."""

    blocks_by_test: dict[tuple[int, int], list[Block]]
    listening_rows: dict[tuple[int, int], str]
    reading_rows: dict[tuple[int, int], str]
    failures: list[str]


def expected_test_keys() -> set[tuple[int, int]]:
    """Return the 40 Academic test keys in scope."""
    return {
        (book, test)
        for book in range(FIRST_BOOK, LAST_BOOK + 1)
        for test in range(1, TESTS_PER_BOOK + 1)
    }


def collect_corpus_row(
    line: str,
    line_number: int,
    book: int,
    test: int,
    corpus: CorpusRows,
) -> tuple[int, int]:
    """Store Reading and Listening rows and return their row counts."""
    key = (book, test)
    reading_count = int("- **Reading:**" in line)
    listening_count = int("- **Listening:**" in line)
    if reading_count:
        parsed = parse_reading_blocks(line, book, test, line_number, corpus.failures)
        if key in corpus.reading_rows:
            corpus.failures.append(
                f"corpus.md:{line_number}: duplicate Reading row for C{book} T{test}"
            )
        corpus.reading_rows[key] = line
        corpus.blocks_by_test[key].extend(parsed)
    if listening_count:
        if key in corpus.listening_rows:
            corpus.failures.append(
                f"corpus.md:{line_number}: duplicate Listening row for C{book} T{test}"
            )
        corpus.listening_rows[key] = line
    return reading_count, listening_count


def family_for_segment(segment: str) -> str | None:
    """Return the normalized task family named in a question segment."""
    for family, pattern in FAMILY_PATTERNS:
        if pattern.search(segment):
            return family
    return None


def question_spans(segment: str) -> list[tuple[int, int]]:
    """Parse ranges or a single numbered question from a segment."""
    spans = [(int(first), int(last)) for first, last in RANGE_RE.findall(segment)]
    if spans:
        return spans
    single = re.match(
        r"\s*(?:Q\s*)?(\d{1,2})\s+(?:MCQ|matching|TFNG|YNNG)\b",
        segment,
        re.IGNORECASE,
    )
    if single:
        question = int(single.group(1))
        return [(question, question)]
    return []


def split_grouped_m2(
    segment: str, spans: list[tuple[int, int]]
) -> list[tuple[int, int]]:
    """Expand a compressed range that states multiple M2 groups."""
    group_match = re.search(r"\b(two|three|3) M2 groups?\b", segment, re.IGNORECASE)
    if not group_match or len(spans) != 1:
        return spans
    group_count = 2 if group_match.group(1).lower() == "two" else 3
    first, last = spans[0]
    width = last - first + 1
    if width % group_count:
        return spans
    group_width = width // group_count
    return [
        (first + index * group_width, first + (index + 1) * group_width - 1)
        for index in range(group_count)
    ]


def parse_reading_blocks(
    row: str, book: int, test: int, line_number: int, failures: list[str]
) -> list[Block]:
    """Parse every Reading question block from one corpus row."""
    first_question = re.search(r"\bQ\s*\d{1,2}\s*[\u2013\u2014-]\s*\d{1,2}", row)
    if not first_question:
        failures.append(f"corpus.md:{line_number}: C{book} T{test} has no Q-range")
        return []
    sequence = row[first_question.start() :]
    terminator = re.search(
        r"\.\s*(?:Key\b|No TFNG/YNNG block\b|The complete PDF answer key\b|\[Ppo\b)",
        sequence,
        re.IGNORECASE,
    )
    if terminator:
        sequence = sequence[: terminator.start()]
    blocks: list[Block] = []
    for segment in sequence.split(";"):
        family = family_for_segment(segment)
        if not family:
            failures.append(
                f"corpus.md:{line_number}: C{book} T{test} has unclassified block "
                f"{segment.strip()!r}"
            )
            continue
        spans = question_spans(segment)
        if not spans:
            failures.append(
                f"corpus.md:{line_number}: C{book} T{test} has no range for "
                f"{family}: {segment.strip()!r}"
            )
            continue
        spans = split_grouped_m2(segment, spans)
        for first_q, last_q in spans:
            if last_q < first_q:
                failures.append(
                    f"corpus.md:{line_number}: C{book} T{test} has reversed range "
                    f"{first_q}-{last_q}"
                )
                continue
            blocks.append(Block(book, test, first_q, last_q, family, line_number))
    return blocks


def parse_corpus() -> tuple[
    dict[tuple[int, int], list[Block]],
    dict[tuple[int, int], str],
    dict[tuple[int, int], str],
    list[str],
]:
    """Load all Reading and Listening ledger rows."""
    corpus = CorpusRows(defaultdict(list), {}, {}, [])
    book: int | None = None
    test: int | None = None
    reading_count = 0
    listening_count = 0

    for line_number, line in enumerate(CORPUS_PATH.read_text().splitlines(), 1):
        book_match = re.match(r"## Cambridge (\d+)", line)
        if book_match:
            book = int(book_match.group(1))
        test_match = re.match(r"### Test (\d+)", line)
        if test_match:
            test = int(test_match.group(1))
        if book is None or test is None:
            continue
        reading_rows_found, listening_rows_found = collect_corpus_row(
            line,
            line_number,
            book,
            test,
            corpus,
        )
        reading_count += reading_rows_found
        listening_count += listening_rows_found

    expected_tests = expected_test_keys()
    if (
        reading_count != len(expected_tests)
        or set(corpus.blocks_by_test) != expected_tests
    ):
        corpus.failures.append(
            f"corpus.md: expected {len(expected_tests)} Reading rows for C12-21, "
            f"found {reading_count}"
        )
    if (
        listening_count != len(expected_tests)
        or set(corpus.listening_rows) != expected_tests
    ):
        corpus.failures.append(
            f"corpus.md: expected {len(expected_tests)} Listening rows for C12-21, "
            f"found {listening_count}"
        )
    return (
        corpus.blocks_by_test,
        corpus.listening_rows,
        corpus.reading_rows,
        corpus.failures,
    )


def read_boundaries(
    failures: list[str],
) -> dict[tuple[int, int], tuple[PassageBoundary, ...]]:
    """Read and validate test-specific printed passage boundaries."""
    result: dict[tuple[int, int], tuple[PassageBoundary, ...]] = {}
    expected_header = [
        "book",
        "test",
        "p1_first",
        "p1_last",
        "p2_first",
        "p2_last",
        "p3_first",
        "p3_last",
        "source",
    ]
    with BOUNDARIES_PATH.open(newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        if reader.fieldnames != expected_header:
            failures.append(
                f"{BOUNDARIES_PATH.name}: columns must be {expected_header}"
            )
            return result
        for line_number, row in enumerate(reader, 2):
            try:
                book = int(row["book"])
                test = int(row["test"])
                boundaries = tuple(
                    PassageBoundary(
                        int(row[f"p{passage}_first"]),
                        int(row[f"p{passage}_last"]),
                    )
                    for passage in range(1, 4)
                )
            except (TypeError, ValueError) as error:
                failures.append(
                    f"{BOUNDARIES_PATH.name}:{line_number}: invalid boundary: {error}"
                )
                continue
            key = (book, test)
            if key in result:
                failures.append(
                    f"{BOUNDARIES_PATH.name}:{line_number}: duplicate C{book} T{test}"
                )
            result[key] = boundaries
            if not row["source"].strip():
                failures.append(
                    f"{BOUNDARIES_PATH.name}:{line_number}: C{book} T{test} lacks source"
                )
            flat = [
                question
                for boundary in boundaries
                for question in range(boundary.first_q, boundary.last_q + 1)
            ]
            if flat != list(range(1, QUESTIONS_PER_TEST + 1)):
                failures.append(
                    f"{BOUNDARIES_PATH.name}:{line_number}: C{book} T{test} passage ranges "
                    "must partition Q1-40 in order"
                )
    expected_tests = expected_test_keys()
    if set(result) != expected_tests:
        failures.append(
            f"{BOUNDARIES_PATH.name}: expected 40 boundary rows, found {len(result)}"
        )
    return result


def load_status_rows(failures: list[str]) -> list[dict[str, str]]:
    """Load question-level status answers from their key-source CSV."""
    expected_header = ["book", "test", "q", "family", "answer", "source"]
    with STATUS_PATH.open(newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        if reader.fieldnames != expected_header:
            failures.append(f"{STATUS_PATH.name}: columns must be {expected_header}")
            return []
        rows = list(reader)
    for line_number, row in enumerate(rows, 2):
        try:
            row["book"] = str(int(row["book"]))
            row["test"] = str(int(row["test"]))
            row["q"] = str(int(row["q"]))
        except (TypeError, ValueError) as error:
            failures.append(f"{STATUS_PATH.name}:{line_number}: invalid id: {error}")
        row["family"] = row["family"].strip().upper()
        row["answer"] = " ".join(row["answer"].strip().upper().split())
        row["source"] = row["source"].strip()
    return rows


def validate_reading(
    blocks_by_test: dict[tuple[int, int], list[Block]],
    boundaries: dict[tuple[int, int], tuple[PassageBoundary, ...]],
    failures: list[str],
) -> dict[tuple[int, int, int], str]:
    """Assert that every Reading block partitions its test and passage."""
    block_passages: dict[tuple[int, int, int], str] = {}
    for key, blocks in sorted(blocks_by_test.items()):
        coverage: Counter[int] = Counter()
        test_boundaries = boundaries.get(key, ())
        for block_number, block in enumerate(blocks, 1):
            block_questions = list(range(block.first_q, block.last_q + 1))
            block_sum = len(block_questions)
            expected_sum = block.last_q - block.first_q + 1
            if block_sum != expected_sum:
                failures.append(
                    f"C{block.book} T{block.test} {block.family} Q{block.first_q}-{block.last_q}: "
                    f"block sum {block_sum} != range size {expected_sum}"
                )
            coverage.update(block_questions)
            passage_hits = [
                index
                for index, boundary in enumerate(test_boundaries, 1)
                if block.first_q >= boundary.first_q and block.last_q <= boundary.last_q
            ]
            if len(passage_hits) != 1:
                failures.append(
                    f"C{block.book} T{block.test} {block.family} Q{block.first_q}-{block.last_q}: "
                    f"does not fit exactly one printed passage boundary"
                )
            else:
                block_passages[(block.book, block.test, block_number)] = (
                    f"P{passage_hits[0]}"
                )
        gaps = sorted(set(range(1, QUESTIONS_PER_TEST + 1)) - set(coverage))
        overlaps = sorted(question for question, count in coverage.items() if count > 1)
        if gaps or overlaps or sum(coverage.values()) != QUESTIONS_PER_TEST:
            failures.append(
                f"C{key[0]} T{key[1]} Reading coverage: gaps={gaps}, overlaps={overlaps}, "
                f"slots={sum(coverage.values())}"
            )
    return block_passages


def validate_key_summaries(
    reading_rows: dict[tuple[int, int], str],
    rows: list[dict[str, str]],
    failures: list[str],
) -> None:
    """Compare each answer-key split printed in corpus.md with the CSV."""
    answers: dict[tuple[int, int, str], Counter[str]] = defaultdict(Counter)
    for row in rows:
        key = (int(row["book"]), int(row["test"]), row["family"])
        answers[key][row["answer"]] += 1
    summary_patterns = {
        "TFNG": re.compile(r"\bTFNG\s+T(\d+)/F(\d+)/NG(\d+)", re.IGNORECASE),
        "YNNG": re.compile(r"\bYNNG\s+Y(\d+)/N(\d+)/NG(\d+)", re.IGNORECASE),
    }
    for (book, test), row in sorted(reading_rows.items()):
        for family, pattern in summary_patterns.items():
            match = pattern.search(row)
            if not match:
                continue
            if family == "TFNG":
                actual = tuple(
                    answers[(book, test, family)][answer]
                    for answer in ("TRUE", "FALSE", "NOT GIVEN")
                )
            else:
                actual = tuple(
                    answers[(book, test, family)][answer]
                    for answer in ("YES", "NO", "NOT GIVEN")
                )
            recorded = tuple(int(value) for value in match.groups())
            if actual != recorded:
                failures.append(
                    f"corpus.md C{book} T{test} {family} key split records {recorded}; "
                    f"question_status.csv recounts {actual}"
                )


def expected_status_questions(
    blocks_by_test: dict[tuple[int, int], list[Block]], failures: list[str]
) -> dict[tuple[int, int, int], str]:
    """Map each status question to its single ledger task family."""
    expected: dict[tuple[int, int, int], str] = {}
    for blocks in blocks_by_test.values():
        for block in blocks:
            if block.family in STATUS_ANSWERS:
                for question in range(block.first_q, block.last_q + 1):
                    status_key = (block.book, block.test, question)
                    if status_key in expected:
                        failures.append(
                            f"C{block.book} T{block.test} Q{question}: duplicate status block"
                        )
                    expected[status_key] = block.family
    return expected


def collect_status_answers(
    rows: list[dict[str, str]], failures: list[str]
) -> tuple[dict[tuple[int, int, int], dict[str, str]], Counter[tuple[int, int, str]]]:
    """Validate CSV answer records and count them by book, test and family."""
    actual: dict[tuple[int, int, int], dict[str, str]] = {}
    totals: Counter[tuple[int, int, str]] = Counter()
    for row_number, row in enumerate(rows, 2):
        try:
            key = (int(row["book"]), int(row["test"]), int(row["q"]))
        except (KeyError, ValueError):
            continue
        if key in actual:
            failures.append(
                f"{STATUS_PATH.name}:{row_number}: duplicate answer for "
                f"C{key[0]} T{key[1]} Q{key[2]}"
            )
        actual[key] = row
        family = row["family"]
        if family not in STATUS_ANSWERS:
            failures.append(
                f"{STATUS_PATH.name}:{row_number}: invalid family {family!r}"
            )
        elif row["answer"] not in STATUS_ANSWERS[family]:
            failures.append(
                f"{STATUS_PATH.name}:{row_number}: invalid {family} answer {row['answer']!r}"
            )
        if not row["source"]:
            failures.append(f"{STATUS_PATH.name}:{row_number}: missing key source")
        totals[(int(row["book"]), int(row["test"]), family)] += 1
    return actual, totals


def compare_status_questions(
    expected: dict[tuple[int, int, int], str],
    actual: dict[tuple[int, int, int], dict[str, str]],
    failures: list[str],
) -> None:
    """Report missing, misclassified or extra keyed status questions."""
    for key, family in expected.items():
        if key not in actual:
            failures.append(
                f"C{key[0]} T{key[1]} Q{key[2]} {family}: missing status answer"
            )
        elif actual[key]["family"] != family:
            failures.append(
                f"C{key[0]} T{key[1]} Q{key[2]}: family {actual[key]['family']} "
                f"does not match block family {family}"
            )
    for key in actual.keys() - expected.keys():
        failures.append(
            f"C{key[0]} T{key[1]} Q{key[2]}: status answer is outside a status block"
        )


def check_status_block_sums(
    blocks_by_test: dict[tuple[int, int], list[Block]],
    actual: dict[tuple[int, int, int], dict[str, str]],
    failures: list[str],
) -> None:
    """Check that each TFNG/YNNG block has one keyed answer per question."""
    for blocks in blocks_by_test.values():
        for block in blocks:
            if block.family not in STATUS_ANSWERS:
                continue
            count = sum(
                1
                for question in range(block.first_q, block.last_q + 1)
                if (block.book, block.test, question) in actual
            )
            expected_count = block.last_q - block.first_q + 1
            if count != expected_count:
                failures.append(
                    f"C{block.book} T{block.test} {block.family} Q{block.first_q}-{block.last_q}: "
                    f"answer count {count} != block size {expected_count}"
                )


def validate_statuses(
    blocks_by_test: dict[tuple[int, int], list[Block]],
    rows: list[dict[str, str]],
    failures: list[str],
) -> Counter[tuple[int, int, str]]:
    """Assert one valid keyed answer for every TFNG/YNNG question."""
    expected = expected_status_questions(blocks_by_test, failures)
    actual, totals = collect_status_answers(rows, failures)
    compare_status_questions(expected, actual, failures)
    check_status_block_sums(blocks_by_test, actual, failures)
    return totals


def listening_question_ranges(row: str) -> dict[int, list[tuple[int, int]]]:
    """Extract explicit question ranges by Listening part."""
    parts = re.split(r"\bP([1-4])\b", row)
    result: dict[int, list[tuple[int, int]]] = defaultdict(list)
    for index in range(1, len(parts), 2):
        part_number = int(parts[index])
        content = parts[index + 1]
        result[part_number].extend(
            (int(first), int(last)) for first, last in RANGE_RE.findall(content)
        )
    return result


def validate_listening_part(
    book: int,
    test: int,
    part: int,
    spans: list[tuple[int, int]],
    failures: list[str],
) -> tuple[bool, str | None]:
    """Check the explicit ranges of one Listening part."""
    expected_first = (part - 1) * QUESTIONS_PER_LISTENING_PART + 1
    expected_end = expected_first + QUESTIONS_PER_LISTENING_PART
    expected_questions = set(range(expected_first, expected_end))
    covered: Counter[int] = Counter()
    for first, last in spans:
        if last < first:
            failures.append(f"C{book} T{test} P{part}: reversed Q{first}-{last}")
            continue
        if first < expected_first or last >= expected_end:
            failures.append(
                f"C{book} T{test} P{part}: Q{first}-{last} outside part range"
            )
        covered.update(range(first, last + 1))

    overlaps = sorted(question for question, count in covered.items() if count > 1)
    if overlaps:
        failures.append(f"C{book} T{test} P{part}: overlapping ranges at {overlaps}")
    range_sum = sum(last - first + 1 for first, last in spans)
    if range_sum != len(covered):
        failures.append(
            f"C{book} T{test} P{part}: explicit block sum {range_sum} "
            f"!= distinct questions {len(covered)}"
        )

    complete = (
        set(covered) == expected_questions and range_sum == QUESTIONS_PER_LISTENING_PART
    )
    if complete:
        return True, None
    rendered_ranges = ", ".join(f"Q{first}-{last}" for first, last in spans)
    partial = (
        f"C{book} T{test} P{part}: {rendered_ranges} "
        f"({range_sum} explicitly ranged questions)"
    )
    return False, partial


def validate_listening_rows(
    listening_rows: dict[tuple[int, int], str], failures: list[str]
) -> tuple[int, int, list[str]]:
    """Check explicit Listening ranges and complete ten-question parts."""
    checked_parts = 0
    complete_parts = 0
    partial_parts: list[str] = []
    for (book, test), row in sorted(listening_rows.items()):
        ranges_by_part = listening_question_ranges(row)
        for part in range(1, LISTENING_PARTS + 1):
            spans = ranges_by_part.get(part, [])
            if not spans:
                continue
            checked_parts += 1
            complete, partial = validate_listening_part(
                book, test, part, spans, failures
            )
            complete_parts += int(complete)
            if partial:
                partial_parts.append(partial)
    return checked_parts, complete_parts, partial_parts


def count_table(
    blocks_by_test: dict[tuple[int, int], list[Block]],
    boundaries: dict[tuple[int, int], tuple[PassageBoundary, ...]],
) -> tuple[Counter[tuple[int, str]], Counter[tuple[int, str]]]:
    """Count task blocks and distinct tests by passage and family."""
    blocks: Counter[tuple[int, str]] = Counter()
    tests: Counter[tuple[int, str]] = Counter()
    seen_tests: set[tuple[int, int, int, str]] = set()
    for key, row_blocks in blocks_by_test.items():
        for block in row_blocks:
            passage = next(
                index
                for index, boundary in enumerate(boundaries[key], 1)
                if block.first_q >= boundary.first_q and block.last_q <= boundary.last_q
            )
            blocks[(passage, block.family)] += 1
            test_family = (key[0], key[1], passage, block.family)
            if test_family not in seen_tests:
                tests[(passage, block.family)] += 1
                seen_tests.add(test_family)
    return blocks, tests


def status_counts(rows: list[dict[str, str]]) -> dict[str, Counter[str]]:
    """Count verified answers by status family and answer label."""
    counts: dict[str, Counter[str]] = {"TFNG": Counter(), "YNNG": Counter()}
    for row in rows:
        counts[row["family"]][row["answer"]] += 1
    return counts


def make_passage_table(
    blocks: Counter[tuple[int, str]], tests: Counter[tuple[int, str]]
) -> str:
    """Render the recalculated Reading table."""
    headers = [
        "| Task family | Passage 1, Q1\u201313 | Passage 2, Q14\u201326 | Passage 3, Q27\u201340 |",
        "|---|---:|---:|---:|",
    ]
    lines = list(headers)
    for family in READING_FAMILY_ORDER:
        values = []
        if not any((passage, family) in blocks for passage in range(1, 4)):
            continue
        for passage in range(1, 4):
            block_count = blocks[(passage, family)]
            test_count = tests[(passage, family)]
            values.append("0" if not block_count else f"{block_count} ({test_count})")
        lines.append(f"| {family} | " + " | ".join(values) + " |")
    return "\n".join(lines)


def make_status_table(rows: list[dict[str, str]]) -> str:
    """Render the recalculated TFNG/YNNG table."""
    counts = status_counts(rows)
    lines = [
        "| Key family | Verified answer slots | Answer counts | Share of verified slots |",
        "|---|---:|---|---|",
    ]
    for family, labels, names in (
        ("TFNG", ("TRUE", "FALSE", "NOT GIVEN"), ("True", "False", "Not Given")),
        ("YNNG", ("YES", "NO", "NOT GIVEN"), ("Yes", "No", "Not Given")),
    ):
        total = sum(counts[family].values())
        answer_counts = "; ".join(
            f"{name} {counts[family][label]}"
            for label, name in zip(labels, names, strict=True)
        )
        shares = ", ".join(
            f"{100 * counts[family][label] / total:.1f}%" for label in labels
        )
        lines.append(f"| {family} | {total} | {answer_counts} | {shares} |")
    return "\n".join(lines)


def replace_markdown_table(text: str, heading: str, table: str) -> str:
    """Replace the first table following a unique header line."""
    start = text.find(heading)
    if start < 0:
        message = f"Markdown table heading not found: {heading}"
        raise ValueError(message)
    table_start = text.find("|", start)
    table_end = text.find("\n\n", table_start)
    if table_start < 0 or table_end < 0:
        message = f"Markdown table not found after: {heading}"
        raise ValueError(message)
    return text[:table_start] + table + text[table_end:]


def replace_required(old: str, new: str, text: str) -> str:
    """Replace one exact report fragment or fail with its first line."""
    if old not in text:
        if new in text:
            return text
        message = f"Report fragment not found: {old[:100]!r}"
        raise ValueError(message)
    return text.replace(old, new, 1)


def replace_paragraph_start(text: str, prefix: str, replacement: str) -> str:
    """Replace one Markdown paragraph identified by its opening text."""
    pattern = re.compile(rf"^{re.escape(prefix)}.*$", re.MULTILINE)
    match = pattern.search(text)
    if not match:
        message = f"Report paragraph not found: {prefix!r}"
        raise ValueError(message)
    return text[: match.start()] + replacement + text[match.end() :]


def regenerate_reports(
    rows: list[dict[str, str]],
    passage_blocks: Counter[tuple[int, str]],
    passage_tests: Counter[tuple[int, str]],
) -> None:
    """Update report tables and embedded Cambridge figures."""
    patterns = PATTERNS_PATH.read_text()
    status_total = len(rows)
    passage_table = make_passage_table(passage_blocks, passage_tests)
    status_table = make_status_table(rows)
    patterns = replace_required(
        "For position, questions 1\u201313 are assigned to Reading Passage 1, "
        "14\u201326 to Passage 2, and 27\u201340 to Passage 3 as printed in the ledger. ",
        "For passage position, each block follows the printed boundaries recorded "
        "test by test in [passage_boundaries.csv](passage_boundaries.csv); no fixed "
        "split is assumed. ",
        patterns,
    )
    patterns = replace_markdown_table(
        patterns,
        "| Task family | Passage 1, Q1\u201313 | Passage 2, Q14\u201326 | Passage 3, Q27\u201340 |",
        passage_table,
    )
    patterns = replace_markdown_table(
        patterns,
        "| Key family | Verified answer slots | Answer counts | Share of verified slots |",
        status_table,
    )
    status_source_pattern = re.compile(
        r"All \d+ status slots are classified across 40 tests\..*?"
        r"(?=\n\nThese distributions are descriptive)",
        re.DOTALL,
    )
    status_source_match = status_source_pattern.search(patterns)
    if not status_source_match:
        message = "Could not find the status-source note in patterns.md"
        raise ValueError(message)
    status_source_note = (
        "All "
        + str(status_total)
        + " status slots are classified across 40 tests, one row per keyed question in "
        "[question_status.csv](question_status.csv). Rows retain book, test, question, "
        "family, answer label and key-page source only. Local answer-key page locators, "
        "in Test 1-4 order: C12 pp. 117, 119, 121, 123; C13 pp. 119, 121, 123, 125; "
        "C14 pp. 120, 122, 124, 126; C15 pp. 120, 122, 124, 126; C16 pp. 122, 124, "
        "126, 128; C17 pp. 120, 122, 124, 126; C18 pp. 120, 122, 124, 126; C19 pp. "
        "121, 123, 125, 127. C20 uses Ppo R310-R313 because the local answer-key pages "
        "are unreadable; C21 uses Ppo R316-R319. Each source is attached to its question "
        "row and maps to the corresponding test in [corpus.md](corpus.md)."
    )
    patterns = (
        patterns[: status_source_match.start()]
        + status_source_note
        + patterns[status_source_match.end() :]
    )
    patterns = replace_required(
        "These distributions are descriptive and not balanced by design: the aggregate "
        "is close to one-third each, while individual blocks range from two or three "
        "items to eight or more.",
        "These distributions are descriptive and not balanced by design. The keyed "
        "answer counts come from the per-question CSV, and the script asserts each "
        "status block's question total before computing the shares. Regenerate with "
        "`python3 research/ielts/cambridge/scripts/recount_cambridge.py --write-reports`. "
        "Five status-split summaries in the corpus ledger were corrected by this recount.",
        patterns,
    )
    PATTERNS_PATH.write_text(patterns)

    counts = status_counts(rows)
    tfng_total = sum(counts["TFNG"].values())
    ynng_total = sum(counts["YNNG"].values())
    p1_tfng = (passage_blocks[(1, "TFNG")], passage_tests[(1, "TFNG")])
    p2_info = (
        passage_blocks[(2, "Matching information")],
        passage_tests[(2, "Matching information")],
    )
    p3_tfng = (passage_blocks[(3, "TFNG")], passage_tests[(3, "TFNG")])
    p3_ynng = (passage_blocks[(3, "YNNG")], passage_tests[(3, "YNNG")])
    rules = RULES_PATH.read_text()
    new_passage = (
        "**Cambridge evidence:** Reading mixes vary by printed passage position: Passage 1 has "
        f"{p1_tfng[0]} TFNG blocks across {p1_tfng[1]} tests, Passage 2 has "
        f"{p2_info[0]} matching-information blocks across {p2_info[1]} tests, and Passage 3 has "
        f"{p3_tfng[0]} TFNG blocks across {p3_tfng[1]} tests plus {p3_ynng[0]} YNNG blocks "
        f"across {p3_ynng[1]} tests. These are sample observations, not target quotas. "
        "[patterns.md](cambridge/patterns.md)"
    )
    rules = replace_paragraph_start(
        rules, "**Cambridge evidence:** Reading mixes", new_passage
    )
    old_status = re.search(
        r"across \d+ keyed TFNG slots, T/F/NG counts are \d+/\d+/\d+; "
        r"across \d+ YNNG slots, Y/N/NG are \d+/\d+/\d+",
        rules,
    )
    if not old_status:
        message = "Could not find TFNG/YNNG figures in generation-rules.md"
        raise ValueError(message)
    new_status = (
        f"across {tfng_total} keyed TFNG slots, T/F/NG counts are "
        f"{counts['TFNG']['TRUE']}/{counts['TFNG']['FALSE']}/{counts['TFNG']['NOT GIVEN']}; "
        f"across {ynng_total} YNNG slots, Y/N/NG are "
        f"{counts['YNNG']['YES']}/{counts['YNNG']['NO']}/{counts['YNNG']['NOT GIVEN']}"
    )
    rules = rules[: old_status.start()] + new_status + rules[old_status.end() :]
    RULES_PATH.write_text(rules)


def print_failures(failures: list[str]) -> None:
    """Print every detected recount failure."""
    for failure in failures:
        print(f"FAIL: {failure}")


def main() -> int:
    """Run the deterministic Cambridge recount and optionally write reports."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--write-reports",
        action="store_true",
        help="regenerate the tables in patterns.md and figures in generation-rules.md",
    )
    args = parser.parse_args()

    blocks_by_test, listening_rows, reading_rows, failures = parse_corpus()
    boundaries = read_boundaries(failures)
    status_rows = load_status_rows(failures)
    validate_reading(blocks_by_test, boundaries, failures)
    validate_statuses(blocks_by_test, status_rows, failures)
    validate_key_summaries(reading_rows, status_rows, failures)
    listening_checked, listening_complete, listening_partial = validate_listening_rows(
        listening_rows, failures
    )
    if failures:
        print_failures(failures)
        message = f"{len(failures)} recount checks failed"
        raise AssertionError(message)

    passage_blocks, passage_tests = count_table(blocks_by_test, boundaries)
    totals = status_counts(status_rows)
    print(
        "Reading: 40 tests x 40 questions; no gaps, overlaps or cross-passage blocks."
    )
    print(
        f"Listening: {listening_checked} parts with explicit ranges checked; "
        f"{listening_complete} fully ranged parts sum to 10 questions."
    )
    for part in listening_partial:
        print(f"Listening partial ranges: {part}")
    print(
        f"Status CSV: {len(status_rows)} keyed questions; all status blocks sum exactly."
    )
    print(make_passage_table(passage_blocks, passage_tests))
    print(make_status_table(status_rows))
    print(
        "Status totals: "
        f"TFNG={sum(totals['TFNG'].values())}; "
        f"YNNG={sum(totals['YNNG'].values())}"
    )
    if args.write_reports:
        regenerate_reports(status_rows, passage_blocks, passage_tests)
        print("Updated patterns.md and generation-rules.md.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
