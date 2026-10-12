// Talking with the tutor: a WebRTC call to Codex realtime voice on the chat's own thread.
import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceState = "off" | "connecting" | "live" | "error";

export function useVoice(conversationId: string | null) {
  const [state, setState] = useState<VoiceState>("off");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  // True while the browser is asking the learner for the microphone.
  const [askingMic, setAskingMic] = useState(false);
  // 0..1 loudness of the learner (mic) and the tutor (remote audio), for the orb.
  const [level, setLevel] = useState({ me: 0, tutor: 0 });
  const call = useRef<{ pc: RTCPeerConnection; mic: MediaStream; ctx: AudioContext; audio: HTMLAudioElement; raf: number } | null>(null);

  const teardown = useCallback(() => {
    const c = call.current;
    call.current = null;
    if (!c) return;
    cancelAnimationFrame(c.raf);
    c.mic.getTracks().forEach((t) => t.stop());
    c.pc.close();
    c.audio.srcObject = null;
    c.ctx.close().catch(() => {});
    setLevel({ me: 0, tutor: 0 });
  }, []);

  const stop = useCallback(() => {
    if (!call.current) return;
    teardown();
    setState("off");
    setMuted(false);
    if (conversationId) fetch(`/api/conversations/${conversationId}/voice`, { method: "DELETE" }).catch(() => {});
  }, [conversationId, teardown]);

  const start = useCallback(async () => {
    if (!conversationId || call.current) return;
    setError(null);
    setState("connecting");
    try {
      setAskingMic(true);
      const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).finally(() => setAskingMic(false));
      const pc = new RTCPeerConnection();
      pc.addTrack(mic.getAudioTracks()[0]!, mic);
      pc.createDataChannel("oai-events");
      const ctx = new AudioContext();
      const audio = new Audio();
      audio.autoplay = true;
      const meter = (stream: MediaStream) => {
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
      };
      const meMeter = meter(mic);
      let tutorMeter: (() => number) | null = null;
      pc.ontrack = (e) => {
        const stream = e.streams[0] ?? new MediaStream([e.track]);
        audio.srcObject = stream;
        audio.play().catch(() => {});
        tutorMeter = meter(stream);
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          if (call.current?.pc === pc) {
            teardown();
            setState("off");
          }
        }
      };
      const c = { pc, mic, ctx, audio, raf: 0 };
      call.current = c;
      const tick = () => {
        setLevel({ me: meMeter(), tutor: tutorMeter?.() ?? 0 });
        c.raf = requestAnimationFrame(tick);
      };
      c.raf = requestAnimationFrame(tick);

      await pc.setLocalDescription(await pc.createOffer());
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") return resolve();
        pc.onicegatheringstatechange = () => pc.iceGatheringState === "complete" && resolve();
        setTimeout(resolve, 2500);
      });
      const r = await fetch(`/api/conversations/${conversationId}/voice`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sdp: pc.localDescription!.sdp }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? "The voice session did not start.");
      if (call.current !== c) return;
      await pc.setRemoteDescription({ type: "answer", sdp: body.sdp });
      setState("live");
    } catch (err) {
      teardown();
      const e = err as Error;
      setError(e.name === "NotAllowedError" ? "Allow microphone access in your browser to talk with the tutor." : e.message);
      setState("error");
    }
  }, [conversationId, teardown]);

  const toggleMute = useCallback(() => {
    const track = call.current?.mic.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  }, []);

  // Leaving the chat ends the call.
  useEffect(() => stop, [stop]);

  return { state, error, level, muted, askingMic, start, stop, toggleMute, dismissError: () => (setError(null), setState("off")) };
}
