"""Render the same IELTS Listening Part 1 dialogue with Kokoro (local) and OpenAI TTS.

Usage: .venv/bin/python render.py [kokoro|openai|all]
Writes out/kokoro-part1.wav and out/openai-part1.wav.
"""
import io
import os
import sys
import time
from pathlib import Path

import numpy as np
import soundfile as sf

HERE = Path(__file__).parent
OUT = HERE / "out"
OUT.mkdir(exist_ok=True)
RATE = 24000

# (speaker, line). Includes a spelled surname, a postcode, numbers and a self-correction distractor.
DIALOGUE = [
    ("woman", "Good morning, Riverside Sports Centre. How can I help you?"),
    ("man", "Hi, yes. I'd like to join the swimming club, please."),
    ("woman", "Certainly. Can I take your surname first?"),
    ("man", "It's Fitzgerald. That's F, I, T, Z, G, E, R, A, L, D."),
    ("woman", "Thank you. And your postcode?"),
    ("man", "B S 8, 4 Q R."),
    ("woman", "Lovely. Membership is forty-two pounds fifty a month, or four hundred and twenty pounds for the year."),
    ("man", "I'll pay monthly. Oh, and I'd like to swim on Tuesday evenings. Actually, sorry, Thursday would suit me better."),
]

KOKORO_VOICES = {"woman": "bf_emma", "man": "bm_george"}
OPENAI_VOICES = {"woman": "coral", "man": "ash"}
OPENAI_MODEL = "gpt-4o-mini-tts-2025-12-15"
OPENAI_INSTRUCTIONS = (
    "You are a voice actor recording an IELTS listening test. Speak with a standard Southern British "
    "English (RP) accent, at a natural, moderate pace. Read the text exactly as written. When letters are "
    "separated by commas, spell them out one by one."
)


def gap(seconds: float) -> np.ndarray:
    return np.zeros(int(RATE * seconds), dtype=np.float32)


def render_kokoro() -> None:
    from kokoro import KPipeline

    pipe = KPipeline(lang_code="b")  # British English
    parts, t0 = [], time.time()
    for speaker, line in DIALOGUE:
        for _, _, audio in pipe(line, voice=KOKORO_VOICES[speaker], speed=1.0):
            parts.append(np.asarray(audio, dtype=np.float32))
        parts.append(gap(0.5))
    audio = np.concatenate(parts)
    sf.write(OUT / "kokoro-part1.wav", audio, RATE)
    print(f"kokoro: {len(audio) / RATE:.1f}s audio in {time.time() - t0:.1f}s")


def render_openai() -> None:
    import json
    import urllib.request

    key = os.environ["OPENAI_API_KEY"]
    parts, t0 = [], time.time()
    for speaker, line in DIALOGUE:
        body = json.dumps({
            "model": OPENAI_MODEL,
            "voice": OPENAI_VOICES[speaker],
            "input": line,
            "instructions": OPENAI_INSTRUCTIONS,
            "response_format": "wav",
        }).encode()
        req = urllib.request.Request(
            "https://api.openai.com/v1/audio/speech",
            data=body,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req) as resp:
            audio, rate = sf.read(io.BytesIO(resp.read()), dtype="float32")
        assert rate == RATE, rate
        parts += [audio, gap(0.5)]
    audio = np.concatenate(parts)
    sf.write(OUT / "openai-part1.wav", audio, RATE)
    print(f"openai: {len(audio) / RATE:.1f}s audio in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    if which in ("kokoro", "all"):
        render_kokoro()
    if which in ("openai", "all"):
        render_openai()
