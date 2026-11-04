<p align="center">
  <img src="apps/web/public/branding/emblem-ielts-four-skills.svg" alt="" width="80" />
</p>

<h1 align="center">IELTS Anything</h1>

<p align="center"><strong>IELTS practice about things you actually care about.</strong><br/>
Same exam format. Far fewer passages about the history of the bicycle.</p>

<p align="center"><img src="docs/screenshots/home.png" alt="Home: what do you want to practise?" width="85%" /></p>

Let's be honest: IELTS prep has a reputation. Dusty passages about soil erosion, lectures on 18th-century canal engineering, and a mysterious obsession with library opening hours. You could learn English from all that. You could also learn to love dry toast.

IELTS Anything writes the test around *you*. Into football, K-pop, space, cooking or the latest AI drama? Type it in, and you get a proper Cambridge-format paper on that topic: same question types, same timing, same "wait, is that FALSE or NOT GIVEN?" panic. The exam is still the exam. It's just about something you'd read anyway.

Under the hood, Codex writes the paper in the exact format of Cambridge IELTS 12–21, double-checks every answer, and opens it in a screen that looks like the computer-delivered test. You get a band score and feedback that actually tells you what to fix. It all runs on your own computer, with your own Codex subscription.

## The four skills, minus the yawning

**Reading.** Three passages, 40 questions, every Cambridge question type, on whatever rabbit hole you're in this week. Before you see a test, a second AI sits it blind, and any question it argues with gets fixed. When you're done, the review highlights exactly where each answer was hiding.

<p align="center"><img src="docs/screenshots/reading-review.png" alt="Reading review with the evidence highlighted" width="85%" /></p>

**Listening.** Four fully voiced parts, with a narrator, reading time, forms and maps, about your topic instead of somebody's lost umbrella. Exam mode plays once, no mercy. Practice mode lets you rewind as often as your pride allows. Afterwards, click any question to hear the exact moment the answer flew past you.

<table><tr>
<td><img src="docs/screenshots/listening-map.png" alt="Listening map labelling" /></td>
<td><img src="docs/screenshots/listening-review.png" alt="Listening review with transcript" /></td>
</tr></table>

**Writing.** Charts, maps and process diagrams for Task 1, and essay questions for Task 2, about things you have opinions on. Marked against the official band descriptors, criterion by criterion, quoting your own sentences back to you (lovingly).

<table><tr>
<td><img src="docs/screenshots/writing.png" alt="Writing Task 1 with a process diagram" /></td>
<td><img src="docs/screenshots/writing-results.png" alt="Writing results by criterion" /></td>
</tr></table>

**Speaking.** A live interview with a voice examiner who asks about your interests, not your hometown's public transport, for the fifth time. Parts 1–3, a timed cue card, and a band from the examiner who actually heard you.

<table><tr>
<td><img src="docs/screenshots/speaking.png" alt="Speaking room" /></td>
<td><img src="docs/screenshots/chat.png" alt="Chat with a score card" /></td>
</tr></table>

Short on time? Every skill also comes as a drill: one passage, one part, one task, or just the question type that keeps beating you. Progress keeps score, including which question types are your nemesis.

<p align="center"><img src="docs/screenshots/progress.png" alt="Progress page" width="85%" /></p>

## Who's talking in Listening

<img src="docs/screenshots/settings-voices.png" alt="Listening voice settings" width="420" align="right" />

Every Listening test gets its own cast: a calm British narrator, a chatty receptionist, a tour guide who loves the word "now", and the odd American.

- **Kokoro** (default): free, and runs on your computer. British and American voices. A 90 MB voice model downloads the first time.
- **OpenAI** (optional): bring your own API key for `gpt-4o-mini-tts`. Smoother voices, plus Australian and New Zealand accents, for about 40 cents per full test.

<br clear="right"/>

## Quick start

You'll need **Node.js 22.13+** and the **Codex CLI**, signed in (`codex login`).

```bash
git clone https://github.com/RyanNg1403/ielts-anything.git
cd ielts-anything
npm install
npm run dev        # then open http://127.0.0.1:5173
```

Then type something like *"a Listening test about my favourite football club"* and go make a cup of tea.

Your tests and scores live in `~/.ielts-anything`, well away from your Codex coding history.

## How it works (for the curious)

The tutor follows the rulebooks in [`skills/`](skills): one each for writing passages, writing questions, checking answer keys, writing scripts and marking. It can't just paste a test into the chat. Everything goes through app tools that check it against the Cambridge format and send it back until it passes. [`packages/spec`](packages/spec) holds the shared schemas, checks and marking. Answers and scripts stay hidden on the server until you hand your paper in. No peeking.

```
apps/server     Codex bridge, app tools, marking, Listening audio
apps/web        Chat, test screens, results, progress, settings
packages/spec   Schemas, validators, instructions, marking (npm test)
skills          The tutor's rulebooks and Writing reference drawings
research        Format research and sources
```

Environment overrides (`.env`): `IELTS_HOME`, `IELTS_MODEL`, `IELTS_EFFORT`, `IELTS_VOICE`, `IELTS_EXAMINER_VOICE`, `PORT`.

## The small print (serious bit, we promise)

This is practice in the Cambridge format, not an official test, and it isn't affiliated with IELTS, the British Council, IDP or Cambridge. The repository contains only counts, rules and paraphrases from studying Cambridge IELTS 12–21, never the books, passages, scripts or audio. Band scores are estimates: great for practice, not something to show your visa officer.

MIT licence, as declared in `package.json`.
