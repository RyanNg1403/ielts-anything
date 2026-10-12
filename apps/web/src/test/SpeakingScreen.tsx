// The Speaking room: microphone check, then a live voice examiner (Codex realtime over WebRTC)
// runs Parts 1-3. The room keeps time and tells the examiner when a part is over; the examiner's
// fixed sentences tell the room when a part starts. Afterwards the transcript is marked.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  examinerSelfAnswers,
  heardSignal,
  SPEAKING_PART_MINUTES,
  type CueCard,
  type SpeakingMetrics,
  type SpeakingPartNumber,
  type SpeakingResult,
  type TranscriptLine,
} from "@ielts/spec";
import { invalidate, isMarking, useTest, type SpeakingPayload } from "../data.ts";
import { exitTest } from "../router.ts";
import { ConfirmDialog } from "../components/ConfirmDialog.tsx";
import { partsLabel, speakingOutline } from "../components/cards/SpeakingCards.tsx";
import { SpeakingResults } from "./SpeakingResults.tsx";

const PREP_SECONDS = 60;
const TALK_SECONDS = 120;
/** A part is wrapped up a little before its planned length, so the whole test stays within 11-14 minutes. */
const partLimit = (p: SpeakingPartNumber) => (SPEAKING_PART_MINUTES[p] - 0.5) * 60;
/** Silence after which a Part 2 talk of at least a minute counts as finished. */
const TALK_DONE_SILENCE = 7;
const VOICE_LEVEL = 0.06;

type Stage = "check" | "connecting" | "live" | "prep" | "talk" | "assessing" | "submitting" | "dropped";
/** How long to wait for the examiner's private assessment before submitting without it. */
const ASSESS_TIMEOUT = 300_000;

export function SpeakingScreen({ data }: { data: SpeakingPayload }) {
  if (data.attempt && !isMarking(data.attempt)) return <SpeakingResults data={data} result={data.attempt.result as SpeakingResult} />;
  if (data.attempt) return <Marking data={data} />;
  return <Room data={data} />;
}

/** While the examiner assesses (live: the voice session is still open) and while the result is saved. */
function Marking({ data, live, onLeave }: { data: SpeakingPayload; live?: boolean; onLeave?: () => void }) {
  const { reload } = useTest(data.id);
  useEffect(() => {
    if (live) return;
    const t = setInterval(reload, 3000);
    return () => clearInterval(t);
  }, [reload, live]);
  const back = () => exitTest(data.conversationId ? { name: "chat", id: data.conversationId } : { name: "tests" });
  return (
    <Shell title={data.test.title} onExit={onLeave ?? back} exitLabel="Back">
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <Orb level={0.15} active pulse />
        <p className="font-serif text-[24px] text-ink">Marking your speaking</p>
        <p className="max-w-sm text-[15px] text-ink-soft">
          {live ? "The examiner is deciding your bands. Please stay on this page." : "Almost done. You can leave; the result will appear in your chat."}
        </p>
      </div>
    </Shell>
  );
}

function Room({ data }: { data: SpeakingPayload }) {
  const { parts, minutes } = speakingOutline(data.test);
  const [stage, setStage] = useState<Stage>("check");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [part, setPart] = useState<SpeakingPartNumber>(parts[0]!);
  const [card, setCard] = useState<CueCard | null>(null);
  const [caption, setCaption] = useState("");
  const [started, setStarted] = useState(false); // the examiner has spoken
  const [clock, setClock] = useState(0); // seconds left in prep or talk
  const [notes, setNotes] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState({ me: 0, examiner: 0 });
  const [micError, setMicError] = useState<string | null>(null);
  const [heard, setHeard] = useState(false);
  const [askingMic, setAskingMic] = useState(false);
  const [muted, setMuted] = useState(false);

  // Everything the event handlers need, without re-subscribing.
  const r = useRef({
    mic: null as MediaStream | null,
    ctx: null as AudioContext | null,
    pc: null as RTCPeerConnection | null,
    dc: null as RTCDataChannel | null,
    audio: null as HTMLAudioElement | null,
    events: null as EventSource | null,
    sessionId: null as string | null,
    meters: { me: () => 0, examiner: () => 0 } as { me: () => number; examiner: () => number },
    part: parts[0]! as SpeakingPartNumber,
    stage: "check" as Stage,
    transcript: [] as TranscriptLine[],
    partStart: {} as Record<number, number>,
    partEnd: {} as Record<number, number>,
    talkStart: 0,
    talkEnd: 0,
    pauses: 0,
    lastVoice: 0,
    partCueSent: {} as Record<number, boolean>,
    prepStarted: false,
    assessing: false,
    assessedAt: 0,
    examinerSaid: "",
    /** When the examiner last said part of its assessment, and how often it was asked to go on. */
    assessedLastAt: 0,
    assessNudges: 0,
    /** The examiner was asked to check its bands once its assessment was complete. */
    checkAsked: false,
    examinerAt: 0,
    lastExaminerTurn: "",
    stallNudged: false,
    /** The examiner was already told off for answering its own question in this turn. */
    selfAnswerNoted: false,
    micToken: 0,
    /** The learner switched their microphone off for a moment; the test carries on. */
    muted: false,
    finished: false,
    startedAt: 0,
    /** The interview audio (both voices), for playback on the results page. */
    recorder: null as MediaRecorder | null,
    recording: null as Promise<Blob | null> | null,
  });
  r.current.part = part;
  r.current.stage = stage;

  // ---- microphone check ----
  const getMic = useCallback(async () => {
    setMicError(null);
    const token = ++r.current.micToken;
    setAskingMic(true);
    try {
      const mic = await navigator.mediaDevices
        .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
        .finally(() => token === r.current.micToken && setAskingMic(false));
      // A newer request (or leaving the room) superseded this one.
      if (token !== r.current.micToken) return mic.getTracks().forEach((t) => t.stop());
      const ctx = new AudioContext();
      r.current.mic = mic;
      r.current.ctx = ctx;
      r.current.meters.me = meter(ctx, mic);
    } catch (err) {
      setMicError((err as Error).name === "NotAllowedError" ? "Allow microphone access in your browser, then try again." : "No microphone was found. Connect one and try again.");
    }
  }, []);

  useEffect(() => {
    getMic();
    return () => teardown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Levels for the meter and orb (animation frames, so only while the room is visible).
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setLevel({ me: r.current.meters.me(), examiner: r.current.meters.examiner() });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // When the learner last spoke, and long pauses in the Part 2 talk. A timer rather than animation
  // frames, which stop when the tab is in the background and would make the room think they went quiet.
  useEffect(() => {
    const t = setInterval(() => {
      // Muted time is neither speech nor silence: it never ends a talk or counts as a pause.
      if (r.current.muted) return void (r.current.lastVoice = performance.now() / 1000);
      if (r.current.meters.me() <= VOICE_LEVEL) return;
      if (r.current.stage === "check") setHeard(true);
      const now = performance.now() / 1000;
      if (r.current.stage === "talk" && r.current.lastVoice && now - r.current.lastVoice >= 3) r.current.pauses += 1;
      r.current.lastVoice = now;
    }, 100);
    return () => clearInterval(t);
  }, []);

  // ---- talking to the examiner ----
  const send = (event: unknown) => {
    const dc = r.current.dc;
    if (dc?.readyState === "open") dc.send(JSON.stringify(event));
  };
  const note = (text: string) => send({ type: "session.context.append", content: [{ type: "input_text", text: `[App] ${text}` }] });
  /** Close the learner's current turn so the examiner responds to the note now. */
  const nudge = () => {
    send({ type: "input_audio.pause" });
    setTimeout(() => send({ type: "input_audio.resume" }), 400);
  };

  const enterPart = (p: SpeakingPartNumber) => {
    const now = Date.now();
    const prev = r.current.part;
    if (prev !== p && r.current.partStart[prev]) r.current.partEnd[prev] = now;
    r.current.partStart[p] ??= now;
    r.current.part = p;
    setPart(p);
  };

  const start = async () => {
    const { mic, ctx } = r.current;
    if (!mic || !ctx) return;
    setStage("connecting");
    setError(null);
    try {
      await ctx.resume();
      const pc = new RTCPeerConnection();
      // The examiner's voice only moves forward while audio is arriving; perfect digital silence (a muted
      // or heavily noise-suppressed mic) stalls it mid-sentence. Mix in a noise floor far below speech.
      const out = ctx.createMediaStreamDestination();
      ctx.createMediaStreamSource(mic).connect(out);
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer(ctx);
      noise.loop = true;
      noise.connect(out);
      noise.start();
      pc.addTrack(out.stream.getAudioTracks()[0]!, out.stream);
      // The recording mixes the learner's microphone with the examiner's voice.
      const tape = ctx.createMediaStreamDestination();
      ctx.createMediaStreamSource(mic).connect(tape);
      const dc = pc.createDataChannel("oai-events");
      const audio = new Audio();
      audio.autoplay = true;
      pc.ontrack = (e) => {
        const stream = e.streams[0] ?? new MediaStream([e.track]);
        audio.srcObject = stream;
        audio.play().catch(() => {});
        r.current.meters.examiner = meter(ctx, stream);
        ctx.createMediaStreamSource(stream).connect(tape);
      };
      pc.onconnectionstatechange = () => {
        if ((pc.connectionState === "failed" || pc.connectionState === "disconnected") && !r.current.finished) dropped("The connection to the examiner was lost.");
      };
      Object.assign(r.current, { pc, dc, audio });

      await pc.setLocalDescription(await pc.createOffer());
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") return resolve();
        pc.onicegatheringstatechange = () => pc.iceGatheringState === "complete" && resolve();
        setTimeout(resolve, 2500);
      });
      const res = await fetch(`/api/tests/${data.id}/speaking`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sdp: pc.localDescription!.sdp }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "The examiner could not join.");
      r.current.sessionId = body.sessionId;
      setCard(body.card);
      listen(body.sessionId);
      await pc.setRemoteDescription({ type: "answer", sdp: body.sdp });
      r.current.startedAt = Date.now();
      startRecording(tape.stream);
      enterPart(parts[0]!);
      setStage("live");
    } catch (err) {
      teardown();
      await getMic();
      setStage("check");
      setError((err as Error).message);
    }
  };

  const listen = (sessionId: string) => {
    const es = new EventSource(`/api/speaking/${sessionId}/events`);
    r.current.events = es;
    // Codex sends one examiner turn as several transcript pieces; the caption shows the whole turn.
    let turn = "";
    let piece = "";
    es.onmessage = (m) => {
      const e = JSON.parse(m.data);
      if (e.role === "candidate" && (e.type === "delta" || e.type === "done")) {
        turn = "";
        piece = "";
        r.current.selfAnswerNoted = false;
      }
      // After the test the examiner speaks its assessment privately: keep it out of the caption and transcript.
      if (r.current.assessing) {
        if (e.type === "delta" && e.role === "examiner") r.current.assessedLastAt = Date.now();
        // Marking cannot go on without the session: submit what was said.
        if ((e.type === "closed" || e.type === "error") && !r.current.finished) return void finish();
        if (e.type === "done" && e.text?.trim()) {
          // The learner's last answer can finish transcribing after the test has closed.
          if (e.role === "candidate") r.current.transcript.push({ role: "candidate", part: r.current.part, text: e.text.trim() });
          else {
            // The piece with the closing sentence also carries the test speech before it: that is transcript, not assessment.
            const [test, rest] = splitAtEnd(e.text.trim());
            if (rest === null) onAssessment(test);
            else {
              r.current.transcript.push({ role: "examiner", part: r.current.part, text: test });
              if (rest) onAssessment(rest);
            }
          }
        }
        return;
      }
      if (e.type === "delta" && e.role === "examiner") {
        piece += e.delta;
        // Mute as soon as the closing sentence is heard: what follows is for the app only.
        if (heardSignal(join(turn, piece), "end")) return startAssessing();
        setCaption(join(turn, piece));
        setStarted(true);
        r.current.examinerAt = Date.now();
      } else if (e.type === "done") {
        if (!e.text?.trim()) return;
        const role = e.role as TranscriptLine["role"];
        // The closing sentence and the start of the assessment can arrive as one piece.
        const [text, after] = role === "examiner" ? splitAtEnd(e.text.trim()) : [e.text.trim(), null];
        const rest = after ?? "";
        r.current.transcript.push({ role, part: r.current.part, text });
        if (role === "examiner") {
          turn = join(turn, text);
          piece = "";
          setCaption(turn);
          setStarted(true);
          r.current.examinerAt = Date.now();
          r.current.lastExaminerTurn = turn;
          r.current.stallNudged = false;
          // The examiner went on to answer its own question: stop it before the next one.
          if (!r.current.assessing && !r.current.selfAnswerNoted && examinerSelfAnswers([{ role: "examiner", part: r.current.part, text: turn }]).length) {
            r.current.selfAnswerNoted = true;
            note("Do not answer your own questions or speak for the candidate. Ask your next question, then wait in silence for the candidate's answer.");
          }
          onExaminer(turn);
          if (r.current.assessing && rest) onAssessment(rest);
        } else {
          r.current.lastExaminerTurn = "";
        }
      } else if (e.type === "closed" && !r.current.finished) {
        dropped("The examiner's session ended unexpectedly.");
      } else if (e.type === "error" && !r.current.finished) {
        dropped(e.message);
      }
    };
  };

  /** Follow the parts from what the examiner says. */
  const onExaminer = (text: string) => {
    const { part: p, stage: s } = r.current;
    if (heardSignal(text, "end")) return startAssessing();
    if (!r.current.prepStarted && heardSignal(text, "part2") && parts.includes(2)) {
      r.current.prepStarted = true;
      enterPart(2);
      // The candidate prepares in silence; keep background noise from reaching the examiner.
      send({ type: "input_audio.pause" });
      setStage("prep");
      setClock(PREP_SECONDS);
      return;
    }
    if (p !== 3 && s !== "prep" && s !== "talk" && heardSignal(text, "part3") && parts.includes(3)) enterPart(3);
  };

  const startTalk = () => {
    if (r.current.stage !== "prep") return;
    send({ type: "input_audio.resume" });
    note("Preparation time is over. The candidate is now giving their talk. Stay completely silent until a note says the talk is over.");
    r.current.talkStart = Date.now();
    r.current.lastVoice = performance.now() / 1000;
    r.current.pauses = 0;
    setStage("talk");
    setClock(TALK_SECONDS);
  };

  const endTalk = (why: "time" | "finished") => {
    if (r.current.stage !== "talk") return;
    r.current.talkEnd = Date.now();
    note(
      why === "time"
        ? "The two minutes are up. Stop the candidate politely now: say \"Thank you.\" and continue as planned."
        : "The candidate has finished their talk. Say \"Thank you.\" and continue as planned.",
    );
    nudge();
    setStage("live");
  };

  // Countdowns for preparation and the talk; finish the talk early after a long silence.
  useEffect(() => {
    if (stage !== "prep" && stage !== "talk") return;
    const t = setInterval(() => {
      setClock((c) => {
        if (c <= 1) {
          if (r.current.stage === "prep") startTalk();
          else endTalk("time");
          return 0;
        }
        return c - 1;
      });
      if (r.current.stage === "talk") {
        const spoke = (Date.now() - r.current.talkStart) / 1000;
        const quiet = performance.now() / 1000 - r.current.lastVoice;
        if (spoke >= 60 && quiet >= TALK_DONE_SILENCE) endTalk("finished");
      }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // Keep Parts 1 and 3 to time: tell the examiner to move on.
  useEffect(() => {
    if (stage !== "live") return;
    const t = setInterval(() => {
      const p = r.current.part;
      // The examiner stopped without asking anything and nobody has spoken since: prompt it to go on.
      const c = r.current;
      const quietFor = Math.min(Date.now() - c.examinerAt, performance.now() - c.lastVoice * 1000);
      if (c.lastExaminerTurn && !c.stallNudged && !/\?\s*$/.test(c.lastExaminerTurn) && !heardSignal(c.lastExaminerTurn, "end") && quietFor > 6000) {
        c.stallNudged = true;
        note("The candidate is waiting for you. Continue now with your next question.");
        nudge();
      }
      // After the talk: if the examiner's Part 3 opening (or goodbye) was not recognised, move on anyway.
      if (p === 2 && r.current.talkEnd && (Date.now() - r.current.talkEnd) / 1000 > 75) {
        if (parts.includes(3)) enterPart(3);
        else if (!r.current.partCueSent[2]) {
          r.current.partCueSent[2] = true;
          note("Time is up. End the test now.");
          nudge();
        }
        return;
      }
      const since = r.current.partStart[p];
      if (p === 2 || !since || r.current.partCueSent[p] || (Date.now() - since) / 1000 < partLimit(p)) return;
      r.current.partCueSent[p] = true;
      const last = parts[parts.length - 1] === p;
      note(last ? "Time is up. When the candidate finishes this answer, end the test." : "Part 1 is over. When the candidate finishes this answer, move on to Part 2.");
    }, 2000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const startRecording = (stream: MediaStream) => {
    const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
    if (!type) return;
    const recorder = new MediaRecorder(stream, { mimeType: type, audioBitsPerSecond: 48_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.current.recording = new Promise((resolve) => {
      recorder.onstop = () => resolve(chunks.length ? new Blob(chunks, { type: recorder.mimeType }) : null);
      recorder.onerror = () => resolve(null);
    });
    recorder.start(5000);
    r.current.recorder = recorder;
  };

  /** Recording stops when the interview does, so the examiner's private assessment is never on it. */
  const stopRecording = () => {
    if (r.current.recorder?.state === "recording") r.current.recorder.stop();
  };

  const dropped = (message: string) => {
    stopRecording();
    teardown(true);
    setError(message);
    setStage("dropped");
  };

  function teardown(keepMic = false) {
    const c = r.current;
    if (!keepMic) c.micToken++;
    c.events?.close();
    c.events = null;
    c.pc?.close();
    c.pc = null;
    c.dc = null;
    if (c.audio) c.audio.srcObject = null;
    c.meters.examiner = () => 0;
    if (c.sessionId) fetch(`/api/speaking/${c.sessionId}`, { method: "DELETE" }).catch(() => {});
    c.sessionId = null;
    if (!keepMic) {
      c.mic?.getTracks().forEach((t) => t.stop());
      c.mic = null;
      c.ctx?.close().catch(() => {});
      c.ctx = null;
      c.meters.me = () => 0;
    }
  }

  /** Switch the microphone off and on. The examiner just hears nothing and waits; timers keep running. */
  const toggleMute = () => {
    const c = r.current;
    if (c.assessing || c.finished) return;
    c.muted = !c.muted;
    c.mic?.getAudioTracks().forEach((t) => (t.enabled = !c.muted));
    setMuted(c.muted);
  };

  /** The test is over: mute the examiner and the learner, and listen for the examiner's assessment. */
  const startAssessing = () => {
    const c = r.current;
    if (c.assessing || c.finished) return;
    c.assessing = true;
    c.assessedAt = Date.now();
    stopRecording();
    if (c.audio) c.audio.muted = true;
    c.mic?.getAudioTracks().forEach((t) => (t.enabled = false));
    setStage("assessing");
    // If the examiner stops after the closing sentence, ask for the assessment.
    setTimeout(() => {
      if (c.assessing && !c.finished && !c.examinerSaid) {
        note("The test is over. Give your assessment now, in the format you were given.");
        nudge();
      }
    }, 15_000);
    // The examiner sometimes stops partway through its assessment: ask it to go on.
    const resume = setInterval(() => {
      if (!c.assessing || c.finished) return clearInterval(resume);
      if (!c.examinerSaid || Date.now() - c.assessedLastAt < 12_000 || c.assessNudges >= 3) return;
      c.assessNudges++;
      c.assessedLastAt = Date.now();
      note(c.checkAsked ? "Say your final bands now, in the exact format, ending with \"End of check.\"" : "Continue your assessment exactly where you stopped, in the same format, and finish with \"End of assessment.\"");
      nudge();
    }, 3_000);
    setTimeout(() => c.assessing && !c.finished && finish(), ASSESS_TIMEOUT);
  };

  const onAssessment = (text: string) => {
    const c = r.current;
    c.assessedLastAt = Date.now();
    c.examinerSaid = join(c.examinerSaid, text);
    if (/end of check/i.test(c.examinerSaid)) return void setTimeout(() => finish(), 1000);
    // A second, final look at the bands against the descriptors steadies the marks.
    if (!c.checkAsked && /end of (the )?assessment/i.test(c.examinerSaid)) {
      c.checkAsked = true;
      note("Now check your bands as described, then say the final bands in the exact format, ending with \"End of check.\"");
      nudge();
    }
  };

  /** "End test": the examiner closes the test and still gives its assessment of what it heard. */
  const endEarly = () => {
    if (!r.current.dc || r.current.dc.readyState !== "open") return finish();
    note("The candidate has ended the test early. Say the final sentence of the test now, then give your assessment of what you heard.");
    nudge();
    startAssessing();
  };

  const finish = async () => {
    const c = r.current;
    if (c.finished) return;
    c.finished = true;
    const now = Date.now();
    c.assessing = false;
    const ended = c.assessedAt || now;
    if (c.partStart[c.part] && !c.partEnd[c.part]) c.partEnd[c.part] = ended;
    if (c.talkStart && !c.talkEnd) c.talkEnd = ended;
    stopRecording();
    teardown();
    setStage("submitting");
    const metrics: SpeakingMetrics = {
      partSeconds: Object.fromEntries(Object.keys(c.partStart).map((p) => [p, ((c.partEnd[+p] ?? now) - c.partStart[+p]!) / 1000])),
      longTurnSeconds: c.talkStart ? (c.talkEnd - c.talkStart) / 1000 : null,
      longTurnPauses: c.talkStart ? c.pauses : null,
    };
    try {
      const res = await fetch(`/api/tests/${data.id}/attempts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          transcript: c.transcript,
          metrics,
          examinerSaid: c.examinerSaid || null,
          elapsedSec: c.startedAt ? Math.round(((c.assessedAt || now) - c.startedAt) / 1000) : null,
        }),
      });
      const saved = await res.json().catch(() => null);
      if (!res.ok) throw new Error(saved?.error ?? "Submitting failed.");
      const audio = await c.recording;
      if (audio && saved?.id) {
        await fetch(`/api/attempts/${saved.id}/recording`, { method: "PUT", headers: { "content-type": audio.type }, body: audio }).catch((err) =>
          console.error("saving the recording failed", err),
        );
      }
      invalidate(`/api/tests/${data.id}`);
      invalidate("/api/tests");
      invalidate("/api/progress");
      invalidate("/api/conversations");
    } catch (err) {
      c.finished = false;
      setError((err as Error).message);
      setStage("dropped");
    }
  };

  const leave = () => {
    stopRecording();
    teardown();
    exitTest(data.conversationId ? { name: "chat", id: data.conversationId } : { name: "tests" });
  };

  // ---- views ----
  if (stage === "check" || stage === "connecting") {
    return (
      <Shell title={data.test.title} onExit={leave} exitLabel="Exit">
        <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center px-6 py-10">
          <h1 className="font-serif text-[30px] leading-tight text-ink">{data.test.title}</h1>
          <p className="mt-2 text-[15px] text-ink-soft">
            Speaking · {partsLabel(parts)} · {minutes} min
          </p>

          <div className="mt-10 rounded-2xl border border-rule bg-surface p-5 shadow-[var(--shadow-card)]">
            <p className="text-[15px] text-ink">{micError ?? (askingMic ? "Allow the microphone when your browser asks." : heard ? "Your microphone is working." : "Say something to check your microphone.")}</p>
            {!micError && (
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-paper" aria-hidden>
                <div className="h-full rounded-full bg-ink-soft transition-[width] duration-75" style={{ width: `${Math.min(100, level.me * 160)}%` }} />
              </div>
            )}
            {micError && (
              <button onClick={getMic} className="mt-4 rounded-lg border border-rule px-3 py-1.5 text-[14px] text-ink hover:bg-paper">
                Try again
              </button>
            )}
          </div>

          <p className="mt-6 text-[15px] leading-relaxed text-ink-soft">
            A voice examiner asks the questions and you answer aloud, as in the real test. Say hello when the test starts and the examiner will begin. Headphones help.
          </p>
          {error && (
            <p role="alert" className="mt-4 text-[14px] text-danger">
              {error}
            </p>
          )}
          <button
            onClick={start}
            disabled={!r.current.mic || stage === "connecting"}
            className="mt-8 h-11 rounded-xl bg-primary px-5 text-[15px] font-medium text-on-primary hover:bg-primary-hover disabled:opacity-40"
          >
            {stage === "connecting" ? "Connecting to the examiner…" : "Start the test"}
          </button>
        </div>
      </Shell>
    );
  }

  if (stage === "assessing")
    return (
      <>
        <Marking data={data} live onLeave={() => setConfirmLeave(true)} />
        {confirmLeave && (
          <ConfirmDialog
            title="Leave before marking finishes?"
            action="Leave"
            onCancel={() => setConfirmLeave(false)}
            onConfirm={async () => {
              setConfirmLeave(false);
              await finish();
              leave();
            }}
          >
            <p>The examiner is still marking your test. If you leave now, this test will not be marked.</p>
          </ConfirmDialog>
        )}
      </>
    );
  if (stage === "submitting") return <Marking data={data} />;

  if (stage === "dropped") {
    const said = r.current.transcript.some((l) => l.role === "candidate");
    return (
      <Shell title={data.test.title} onExit={leave} exitLabel="Exit">
        <div className="mx-auto flex max-w-[440px] flex-1 flex-col justify-center gap-4 px-6 text-center">
          <p className="font-serif text-[24px] text-ink">The test stopped</p>
          <p className="text-[15px] text-ink-soft">{error}</p>
          <div className="mt-2 flex justify-center gap-2">
            {said && (
              <button onClick={finish} className="h-10 rounded-xl bg-primary px-4 text-[14px] font-medium text-on-primary hover:bg-primary-hover">
                Mark what I said
              </button>
            )}
            <button onClick={() => location.reload()} className="h-10 rounded-xl border border-rule px-4 text-[14px] text-ink hover:bg-surface">
              Start again
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  const showCard = (stage === "prep" || stage === "talk") && card;
  return (
    <Shell
      title={data.test.title}
      onExit={() => setConfirmEnd(true)}
      exitLabel="End test"
      center={
        parts.length > 1 ? (
          <ol className="flex items-center gap-1 text-[13px]" aria-label="Parts">
            {parts.map((p) => (
              <li key={p} aria-current={p === part ? "step" : undefined} className={`rounded-md px-2.5 py-1 ${p === part ? "bg-selected text-ink" : "text-ink-faint"}`}>
                Part {p}
              </li>
            ))}
          </ol>
        ) : (
          <span className="text-[13px] text-ink-soft">Part {part}</span>
        )
      }
    >
      <div className={`mx-auto flex w-full flex-1 flex-col items-center px-6 ${showCard ? "max-w-[880px] justify-center gap-10 md:flex-row md:items-center" : "max-w-[640px] justify-center"}`}>
        <div className="flex flex-col items-center gap-6 text-center">
          <Orb level={Math.max(level.examiner, level.me * 0.6)} active={level.examiner > 0.03} />
          {!showCard && (
            <p className="min-h-[3.5rem] max-w-[34rem] font-serif text-[20px] leading-snug text-ink" aria-live="polite">
              {started ? caption : <span className="text-ink-soft">Say hello to the examiner</span>}
            </p>
          )}
        </div>

        {showCard && (
          <section className="w-full max-w-[420px] rounded-2xl border border-rule bg-surface p-6 shadow-[var(--shadow-card)]" aria-label="Your topic">
            <p className="font-serif text-[19px] leading-snug text-ink">{card.task}</p>
            <p className="mt-4 text-[14px] text-ink-soft">You should say:</p>
            <ul className="mt-1.5 space-y-1 pl-4 text-[15px] text-ink">
              {card.prompts.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p className="mt-1.5 text-[15px] text-ink">{card.explain}</p>

            <div className="mt-6 flex items-center justify-between border-t border-rule pt-4">
              <p className="text-[14px] text-ink-soft">{stage === "prep" ? "Prepare your talk" : "Speak now"}</p>
              <p className="font-serif text-[26px] tabular-nums text-ink" aria-label={`${clock} seconds left`}>
                {Math.floor(clock / 60)}:{String(clock % 60).padStart(2, "0")}
              </p>
            </div>
            {stage === "prep" ? (
              <>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes"
                  aria-label="Notes"
                  className="mt-3 h-28 w-full resize-none rounded-lg border border-rule bg-paper px-3 py-2 text-[14px] text-ink placeholder:text-ink-faint focus:border-rule-strong focus:outline-none"
                />
                <button onClick={startTalk} className="mt-2 text-[13px] text-ink-soft underline-offset-2 hover:text-ink hover:underline">
                  I'm ready to start
                </button>
              </>
            ) : (
              <>
                {notes.trim() && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-paper px-3 py-2 text-[14px] text-ink-soft">{notes}</p>}
                <button onClick={() => endTalk("finished")} className="mt-2 text-[13px] text-ink-soft underline-offset-2 hover:text-ink hover:underline">
                  I've finished
                </button>
              </>
            )}
          </section>
        )}
      </div>

      <footer className="flex items-center justify-center pb-6">
        <button
          onClick={toggleMute}
          aria-pressed={muted}
          aria-label={muted ? "Unmute your microphone" : "Mute your microphone"}
          className={`flex h-9 items-center gap-2 rounded-full px-3.5 text-[13px] transition-colors ${muted ? "bg-ink text-surface hover:bg-ink/90" : "text-ink-soft hover:bg-surface hover:text-ink"}`}
        >
          {muted ? (
            <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6 3.6A2 2 0 0 1 10 4v3.2M10 9.6A2 2 0 0 1 6 8V6.4M3.8 7.6a4.2 4.2 0 0 0 6.9 3.2M12.2 7.6c0 .5-.1 1-.3 1.5M8 12v2M2.5 2.5l11 11" />
            </svg>
          ) : (
            <span className="relative flex size-2.5">
              <span className="absolute inset-0 rounded-full bg-ink-soft transition-transform duration-75" style={{ transform: `scale(${1 + level.me * 3})`, opacity: 0.25 }} />
              <span className="relative size-2.5 rounded-full bg-ink" />
            </span>
          )}
          {muted ? "Unmute" : "Mute"}
        </button>
      </footer>

      {confirmEnd && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-scrim p-4" role="dialog" aria-modal aria-label="End the test">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-[var(--shadow-float)]">
            <p className="font-serif text-[20px] text-ink">End the test now?</p>
            <p className="mt-2 text-[14px] text-ink-soft">What you have said so far will be marked.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setConfirmEnd(false)} className="h-9 rounded-lg px-3 text-[14px] text-ink-soft hover:bg-paper hover:text-ink">
                Keep going
              </button>
              <button
                onClick={() => {
                  setConfirmEnd(false);
                  endEarly();
                }}
                className="h-9 rounded-lg bg-primary px-3.5 text-[14px] font-medium text-on-primary hover:bg-primary-hover"
              >
                End and mark
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ title, onExit, exitLabel, center, children }: { title: string; onExit: () => void; exitLabel: string; center?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper">
      <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-rule bg-surface px-4">
        <button onClick={onExit} className="justify-self-start rounded-md px-2 py-1.5 text-sm text-ink-soft hover:bg-paper hover:text-ink">
          {exitLabel}
        </button>
        {center ?? <span className="truncate font-serif text-[15px] text-ink">{title}</span>}
        <span />
      </header>
      {children}
    </div>
  );
}

/** The examiner: a calm circle that breathes with the voice. */
function Orb({ level, active, pulse }: { level: number; active: boolean; pulse?: boolean }) {
  return (
    <span className="relative flex size-36 items-center justify-center" aria-hidden>
      <span className="absolute inset-0 rounded-full bg-ink/[0.06] transition-transform duration-100" style={{ transform: `scale(${1 + level * 0.9})` }} />
      <span className="absolute inset-5 rounded-full bg-ink/[0.08] transition-transform duration-100" style={{ transform: `scale(${1 + level * 0.5})` }} />
      <span className={`relative size-16 rounded-full transition-colors duration-300 ${active ? "bg-ink" : "bg-ink-soft"} ${pulse ? "animate-pulse" : ""}`} />
    </span>
  );
}

const join = (a: string, b: string) => (a && b ? `${a} ${b}` : a || b).replace(/\s+/g, " ");

/** Two seconds of very quiet white noise (about -50 dB), looped under the microphone. */
function noiseBuffer(ctx: AudioContext) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.003;
  return buf;
}

function meter(ctx: AudioContext, stream: MediaStream) {
  const a = ctx.createAnalyser();
  a.fftSize = 512;
  ctx.createMediaStreamSource(stream).connect(a);
  const buf = new Uint8Array(a.fftSize);
  return () => {
    a.getByteTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += ((v - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / buf.length) * 4);
  };
}

/** Split an examiner piece after the closing sentence: [up to and including it, the rest], or [text, null] without it. */
function splitAtEnd(text: string): [string, string | null] {
  const at = text.toLowerCase().search(/end of the (speaking )?test\.?/);
  if (at === -1) return [text, null];
  const cut = text.indexOf(".", at);
  return cut === -1 ? [text, ""] : [text.slice(0, cut + 1), text.slice(cut + 1).trim()];
}
