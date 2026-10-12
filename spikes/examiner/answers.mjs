// Records a simulated learner's answers for the coffee Speaking test (OpenAI TTS), for the in-browser room test.
import { readFileSync, writeFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(new URL("../../.env", import.meta.url), "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const out = new URL("../../apps/web/public/__probe/", import.meta.url);
const clips = {
  hello: "Hello.",
  name: "My name is Linh Tran.",
  p1_0: "I live in a quiet area near the river. What I like most is the park, because I can go walking there every evening and it's not so crowded.",
  p1_1: "Probably my bedroom, because it's where I study and also relax. I have a small desk next to the window, so there is a lot of natural light.",
  p1_2: "Yes, maybe. I would like to live closer to the city centre in the future, because it's more convenient for work and there are more things to do.",
  p1_3: "Mostly water and green tea. In the morning I usually have one coffee, it helps me to wake up before I start working.",
  p1_4: "Almost every day, but only one cup. If I drink more than that, I can't sleep well at night.",
  p1_5: "When I was a child I loved fresh orange juice. My grandmother used to make it for me every weekend.",
  p1_6: "Yes, I'd like to try making cold brew coffee at home. My friend told me it's quite easy, you just need time.",
  p1_7: "Usually in a café or sometimes at a friend's house. It depends on the weather and how much time we have.",
  p1_8: "I prefer outdoors when the weather is nice, because it feels more relaxing, but in winter indoors is better of course.",
  p1_9: "Yes, definitely. When I was at school we saw each other every day, but now everyone is busy with their jobs.",
  p1_10: "Yes, I would. I think spending time with friends is important for our mental health, so I try to make more plans.",
  lt_a: "I'd like to talk about a small café in Hanoi that I visited last year with my sister. It's in the old quarter, on a narrow street, and you have to climb some stairs to get there, so at first we almost missed it. We went there on a Sunday morning in spring, I think it was around April, and the weather was really pleasant.",
  lt_b: "Inside, it was decorated with old furniture and there were many plants, so it felt very calm compared to the busy street outside. We ordered egg coffee, which is a famous drink in Hanoi, and we sat by the window and watched the people and motorbikes below. We stayed there for almost two hours, just talking about our plans and our family.",
  lt_c: "How I felt about it, well, I felt very relaxed and a bit nostalgic, because it reminded me of the places my parents used to take me when I was young. I think it was one of the best mornings I had last year, and I would recommend it to anyone who visits the city.",
  ro: "Yes, I'd love to go back there, maybe with my parents next time.",
  p3_0: "I think people enjoy cafés because they are comfortable and not too formal. You can meet friends, work on your laptop or just sit alone and think, and nobody disturbs you.",
  p3_1: "Compared to restaurants, cafés are more flexible. You don't need to order a full meal and you can stay for a long time. Also, compared to people's homes, it's a neutral place, so it's easier for meeting new people.",
  p3_2: "I would say they are quite important. In my neighbourhood the local café is like a meeting point, people know each other there and they share news. So it helps to build a sense of community.",
  p3_3: "Mainly because they are consistent. You know exactly what you will get, the taste is the same in every city. And they are often in convenient locations, like train stations.",
  p3_4: "They could focus on what makes them different, for example local coffee beans or a special atmosphere. They can also use social media to show their story, because many young people care about supporting local businesses.",
  p3_5: "I think in the future people will expect cafés to be more environmentally friendly, for example less plastic cups. And maybe more cafés will be designed for people who work remotely, with good wifi and quiet areas.",
};
for (const [name, text] of Object.entries(clips)) {
  const r = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: "coral", input: text, response_format: "wav", instructions: "An adult Vietnamese learner of English at about IELTS band 6: clear, slightly careful, natural pace, a few natural hesitations." }),
  });
  if (!r.ok) throw new Error(`${name}: ${r.status} ${await r.text()}`);
  writeFileSync(new URL(`${name}.wav`, out), Buffer.from(await r.arrayBuffer()));
  process.stdout.write(`${name} `);
}
