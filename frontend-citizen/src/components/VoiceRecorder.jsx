import { useState, useRef, useEffect } from "react";
import { transcribeAudio } from "../api/client";

function getSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
    "audio/wav",
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export default function VoiceRecorder({ onTranscriptReady, disabled }) {
  // States: 'idle' | 'recording' | 'recorded' | 'transcribing' | 'transcribed'
  const [state, setState] = useState("idle");
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [permissionDenied, setPermissionDenied] = useState(false);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioPlayerRef = useRef(null);

  // Clean up timer, streams, audio URLs
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const formatTime = (s) => {
    const mins = String(Math.floor(s / 60)).padStart(2, "0");
    const secs = String(s % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };

  // 1. Start Recording
  async function startRecording() {
    setErrorMsg("");
    setPermissionDenied(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg("Voice recording is not supported in this browser.");
      return;
    }

    const mimeType = getSupportedMimeType();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const options = mimeType ? { mimeType } : {};
      const mr = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mr.onstop = () => {
        const type = mimeType || mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState("recorded");
        // Stop microphone hardware stream
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start(250); // Slice chunks every 250ms
      setState("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionDenied(true);
        setErrorMsg("Microphone permission is required to record a voice complaint.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMsg("No microphone found on your device.");
      } else {
        setErrorMsg("Could not access your microphone. Please check system settings.");
      }
    }
  }

  // 2. Stop Recording
  function stopRecording() {
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  // 3. Audio Playback
  function togglePlayback() {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  }

  // 4. Discard & Reset
  function handleDiscard() {
    clearInterval(timerRef.current);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setTranscript("");
    setErrorMsg("");
    setState("idle");
    setSeconds(0);
  }

  // 5. Transcribe Audio
  async function handleTranscribe() {
    if (!audioBlob) return;
    if (seconds < 1 && audioBlob.size < 1000) {
      setErrorMsg("Recording was too short. Please speak clearly for at least 2 seconds.");
      return;
    }

    setState("transcribing");
    setErrorMsg("");

    try {
      const ext = audioBlob.type.includes("ogg")
        ? "ogg"
        : audioBlob.type.includes("mp4")
        ? "mp4"
        : audioBlob.type.includes("wav")
        ? "wav"
        : "webm";
      const result = await transcribeAudio(audioBlob, `complaint_audio.${ext}`);
      setTranscript(result.text || "");
      setState("transcribed");
    } catch (err) {
      console.error("Transcription error:", err);
      setErrorMsg(err.message || "We couldn't transcribe the recording. Please try again.");
      setState("recorded");
    }
  }

  // 6. Use Transcript
  function handleUseTranscript() {
    if (!transcript.trim()) {
      setErrorMsg("Transcript is empty. Please record or type your complaint.");
      return;
    }
    onTranscriptReady(transcript.trim());
  }

  return (
    <div className="voice-recorder-card">
      {/* Permission Denied Banner */}
      {permissionDenied && (
        <div className="voice-error-banner">
          <span>⚠️ {errorMsg}</span>
          <button className="btn-voice-retry" onClick={startRecording}>
            Try Again
          </button>
        </div>
      )}

      {/* General Error Banner */}
      {!permissionDenied && errorMsg && (
        <div className="voice-error-banner">
          <span>⚠️ {errorMsg}</span>
        </div>
      )}

      {/* 1. Idle State */}
      {state === "idle" && (
        <div className="voice-idle-box">
          <div className="voice-idle-header">
            <span className="voice-mic-icon">🎙️</span>
            <div>
              <div className="voice-idle-title">Record a voice complaint</div>
              <div className="voice-idle-subtitle">
                Speak naturally about what you observed in your locality.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn-start-record"
            onClick={startRecording}
            disabled={disabled}
            id="btn-start-recording"
          >
            Start Recording
          </button>
        </div>
      )}

      {/* 2. Recording Active State */}
      {state === "recording" && (
        <div className="voice-recording-box">
          <div className="recording-indicator-row">
            <span className="recording-pulse-dot" />
            <span className="recording-status-label">Recording</span>
            <span className="recording-timer">{formatTime(seconds)}</span>
          </div>
          <div className="voice-wave-anim">
            <span className="wave-bar" />
            <span className="wave-bar" />
            <span className="wave-bar" />
            <span className="wave-bar" />
            <span className="wave-bar" />
          </div>
          <button
            type="button"
            className="btn-stop-record"
            onClick={stopRecording}
            id="btn-stop-recording"
          >
            Stop Recording
          </button>
        </div>
      )}

      {/* 3. Recorded State (Review & Listen before transcribe) */}
      {state === "recorded" && (
        <div className="voice-recorded-box">
          <div className="recorded-header">
            <div className="recorded-badge">
              <span className="recorded-check">✓</span>
              <span>Voice Recording Ready ({formatTime(seconds)})</span>
            </div>
          </div>

          {audioUrl && (
            <div className="audio-preview-row">
              <audio
                ref={audioPlayerRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden-audio-player"
              />
              <button
                type="button"
                className="btn-play-pause"
                onClick={togglePlayback}
                id="btn-play-audio"
              >
                {isPlaying ? "⏸ Pause" : "▶ Play"}
              </button>
              <span className="audio-filename">voice_recording_{formatTime(seconds)}</span>
            </div>
          )}

          <div className="recorded-actions-row">
            <button
              type="button"
              className="btn-voice-delete"
              onClick={handleDiscard}
              id="btn-discard-recording"
            >
              Delete
            </button>
            <button
              type="button"
              className="btn-voice-retry"
              onClick={handleDiscard}
            >
              Record Again
            </button>
            <button
              type="button"
              className="btn-voice-transcribe"
              onClick={handleTranscribe}
              id="btn-transcribe-recording"
            >
              Transcribe Recording →
            </button>
          </div>
        </div>
      )}

      {/* 4. Transcribing State */}
      {state === "transcribing" && (
        <div className="voice-transcribing-box">
          <div className="transcribe-spinner" />
          <div className="transcribe-text">Transcribing your complaint...</div>
          <div className="transcribe-sub">
            Groq Whisper is processing your audio recording
          </div>
        </div>
      )}

      {/* 5. Transcribed Result */}
      {state === "transcribed" && (
        <div className="voice-transcribed-box">
          <div className="transcribed-header">
            <span className="transcribed-label">VOICE TRANSCRIPT</span>
            <button
              type="button"
              className="btn-edit-toggle"
              onClick={() => setIsEditingTranscript(!isEditingTranscript)}
            >
              {isEditingTranscript ? "Save Edit" : "Edit Transcript"}
            </button>
          </div>

          {isEditingTranscript ? (
            <textarea
              className="transcript-textarea"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={3}
            />
          ) : (
            <div className="transcript-quote">"{transcript}"</div>
          )}

          <div className="transcribed-actions-row">
            <button
              type="button"
              className="btn-voice-retry"
              onClick={handleDiscard}
            >
              Record Again
            </button>
            <button
              type="button"
              className="btn-use-transcript"
              onClick={handleUseTranscript}
              id="btn-use-transcript"
            >
              Use Transcript for Complaint →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
