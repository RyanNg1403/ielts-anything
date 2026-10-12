// The Codex model and thinking effort the app uses unless the learner picks another in the composer.
// GPT-6-Luna on Max: strong enough for Cambridge-format writing and checking, and light on usage.
export const DEFAULT_MODEL = process.env.IELTS_MODEL ?? "gpt-6-luna";
export const DEFAULT_EFFORT = process.env.IELTS_EFFORT ?? "max";
