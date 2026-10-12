// Records simulated candidates at about band 4, 7 and 9 answering the frontier AI safety Part 3
// questions (OpenAI TTS), for the in-app driver at /__probe/ai-b4/, ai-b7/, ai-b9/.
// The band 6 and band 8 sets come from answers-weak.mjs (ai-weak/) and answers.mjs (ai/).
// Band 4 also has deliberate mispronunciations forced by respelling: tink (think), wold (world),
// dangerus (dangerous), kom-PAN-ee (company), lor (law).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(new URL("../../.env", import.meta.url), "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));

const LEVELS = {
  b4: {
    voice: "ash",
    instructions:
      "An adult beginner learner of English at about IELTS band 4, with a strong accent: slow, choppy speech, long pauses before many words, flat intonation. Read the text exactly as written, including fillers and every unusual spelling, pronouncing the spelling literally.",
    clips: {
      p3_0: "Uh... because AI is... very fast. Very fast. People is, uh, scare. Uh... AI can do, uh, dangerus ting. For the wold. Yes.",
      p3_1: "Slow... uh, is good. Because, uh, more time. More time for check. Uh... I tink, uh, is good for people.",
      p3_2: "Uh... the government. Government decide. Uh, and... the people also. I don't know. Is difficult.",
      p3_3: "Because the kom-PAN-ee, uh, want money. Only money. So, uh... other people check. Is better.",
      p3_4: "Uh... share. Yes, share. Uh, people need know. Uh... the problem. Yes.",
      p3_5: "Uh, no. Government is, uh, more strong. Because the lor. Kom-PAN-ee, uh, not follow. So the lor is better.",
    },
  },
  // Written to the band 6 descriptors: long turns; coherence sometimes lost through hesitation and
  // self-correction; connectives not always appropriate; mix of short and complex forms with frequent
  // errors that rarely impede; enough vocabulary to talk at length, some inappropriate choices.
  b6: {
    voice: "coral",
    instructions:
      "An adult non-native speaker of English at about IELTS band 6, with a noticeable accent: willing to talk at length, moderate pace, some hesitation and self-correction mid-sentence, intonation a little flat. Read the text exactly as written, including the fillers.",
    clips: {
      p3_0: "Well, I think people are worried because AI is developing so fast, and, um, nobody can really control it. For example, every few months there is a new model which can do more things than before, like writing or making videos. And the government, they don't have enough time to make the rules, so, uh, people feel that the technology is going ahead of us. Moreover, some people afraid that AI will take their jobs, especially in offices.",
      p3_1: "If we slow down the development, I think the companies would have more time to test their products before they release them. Um, so maybe there will be less accidents, or less, uh, misuse of AI. Also, the society can prepare better, for example, schools can teach people the new skills they need. But on the other hand, if it is too slow, maybe other countries will develop faster, so it's a difficult balance.",
      p3_2: "In my opinion, the decision should not be made only by the companies, because they care about the profit more than the safety. I think the government should, uh, should ask experts, like scientists and also ordinary people, and then they decide together which risk is acceptable. For example, with medicine, there is a long process of testing before it can be sold, so maybe AI should have something similar.",
      p3_3: "Because, um, when the company checks itself, it is not very objective. They want to release the product quickly to compete with other companies, so they might ignore some problems. An independent organisation, on the other hand, doesn't get benefit from the product, so their result is more reliable. And I think people will trust the AI more if somebody outside has checked it.",
      p3_4: "I think they should share the serious problems, at least with the government, because it affects many people. For example, if the AI gives wrong information about health, people need to know about it. However, they shouldn't share every technical detail in public, because, uh, bad people could use this information to attack the system. So I would say share the main problems, but not everything.",
      p3_5: "Personally, I don't think they are as effective. Voluntary commitment is like a promise, and the company can break it when the competition become stronger. Government regulation is more strict, because if the company doesn't follow, they will be punished, for example, they pay a fine. But I think voluntary commitment is still useful as a first step, before the law is ready.",
    },
  },
  b7: {
    voice: "sage",
    instructions:
      "An adult non-native speaker of English at about IELTS band 7, with a noticeable but clear accent: generally fluent, natural pace, occasional brief hesitation mid-sentence, good intonation. Read the text exactly as written.",
    clips: {
      p3_0: "I think the main concern is that AI is developing much faster than, um, our ability to control it. Every few months there's a new model that can do things we didn't expect, and governments are struggling to keep up. So people worry that by the time we understand the risks, it might be too late to do anything about them.",
      p3_1: "Well, slowing down would give researchers more time to test these systems properly before they're released. It would also allow society to adapt, for example, workers could retrain for new jobs instead of suddenly losing them. And I suppose it would reduce the chance of a serious accident happening because of competition between companies.",
      p3_2: "That's quite a complex question. In my opinion, it should be a combination of experts and the public. Experts can explain the possible dangers, but the final decision should be made by elected governments, because they represent the people. We already do this with things like new medicines, which have to be approved before they're sold.",
      p3_3: "Mainly because companies have a conflict of interest. They want to release products quickly and make a profit, so they might, um, overlook some safety issues. An independent organisation doesn't have that pressure, so its assessment would be more objective and more trustworthy for the public.",
      p3_4: "I believe they should share most of the important information, especially when there's a serious problem. People have a right to know if a system they're using might be harmful. However, some technical details probably shouldn't be made public, because criminals could use them to cause harm.",
      p3_5: "I don't think so, to be honest. Voluntary commitments depend on the goodwill of the companies, and when the competition gets tough, they might just ignore them. Government regulations are more effective because they're legally binding and there are penalties if companies break them. But voluntary agreements can still be useful as a starting point.",
    },
  },
  b9: {
    voice: "ballad",
    instructions:
      "A highly articulate, expert speaker of English, effortlessly fluent and precise: relaxed natural pace, rich and varied intonation, pauses only for emphasis or to choose an idea. Read the text exactly as written.",
    clips: {
      p3_0: "I'd say it boils down to a mismatch in tempo. The capabilities of these systems are compounding at a pace that our institutions, which tend to move incrementally, simply weren't designed for. And there's an unsettling asymmetry in that the people best placed to gauge the risks are, by and large, the very people with a vested interest in pressing ahead. So the anxiety isn't really about the technology per se, it's about whether anyone is genuinely at the wheel.",
      p3_1: "The most compelling argument, to my mind, is that it buys time for our understanding to catch up with our capabilities. At the moment we're deploying systems whose inner workings remain, frankly, something of a black box. A more measured pace would let interpretability research mature, and it would take some of the heat out of the arms-race dynamic, where cutting corners on safety becomes almost a rational business decision.",
      p3_2: "Ideally through a process that's both technically informed and democratically legitimate. Experts can map out the probabilities and the potential severity of harm, but deciding how much risk is tolerable is ultimately a question of values, not engineering. So I'd advocate something akin to how we regulate pharmaceuticals or aviation, a standing independent body that can be held to account, rather than leaving it to whoever happens to be first to market.",
      p3_3: "For the same reason we don't let students mark their own exams. However well-intentioned a lab may be, commercial pressures inevitably colour its judgement, and internal teams can't always speak freely if their findings threaten a product launch. An external auditor brings both distance and credibility, and crucially, its conclusions carry weight with regulators and the public in a way that a company's own assurances never quite will.",
      p3_4: "I think there's a strong case for mandatory incident reporting, along the lines of what we have in aviation, where near misses are logged and shared so the whole industry can learn from them. That said, there's a genuine tension with security, since publishing the precise details of a vulnerability could hand bad actors a blueprint. So a tiered approach seems sensible, full disclosure to regulators, and a more general account for the public.",
      p3_5: "Not on their own, no. Voluntary pledges have their place, they can establish norms quickly and signal good faith, but they're only as robust as the incentives behind them, and those incentives evaporate the moment a competitor gains an edge. Regulation, by contrast, has teeth. Having said that, the two aren't mutually exclusive; many of today's voluntary commitments could well become the blueprint for tomorrow's legislation.",
    },
  },
};

const only = process.argv[2];
for (const [level, { voice, instructions, clips }] of Object.entries(LEVELS).filter(([l]) => !only || l === only)) {
  const out = new URL(`../../apps/web/public/__probe/ai-${level}/`, import.meta.url);
  mkdirSync(out, { recursive: true });
  for (const [name, text] of Object.entries({ hello: "Hello.", ...clips })) {
    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini-tts", voice, input: text, response_format: "wav", instructions }),
    });
    if (!r.ok) throw new Error(`${level}/${name}: ${r.status} ${await r.text()}`);
    writeFileSync(new URL(`${name}.wav`, out), Buffer.from(await r.arrayBuffer()));
    process.stdout.write(`${level}/${name} `);
  }
}
