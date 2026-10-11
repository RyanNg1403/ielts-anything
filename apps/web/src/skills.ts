export type Skill = "reading" | "listening" | "writing" | "speaking";
export type Mode = "full" | "drill";

export const SKILLS: { id: Skill; label: string; prompt: string; full: string; drill: string; ideas: string[] }[] = [
  {
    id: "reading",
    label: "Reading",
    prompt: "What would you like to read about?",
    full: "Three passages, 40 questions, 60 minutes",
    drill: "One passage or one question type",
    ideas: ["How frontier AI labs are governed", "The science of sleep and memory", "Why cities are planting forests"],
  },
  {
    id: "listening",
    label: "Listening",
    prompt: "What would you like to listen to?",
    full: "Four parts, 40 questions, about 30 minutes",
    drill: "One part or one question type",
    ideas: ["Booking a climbing course", "A lecture on coral reef recovery", "Two students planning a robotics project"],
  },
  {
    id: "writing",
    label: "Writing",
    prompt: "What should your writing tasks be about?",
    full: "Task 1 and Task 2, 60 minutes",
    drill: "Task 1 or Task 2 on its own",
    ideas: ["Electric vehicle sales since 2015", "Should universities teach AI literacy?", "How recycled paper is made"],
  },
  {
    id: "speaking",
    label: "Speaking",
    prompt: "What would you like to talk about?",
    full: "Parts 1–3 with a live examiner, 11–14 minutes",
    drill: "One part, e.g. a Part 2 cue card",
    ideas: ["Hobbies and free time", "A piece of technology you rely on", "Travel and places you remember"],
  },
];

export const skillMeta = (id: Skill) => SKILLS.find((s) => s.id === id)!;

// The first line of a learner message carries the chosen skill and mode so Codex sees it
// and the UI can show it as chips when the history is reloaded.
const PREFIX = /^<practice skill="(\w+)" mode="(\w+)"\/>\n/;

export function encodeMessage(text: string, skill: Skill | null, mode: Mode) {
  return skill ? `<practice skill="${skill}" mode="${mode}"/>\n${text}` : text;
}

export function decodeMessage(raw: string): { text: string; skill: Skill | null; mode: Mode | null } {
  const m = raw.match(PREFIX);
  if (!m) return { text: raw, skill: null, mode: null };
  return { text: raw.slice(m[0].length), skill: m[1] as Skill, mode: m[2] as Mode };
}
