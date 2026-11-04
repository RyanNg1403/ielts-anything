<p align="center">
  <img src="apps/web/public/branding/emblem-ielts-four-skills.svg" alt="" width="80" />
</p>

<h1 align="center">IELTS Anything</h1>

<p align="center"><strong>IELTS Academic practice on any topic you like.</strong><br/>
Type a topic; get a test that looks, sounds and marks like a Cambridge IELTS paper.</p>

<p align="center"><img src="docs/screenshots/home.png" alt="Home: what do you want to practise?" width="85%" /></p>

Ask for *a Reading test on how AI labs are governed* or *a Listening drill about booking a climbing course*. The tutor (Codex) writes it in the exact format of Cambridge IELTS 12–21, checks every answer, and opens it in a screen modelled on computer-delivered IELTS. You get a band score and feedback. It runs locally on your own Codex subscription.

## Four skills

**Reading**: three passages, 40 questions, every Cambridge question type. An independent solver sits the paper without the key before you see it; review shows the evidence in the passage.

<p align="center"><img src="docs/screenshots/reading-review.png" alt="Reading review with the evidence highlighted" width="85%" /></p>

**Listening**: four recorded parts with a narrator and reading time, maps and forms. Exam mode plays once; practice mode lets you replay. Review shows the transcript and jumps the audio to each answer.

<table><tr>
<td><img src="docs/screenshots/listening-map.png" alt="Listening map labelling" /></td>
<td><img src="docs/screenshots/listening-review.png" alt="Listening review with transcript" /></td>
</tr></table>

**Writing**: Task 1 figures (charts, tables, maps, processes) and Task 2 essays, marked criterion by criterion against the official descriptors, quoting your own sentences.

<table><tr>
<td><img src="docs/screenshots/writing.png" alt="Writing Task 1 with a process diagram" /></td>
<td><img src="docs/screenshots/writing-results.png" alt="Writing results by criterion" /></td>
</tr></table>

**Speaking**: a live interview with a voice examiner (Parts 1–3, timed cue card), marked by the examiner who heard you.

<table><tr>
<td><img src="docs/screenshots/speaking.png" alt="Speaking room" /></td>
<td><img src="docs/screenshots/chat.png" alt="Chat with a score card" /></td>
</tr></table>

Every skill also comes as a drill: one passage, part, task or question type. Progress tracks your bands and weakest question types.

<p align="center"><img src="docs/screenshots/progress.png" alt="Progress page" width="85%" /></p>

## Listening voices

<img src="docs/screenshots/settings-voices.png" alt="Listening voice settings" width="420" align="right" />

- **Kokoro** (default): free and local. British and American voices; a 90 MB model downloads once.
- **OpenAI** (optional): your own API key, `gpt-4o-mini-tts`. Adds Australian and New Zealand accents, about 40 cents per full test.

<br clear="right"/>

## Quick start

Requires **Node.js 22.13+** and the **Codex CLI**, signed in (`codex login`).

```bash
git clone https://github.com/RyanNg1403/ielts-anything.git
cd ielts-anything
npm install
npm run dev        # then open http://127.0.0.1:5173
```

Data lives in `~/.ielts-anything`, separate from your Codex coding history.

## How it works

The tutor follows the skills in [`skills/`](skills) and publishes through app tools that validate every passage, part and task against the format; [`packages/spec`](packages/spec) holds the shared schemas, validators and marking. Answers and scripts stay on the server until you submit.

```
apps/server     Codex bridge, app tools, marking, Listening audio
apps/web        Chat, test screens, results, progress, settings
packages/spec   Schemas, validators, instructions, marking (npm test)
skills          The tutor's skills and Writing reference drawings
research        Format research and sources
```

Environment overrides (`.env`): `IELTS_HOME`, `IELTS_MODEL`, `IELTS_EFFORT`, `IELTS_VOICE`, `IELTS_EXAMINER_VOICE`, `PORT`.

## About Cambridge and IELTS

This is Cambridge-format practice, not official tests, and is not affiliated with IELTS, the British Council, IDP or Cambridge. The repository publishes only counts, rules and paraphrases from studying Cambridge IELTS 12–21, never the books, passages, scripts or audio. Band scores are estimates.

MIT licence, as declared in `package.json`.
