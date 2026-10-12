// Records a simulated weaker candidate (scripted to about band 6) for the frontier AI safety Part 3
// questions: fillers, self-corrections, grammar slips, plain vocabulary, and five deliberate
// mispronunciations forced by respelling (see MISPRONOUNCED). Output: /__probe/ai-weak/.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(new URL("../../.env", import.meta.url), "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const out = new URL("../../apps/web/public/__probe/ai-weak/", import.meta.url);
mkdirSync(out, { recursive: true });

// Intended word -> respelling used in the TTS input.
export const MISPRONOUNCED = { think: "tink", this: "dis", important: "importan", company: "kom-PAN-ee", world: "wold" };

const clips = {
  hello: "Hello.",
  p3_0: "Uh, I tink people is worried because the AI is, uh, develop very fast. Very very fast. And, um, nobody really know how it work inside. So, uh, if something go wrong, it can be a big problem for the wold, I mean, for everyone.",
  p3_1: "Um, if we slow down, I tink we have more time to, uh, to check the safety. And the people can, uh, prepare for the change, like the job. Because many people will lose the job because of AI. So slow is, uh, more safe I think.",
  p3_2: "Uh, dis is difficult question. I think the government should decide, uh, but also the expert. They need to, um, talk together and, uh, they decide which risk is OK and which is not OK. It is very importan for the society.",
  p3_3: "Because, uh, the kom-PAN-ee always want to make money, so they can, uh, they can hide the problem. If, um, if there is another group to check, it is more fair. And people will trust more, uh, the result.",
  p3_4: "I think they should share, uh, most of the information. Because the people have the right to know, uh, if the AI have some problem. But, um, maybe not everything, because the bad people can use it. So, uh, share some, not all.",
  p3_5: "Um, no, I don't think so. Because the kom-PAN-ee can, uh, can change their mind anytime. The law is more strong, uh, because if they break the law, they get punish. So the government regulation is more importan, I tink.",
};
for (const [name, text] of Object.entries(clips)) {
  const r = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: "coral",
      input: text,
      response_format: "wav",
      instructions:
        "An adult non-native learner of English at about IELTS band 6, with a noticeable accent: slightly uneven rhythm, flat intonation, short pauses while searching for words. Read the text exactly as written, including the fillers and every unusual spelling, pronouncing the spelling literally.",
    }),
  });
  if (!r.ok) throw new Error(`${name}: ${r.status} ${await r.text()}`);
  writeFileSync(new URL(`${name}.wav`, out), Buffer.from(await r.arrayBuffer()));
  process.stdout.write(`${name} `);
}
