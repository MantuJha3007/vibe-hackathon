import { useState, useRef, useEffect } from "react";

const SEVERITY_LABELS = {
  1: "Minor",
  2: "Low",
  3: "Moderate",
  4: "High",
  5: "Critical",
};

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

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="voice-recorder">
      {!recording && !blob && (
        <button
          className="btn btn-voice"
          onClick={startRecording}
          disabled={disabled}
          id="btn-start-recording"
        >
          <span className="pulse-dot" />
          Start Voice Recording
        </button>
      )}
      {recording && (
        <div className="recording-active">
          <div className="rec-indicator">
            <span className="pulse-dot active" />
            <span>Recording… {fmt(seconds)}</span>
          </div>
          <button className="btn btn-stop" onClick={stopRecording} id="btn-stop-recording">
            ⬛ Stop
          </button>
        </div>
      )}
      {blob && !recording && (
        <div className="recording-ready">
          <span className="check-icon">✅</span>
          <span>Recording ready ({fmt(seconds)})</span>
          <button className="btn btn-primary" onClick={handleUse} id="btn-use-recording">
            Use Recording
          </button>
          <button
            className="btn btn-ghost"
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
