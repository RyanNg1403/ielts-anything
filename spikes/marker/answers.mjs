// Records a simulated strong candidate (scripted to about band 8) answering the frontier AI safety
// Part 3 questions (OpenAI TTS), for the in-app driver at /__probe/ai/.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(new URL("../../.env", import.meta.url), "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const out = new URL("../../apps/web/public/__probe/ai/", import.meta.url);
mkdirSync(out, { recursive: true });
const clips = {
  hello: "Hello.",
  p3_0: "Well, I think the main worry is that the technology is moving faster than our ability to understand it. Even the people building these systems admit they can't fully explain why a model behaves the way it does. And when you combine that with how widely they're being deployed, in hospitals, in banking, in schools, a single failure could have consequences on a scale we've never really had to deal with before.",
  p3_1: "The most obvious benefit would be time, time for regulators and researchers to catch up. If labs weren't racing each other to release the next model, they could afford to test more thoroughly before launch. I suppose it might also give society a chance to adapt, so that workers whose jobs are affected could retrain, rather than being caught off guard.",
  p3_2: "That's a difficult one. I'd say it shouldn't be left to the companies alone, because they obviously have a commercial interest. Ideally, it would involve some kind of public deliberation, where experts lay out the risks in plain language, and then elected representatives weigh them against the benefits. We already do something similar with medicines and nuclear power, so there's a precedent.",
  p3_3: "Mainly because you can't really mark your own homework. Even if a company has the best intentions, there's always pressure to ship a product on time, and that can lead people to overlook problems. An independent body, on the other hand, has no stake in the outcome, so its findings are likely to be more credible, both to governments and to the public.",
  p3_4: "I think they should be required to disclose serious incidents, at least to regulators, and fairly quickly. Of course, there's a tension here, because if they publish every detail, it could actually help bad actors exploit the same weakness. So perhaps a two-tier system would work best, full details for the authorities, and a general summary for everyone else.",
  p3_5: "Honestly, I'm a bit sceptical. Voluntary commitments sound good in a press release, but there's nothing to stop a company quietly dropping them when the competition heats up. That said, they can be a useful first step, because they establish norms that later become the basis for proper legislation. So I'd see them as a complement to regulation, rather than a substitute for it.",
};
for (const [name, text] of Object.entries(clips)) {
  const r = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: "coral", input: text, response_format: "wav", instructions: "A highly proficient adult non-native speaker of English with a light accent: fluent, natural pace and intonation, thinking aloud with only occasional brief pauses." }),
  });
  if (!r.ok) throw new Error(`${name}: ${r.status} ${await r.text()}`);
  writeFileSync(new URL(`${name}.wav`, out), Buffer.from(await r.arrayBuffer()));
  process.stdout.write(`${name} `);
}
