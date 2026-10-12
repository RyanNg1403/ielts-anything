// Speaking marks come only from the voice examiner, which heard the candidate (pronunciation
// included) and spoke its assessment privately at the end of the test. The results page shows the
// examiner's own words, split by criterion; no other model reads or rewrites them.
import { candidateWordCount, examinerSelfAnswers, parseSpokenAssessment, SPEAKING_CRITERIA, speakingOverall, type SpeakingResult, type TranscriptLine } from "@ielts/spec";

/** Below this the sample is too small to mark (a real test has several hundred words). */
const MIN_WORDS = 40;

export function markSpeaking(transcript: TranscriptLine[], examinerSaid: string | null): SpeakingResult {
  const candidateWords = candidateWordCount(transcript);
  const base = { kind: "speaking" as const, transcript, candidateWords, examinerSaid };
  const unmarked = (why: string) => ({ ...base, band: null, assessment: null, unmarked: why });
  if (candidateWords < MIN_WORDS)
    return unmarked(
      `The examiner heard only ${candidateWords} ${candidateWords === 1 ? "word" : "words"} from you, too few to mark. ` +
        "Check that the microphone is allowed and working, then take the test again.",
    );
  // The examiner's assessment would then cover its own words, not only the candidate's. Test speech
  // that reached the app together with the closing sentence counts too.
  const beforeEnd = examinerSaid?.split(/that is the end of the (?:speaking )?test/i)[0]?.trim() ?? "";
  const examined = beforeEnd && examinerSaid !== beforeEnd ? [...transcript, { role: "examiner" as const, part: 3 as const, text: beforeEnd }] : transcript;
  if (examinerSelfAnswers(examined).length)
    return unmarked("The examiner answered some of its own questions, so this test cannot be marked fairly. Please take it again.");
  const [said, check] = (examinerSaid ?? "").split(/end of (?:the )?assessment\.?/i);
  const assessment = said ? parseSpokenAssessment(said) : null;
  if (!assessment) return unmarked("The examiner did not finish its assessment, so this test could not be marked. Please take it again.");
  // The examiner's final check of its bands, when it gave all four, decides them.
  const finalBands = check?.split(/final bands/i)[1];
  const final = finalBands ? parseSpokenAssessment(finalBands) : null;
  if (final) for (const c of SPEAKING_CRITERIA) assessment[c] = { ...assessment[c], band: final[c].band };
  return { ...base, band: speakingOverall(assessment), assessment, unmarked: null };
}
