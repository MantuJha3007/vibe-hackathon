import { useState, useRef, useEffect } from "react";

export default function VoiceRecorder({ onTranscript, disabled }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  async function startRecording() {
    chunksRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    mediaRef.current = mr;
    mr.ondataavailable = (e) => chunksRef.current.push(e.data);
    mr.onstop = () => {
      const b = new Blob(chunksRef.current, { type: "audio/webm" });
      setBlob(b);
      stream.getTracks().forEach((t) => t.stop());
    };
    mr.start();
    setRecording(true);
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function stopRecording() {
    mediaRef.current?.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  }

  function handleUse() {
    if (blob) onTranscript(blob);
    setBlob(null);
  }

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="voice-recorder">
      {/* Idle: start button */}
      {!recording && !blob && (
        <button
          className="btn-voice"
          onClick={startRecording}
          disabled={disabled}
          id="btn-start-recording"
        >
          <span className="voice-idle-icon">🎙</span>
          Record Voice
        </button>
      )}

      {/* Recording active */}
      {recording && (
        <div className="recording-active">
          <span className="rec-dot" />
          <span className="rec-label">Recording… {fmt(seconds)}</span>
          <button
            className="btn-stop"
            onClick={stopRecording}
            id="btn-stop-recording"
          >
            Stop
          </button>
        </div>
      )}

      {/* Recording ready */}
      {blob && !recording && (
        <div className="recording-ready">
          <span style={{ fontSize: "16px" }}>✓</span>
          <span className="ready-label">
            Recording ready — {fmt(seconds)}
          </span>
          <button className="btn-use" onClick={handleUse} id="btn-use-recording">
            Use Recording
          </button>
          <button
            className="btn-discard"
            onClick={() => setBlob(null)}
            id="btn-discard-recording"
          >
            Discard
          </button>
        </div>
      )}
    </div>
  );
}
