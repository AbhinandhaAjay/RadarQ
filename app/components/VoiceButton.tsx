"use client";

import { useEffect, useRef, useState } from "react";

// Minimal typing for the browser Web Speech API (Chrome/Edge expose it prefixed).
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onaudiostart: (() => void) | null;
  onspeechstart: (() => void) | null;
}

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

const WISPR_TIP = "You can also click in the box and dictate with Wispr Flow.";

// Plain-language reasons for each Web Speech API error code.
const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access is blocked for this site. Click the lock icon in the address bar, allow the microphone, and try again.",
  "service-not-allowed": "This browser won't let the page use speech recognition. Try Chrome or Edge.",
  "audio-capture": "No microphone was found. Check that one is plugged in and selected in your system sound settings.",
  network: "The browser couldn't reach its speech service. It needs an internet connection, and some browsers like Brave block it.",
  "no-speech": "I didn't hear anything. Tap the mic and start talking straight away.",
  "language-not-supported": "This browser doesn't support speech in that language.",
};

/**
 * Mic button that streams a live transcript through onTranscript, reports
 * what it's doing through onStatus, and calls onDone with the final text.
 */
export default function VoiceButton({
  onTranscript,
  onDone,
  onListeningChange,
  onStatus,
}: {
  onTranscript: (text: string) => void;
  onDone: (text: string) => void;
  onListeningChange: (on: boolean) => void;
  onStatus: (status: { text: string; tone: "info" | "error" } | null) => void;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const textRef = useRef("");
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setSupported(getRecognition() !== null), []);
  useEffect(() => () => recRef.current?.stop(), []);

  const clearSilence = () => {
    if (silenceRef.current) clearTimeout(silenceRef.current);
    silenceRef.current = null;
  };

  async function start() {
    if (!window.isSecureContext) {
      onStatus({ text: `Voice only works on https or localhost. Open the app at http://localhost:3123. ${WISPR_TIP}`, tone: "error" });
      return;
    }
    // Ask for the mic explicitly first: it triggers the permission prompt and
    // tells us clearly if no microphone exists, which recognition hides.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch (err) {
      const name = (err as DOMException).name;
      const key = name === "NotAllowedError" ? "not-allowed" : name === "NotFoundError" ? "audio-capture" : "";
      onStatus({ text: `${ERRORS[key] ?? "The microphone couldn't be opened."} ${WISPR_TIP}`, tone: "error" });
      return;
    }

    const rec = getRecognition();
    if (!rec) return;
    rec.lang = navigator.language?.startsWith("en") ? navigator.language : "en-IN";
    rec.continuous = true;
    rec.interimResults = true;
    textRef.current = "";
    let finalText = "";
    let failed = false;

    rec.onaudiostart = () => {
      onStatus({ text: "Listening. Start speaking…", tone: "info" });
      silenceRef.current = setTimeout(() => {
        if (!textRef.current) {
          onStatus({
            text: `Not hearing anything yet. Check the browser is using the right microphone (lock icon → Site settings). ${WISPR_TIP}`,
            tone: "error",
          });
        }
      }, 7000);
    };
    rec.onspeechstart = () => onStatus({ text: "Hearing you… tap the mic again when you're done.", tone: "info" });
    rec.onresult = (e) => {
      clearSilence();
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      textRef.current = (finalText + interim).trim();
      onTranscript(textRef.current);
    };
    rec.onerror = (e) => {
      if (e.error === "aborted") return;
      failed = true;
      onStatus({ text: `${ERRORS[e.error] ?? `Voice input stopped (${e.error}).`} ${WISPR_TIP}`, tone: "error" });
    };
    rec.onend = () => {
      clearSilence();
      setListening(false);
      onListeningChange(false);
      if (textRef.current) {
        onStatus(null);
        onDone(textRef.current);
      } else if (!failed) {
        onStatus({ text: `I didn't catch anything. ${WISPR_TIP}`, tone: "error" });
      }
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      onStatus({ text: `Voice input couldn't start. ${WISPR_TIP}`, tone: "error" });
      return;
    }
    onStatus({ text: "Starting the microphone…", tone: "info" });
    setListening(true);
    onListeningChange(true);
  }

  function stop() {
    recRef.current?.stop();
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      className={`icon-btn mic ${listening ? "listening" : ""}`}
      onClick={listening ? stop : start}
      aria-label={listening ? "Stop voice input" : "Describe it by voice"}
      title={listening ? "Stop and send" : "Describe it by voice"}
    >
      {listening ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" />
        </svg>
      )}
    </button>
  );
}
