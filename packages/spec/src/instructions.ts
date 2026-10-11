// Printed instructions for each Reading question family, following the Cambridge IELTS
// wording (books 12-21), adapted for screen delivery ("Write" instead of "In boxes ...").
import { blockQuestions, type Passage, type QuestionBlock } from "./reading.ts";

export type Instructions = {
  heading: string; // "Questions 1-7"
  lines: string[];
  legend?: { label: string; meaning: string }[];
  note?: string; // NB line
};

const NUM_WORDS = ["", "ONE", "TWO", "THREE"];
const PARAGRAPH_COUNT = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

export function limitPhrase(limit: { maxWords: number; allowNumber: boolean }) {
  const words =
    limit.maxWords === 1 ? (limit.allowNumber ? "ONE WORD AND/OR A NUMBER" : "ONE WORD ONLY") : `NO MORE THAN ${NUM_WORDS[limit.maxWords]} WORDS${limit.allowNumber ? " AND/OR A NUMBER" : ""}`;
  return `Choose ${words} from the passage for each answer.`;
}

export function questionRange(qs: number[]) {
  const first = Math.min(...qs);
  const last = Math.max(...qs);
  return first === last ? `Question ${first}` : `Questions ${first}–${last}`;
}

const letters = (n: number) => `A–${String.fromCharCode(64 + n)}`;

export function instructionsFor(block: QuestionBlock, passage: Passage, passageNumber: number): Instructions {
  const qs = blockQuestions(block);
  const heading = questionRange(qs);
  const rp = `Reading Passage ${passageNumber}`;
  const paragraphs = passage.paragraphs.length;

  switch (block.family) {
    case "tfng":
      return {
        heading,
        lines: [`Do the following statements agree with the information given in ${rp}?`, "Write"],
        legend: [
          { label: "TRUE", meaning: "if the statement agrees with the information" },
          { label: "FALSE", meaning: "if the statement contradicts the information" },
          { label: "NOT GIVEN", meaning: "if there is no information on this" },
        ],
      };
    case "ynng":
      return {
        heading,
        lines: [`Do the following statements agree with the claims of the writer in ${rp}?`, "Write"],
        legend: [
          { label: "YES", meaning: "if the statement agrees with the claims of the writer" },
          { label: "NO", meaning: "if the statement contradicts the claims of the writer" },
          { label: "NOT GIVEN", meaning: "if it is impossible to say what the writer thinks about this" },
        ],
      };
    case "mcq":
      return { heading, lines: ["Choose the correct letter, A, B, C or D."] };
    case "mcq_multi":
      return { heading, lines: [`Choose ${NUM_WORDS[block.qs.length]} letters, ${letters(block.options.length)}.`] };
    case "matching_information":
      return {
        heading,
        lines: [`${rp} has ${PARAGRAPH_COUNT[paragraphs]} paragraphs, ${letters(paragraphs)}.`, "Which paragraph contains the following information?"],
        note: block.allowReuse ? "NB You may use any letter more than once." : undefined,
      };
    case "matching_headings":
      return {
        heading,
        lines: [
          `${rp} has ${PARAGRAPH_COUNT[paragraphs]} paragraphs, ${letters(paragraphs)}.`,
          "Choose the correct heading for each paragraph from the list of headings below.",
        ],
      };
    case "matching_features": {
      const singular = block.featureLabel.replace(/s$/, "");
      return {
        heading,
        lines: [
          `Look at the following statements (${heading}) and the list of ${block.featureLabel} below.`,
          `Match each statement with the correct ${singular}, ${letters(block.options.length)}.`,
        ],
        note: block.allowReuse ? "NB You may use any letter more than once." : undefined,
      };
    }
    case "sentence_endings":
      return { heading, lines: [`Complete each sentence with the correct ending, ${letters(block.endings.length)}, below.`] };
    case "sentence_completion":
      return { heading, lines: ["Complete the sentences below.", limitPhrase(block.wordLimit)] };
    case "short_answer":
      return { heading, lines: ["Answer the questions below.", limitPhrase(block.wordLimit)] };
    case "summary_completion":
      return { heading, lines: ["Complete the summary below.", limitPhrase(block.wordLimit)] };
    case "summary_bank":
      return { heading, lines: [`Complete the summary using the list of phrases, ${letters(block.options.length)}, below.`] };
    case "note_completion":
      return { heading, lines: ["Complete the notes below.", limitPhrase(block.wordLimit)] };
    case "table_completion":
      return { heading, lines: ["Complete the table below.", limitPhrase(block.wordLimit)] };
    case "flowchart_completion":
      return { heading, lines: ["Complete the flow-chart below.", limitPhrase(block.wordLimit)] };
  }
}

export const FAMILY_LABELS: Record<QuestionBlock["family"], string> = {
  tfng: "True / False / Not Given",
  ynng: "Yes / No / Not Given",
  mcq: "Multiple choice",
  mcq_multi: "Multiple choice (more than one answer)",
  matching_information: "Matching information",
  matching_headings: "Matching headings",
  matching_features: "Matching features",
  sentence_endings: "Matching sentence endings",
  sentence_completion: "Sentence completion",
  short_answer: "Short-answer questions",
  summary_completion: "Summary completion",
  summary_bank: "Summary completion (word list)",
  note_completion: "Note completion",
  table_completion: "Table completion",
  flowchart_completion: "Flow-chart completion",
};
