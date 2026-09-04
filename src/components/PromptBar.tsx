"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PromptBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  submitLabel?: string;
  inputId?: string;
  inputLabel?: string;
};

type BrowserSpeechRecognition = SpeechRecognition;

function getSpeechRecognitionCtor(): (new () => BrowserSpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window &
    typeof globalThis & {
      SpeechRecognition?: new () => BrowserSpeechRecognition;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function joinSpeech(base: string, spoken: string): string {
  const chunk = spoken.trim();
  if (!chunk) return base;
  if (!base.trim()) return chunk;
  const needsSpace = !/\s$/.test(base);
  return needsSpace ? `${base} ${chunk}` : `${base}${chunk}`;
}

export function PromptBar({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "What should we learn today?",
  submitLabel = "Start",
  inputId = "studio-prompt",
  inputLabel = "Prompt",
}: PromptBarProps) {
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const valueRef = useRef(value);
  const committedRef = useRef(value);
  const wantListeningRef = useRef(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  useEffect(() => {
    valueRef.current = value;
    if (!wantListeningRef.current) {
      committedRef.current = value;
      return;
    }
    // Parent may clear the prompt (e.g. after a lesson) while mic stays on.
    if (!value.trim()) {
      committedRef.current = "";
    }
  }, [value]);

  useEffect(() => {
    queueMicrotask(() =>
      setSpeechSupported(Boolean(getSpeechRecognitionCtor())),
    );
  }, []);

  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      if (rec) {
        rec.onend = null;
        rec.onerror = null;
        rec.onresult = null;
        try {
          rec.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  function stopListening() {
    wantListeningRef.current = false;
    setListening(false);
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      rec.onend = null;
      rec.onerror = null;
      rec.onresult = null;
      try {
        rec.stop();
      } catch {
        // ignore
      }
    }
  }

  function startListening() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setMicError("Speech input is not supported in this browser.");
      return;
    }

    stopListening();
    setMicError(null);
    committedRef.current = valueRef.current;
    wantListeningRef.current = true;
    setListening(true);

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let newlyFinal = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) newlyFinal += transcript;
        else interim += transcript;
      }
      if (newlyFinal) {
        committedRef.current = joinSpeech(committedRef.current, newlyFinal);
      }
      onChange(joinSpeech(committedRef.current, interim));
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Browser often emits no-speech / aborted while still listening — keep going.
      if (
        event.error === "no-speech" ||
        event.error === "aborted" ||
        event.error === "audio-capture"
      ) {
        return;
      }
      if (event.error === "not-allowed") {
        setMicError("Microphone permission denied.");
        wantListeningRef.current = false;
        setListening(false);
        recognitionRef.current = null;
        return;
      }
      // Other errors: keep session intent; onend will restart if wanted.
    };

    recognition.onend = () => {
      // Stay on until the user clicks the mic off — restart after browser pauses.
      if (!wantListeningRef.current) {
        setListening(false);
        recognitionRef.current = null;
        return;
      }
      try {
        recognition.start();
      } catch {
        window.setTimeout(() => {
          if (!wantListeningRef.current) return;
          try {
            recognition.start();
          } catch {
            wantListeningRef.current = false;
            setListening(false);
            recognitionRef.current = null;
            setMicError("Could not keep the microphone open. Try again.");
          }
        }, 200);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      wantListeningRef.current = false;
      setListening(false);
      recognitionRef.current = null;
      setMicError("Could not start the microphone. Try again.");
    }
  }

  function toggleMic() {
    if (disabled) return;
    if (wantListeningRef.current || listening) {
      stopListening();
      return;
    }
    startListening();
  }

  return (
    <form
      className="flex w-full flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        // Release the mic as soon as the turn starts — do not keep listening
        // while the lesson streams / TTS talks.
        stopListening();
        onSubmit();
      }}
    >
      <div className="flex w-full items-stretch gap-2">
        <div className="relative min-w-0 flex-1">
          <label className="sr-only" htmlFor={inputId}>
            {inputLabel}
          </label>
          <Input
            id={inputId}
            value={value}
            onChange={(e) => {
              const next = e.target.value;
              onChange(next);
              if (wantListeningRef.current) {
                committedRef.current = next;
              }
            }}
            disabled={disabled}
            placeholder={placeholder}
            className="h-11 bg-card pr-12 pl-4"
          />
          {speechSupported ? (
            <button
              type="button"
              onClick={toggleMic}
              disabled={disabled}
              aria-pressed={listening}
              aria-label={listening ? "Stop listening" : "Start voice input"}
              title={
                listening
                  ? "Listening — click to stop"
                  : "Speak your prompt"
              }
              className={[
                "absolute top-1/2 right-1.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg transition",
                listening
                  ? "bg-accent text-white"
                  : "text-muted hover:bg-paper hover:text-ink",
                disabled ? "cursor-not-allowed opacity-40" : "",
              ].join(" ")}
            >
              <MicIcon listening={listening} />
            </button>
          ) : null}
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={disabled || !value.trim()}
          className="shrink-0"
        >
          {submitLabel}
        </Button>
      </div>
      {listening ? (
        <p className="font-sans text-[11px] text-accent">
          Listening… mic turns off when you hit {submitLabel}.
        </p>
      ) : null}
      {micError ? (
        <p className="font-sans text-[11px] text-warn">{micError}</p>
      ) : null}
    </form>
  );
}

function MicIcon({ listening }: { listening: boolean }) {
  return (
    <span className="relative flex h-4 w-4 items-center justify-center">
      {listening ? (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/35" />
      ) : null}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="relative h-4 w-4"
      >
        <path
          d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.5 11a6.5 6.5 0 0 0 13 0"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M12 17.5V21"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
