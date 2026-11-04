<p align="center">
  <img src="apps/web/public/branding/emblem-ielts-four-skills.svg" alt="" width="80" />
</p>

<h1 align="center">IELTS Anything</h1>

<p align="center"><strong>ielts prep, minus the soil erosion 🫩</strong></p>

be so fr, nobody locks in for a 900-word passage on soil erosion 🥀 and the listening where a guy spends four minutes getting a library card? we're cooked 😭

IELTS Anything writes the test about stuff you'd doomscroll anyway: football, K-pop, F1, whatever AI drama dropped this week. it's a real Cambridge-format paper, same question types, same timing, same FALSE vs NOT GIVEN spiral. the topic just isn't mid anymore ✌️

## Quickstart ⚡

```bash
git clone https://github.com/RyanNg1403/ielts-anything.git
cd ielts-anything && npm install && npm run dev
```

Open http://127.0.0.1:5173, type *"a Listening test about my fave football club"*, go touch grass for a sec 🌱

## What it does 👀

**Ask for literally anything.** Pick a topic and a skill. Full test or a quick drill, your call.

<img src="docs/screenshots/home.png" alt="Home: what do you want to practise?" />

**Reading 📖** Three passages, 40 questions. A second AI takes every test blind first and snitches on any dodgy question before you ever see it. The review shows exactly where each answer was hiding 🔍

<img src="docs/screenshots/reading-review.png" alt="Reading review with the evidence highlighted" />

**Listening 🎧** Four fully voiced parts with a narrator, forms and maps. Exam mode plays once, zero mercy 💀 Practice mode lets you rewind as many times as your ego can handle.

<img src="docs/screenshots/listening-map.png" alt="Listening map labelling" />

**Listening review 🔁** Tap a question and hear the exact second the answer flew past you. Painful. Educational. Mostly painful 😭

<img src="docs/screenshots/listening-review.png" alt="Listening review with transcript" />

**Writing ✍️** Charts, maps and process diagrams for Task 1. Essay questions you actually have takes on for Task 2.

<img src="docs/screenshots/writing.png" alt="Writing Task 1 with a process diagram" />

**Writing feedback 🧾** Marked against the official band descriptors, one criterion at a time, quoting your own sentences back at you. With love. Mostly 😏

<img src="docs/screenshots/writing-results.png" alt="Writing results by criterion" />

**Speaking 🎙️** A live interview with a voice examiner who asks about your interests, not your hometown's bus routes for the fifth time 🫠

<img src="docs/screenshots/speaking.png" alt="Speaking room" />

**Your tutor, in the chat 💬** Scores pop up right there. Ask "why was 7 wrong??" or "another one like that but harder" and it just does it.

<img src="docs/screenshots/chat.png" alt="Chat with a score card" />

**Progress 📈** Your bands over time, plus which question type is your villain origin story.

<img src="docs/screenshots/progress.png" alt="Progress page" />

**Pick the voices 🗣️** Free voices that run on your laptop, or OpenAI's if you've got a key.

<img src="docs/screenshots/settings-voices.png" alt="Listening voice settings" width="460" />

## Install and nerd stuff 🤓

**You need:** Node.js 22.13+ and the [Codex CLI](https://developers.openai.com/codex), signed in with `codex login`. It runs on your own Codex subscription and keeps its data in `~/.ielts-anything`, away from your coding history.

**Listening voices** (Settings):
- **Kokoro** (default): free, runs locally, British and American voices. A 90 MB model downloads the first time.
- **OpenAI**: bring your own API key for `gpt-4o-mini-tts`. Smoother voices, plus Australian and New Zealand accents, about 40 cents per full test 💸

**How it works:** Codex writes each test following the rulebooks in [`skills/`](skills), then publishes it through app tools that keep sending it back until it matches the Cambridge 12–21 format. [`packages/spec`](packages/spec) holds the schemas, checks and marking. Answers and scripts stay hidden on the server until you submit. No peeking 🙅

```
apps/server     Codex bridge, app tools, marking, Listening audio
apps/web        Chat, test screens, results, progress, settings
packages/spec   Schemas, validators, marking (npm test)
skills          The tutor's rulebooks and Writing reference drawings
research        Format research and sources
```

**Env overrides** (`.env`): `IELTS_HOME`, `IELTS_MODEL`, `IELTS_EFFORT`, `IELTS_VOICE`, `IELTS_EXAMINER_VOICE`, `PORT`.

**Dev:** `npm test`, `npm run typecheck`, and `npx tsx apps/server/scripts/render-listening.ts` to hear the voices.

**The serious bit (sorry) 🧐** This is Cambridge-format practice, not official tests, and it isn't affiliated with IELTS, the British Council, IDP or Cambridge. The repo contains only counts, rules and paraphrases from studying Cambridge IELTS 12–21, never the books, passages, scripts or audio. Band scores are estimates: great for practice, not for your visa officer. MIT licence.
