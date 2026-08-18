import { useState } from "react";
import VoiceRecorder from "./VoiceRecorder";
import { analyzeComplaint, submitComplaint, submitVoiceComplaint } from "../api/client";

const SEVERITY_COLOR = ["", "#4ade80", "#a3e635", "#facc15", "#fb923c", "#f87171"];
const SEVERITY_LABEL = ["", "Minor", "Low", "Moderate", "High", "Critical"];
const CATEGORY_ICONS = {
  Pothole: "🕳️",
  Garbage: "🗑️",
  Streetlight: "💡",
  "Water Supply": "💧",
  Sewage: "🚰",
  "Noise Pollution": "🔊",
  "Air Pollution": "💨",
  "Road Damage": "🛣️",
  "Tree Hazard": "🌳",
  "Illegal Construction": "🏗️",
  "Industrial Waste": "🏭",
  Other: "📋",
};

export default function ComplaintForm({ onSuccess }) {
  const [step, setStep] = useState(1); // 1=input, 2=preview, 3=done
  const [inputMode, setInputMode] = useState("text"); // text | voice
  const [text, setText] = useState("");
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAnalyze() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await analyzeComplaint(text);
      setAnalysis(result);
      setStep(2);
    } catch (e) {
      setError("Could not analyze complaint. Check your API connection.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVoiceBlob(blob) {
    setVoiceBlob(blob);
    setLoading(true);
    setError("");
    try {
      const result = await submitVoiceComplaint(blob);
      setTicket(result);
      setStep(3);
      onSuccess?.(result);
    } catch (e) {
      setError("Voice submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const result = await submitComplaint(text);
      setTicket(result);
      setStep(3);
      onSuccess?.(result);
    } catch (e) {
      setError("Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep(1);
    setText("");
    setAnalysis(null);
    setTicket(null);
    setVoiceBlob(null);
    setError("");
  }

  return (
    <div className="complaint-form glass-card">
      {/* Progress bar */}
      <div className="progress-bar">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`progress-step ${step >= s ? "active" : ""} ${step > s ? "done" : ""}`}>
            <div className="step-dot">{step > s ? "✓" : s}</div>
            <span>{["Describe Issue", "Review", "Submitted"][s - 1]}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Input */}
      {step === 1 && (
        <div className="form-step">
          <h2>Report an Issue</h2>
          <p className="subtitle">Describe the problem or use your voice</p>

          <div className="mode-toggle">
            <button
              className={`mode-btn ${inputMode === "text" ? "active" : ""}`}
              onClick={() => setInputMode("text")}
              id="btn-mode-text"
            >
              ✏️ Text
            </button>
            <button
              className={`mode-btn ${inputMode === "voice" ? "active" : ""}`}
              onClick={() => setInputMode("voice")}
              id="btn-mode-voice"
            >
              🎙️ Voice
            </button>
          </div>

          {inputMode === "text" && (
            <>
              <textarea
                id="complaint-text"
                className="complaint-textarea"
                placeholder="e.g. There's a large pothole on MG Road near the bus stop. It's been there for 3 weeks and vehicles are getting damaged."
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
              />
              <div className="char-count">{text.length} characters</div>
              {error && <div className="error-msg">{error}</div>}
              <button
                className="btn btn-primary btn-full"
                onClick={handleAnalyze}
                disabled={loading || text.trim().length < 10}
                id="btn-analyze"
              >
                {loading ? <span className="spinner" /> : "🔍 Analyze with AI →"}
              </button>
            </>
          )}

          {inputMode === "voice" && (
            <>
              <p className="voice-hint">Click the button and describe your issue clearly.</p>
              {error && <div className="error-msg">{error}</div>}
              {loading && (
                <div className="loading-voice">
                  <span className="spinner" /> Transcribing and analyzing…
                </div>
              )}
              <VoiceRecorder onTranscript={handleVoiceBlob} disabled={loading} />
            </>
          )}
        </div>
      )}

      {/* Step 2: Preview AI analysis */}
      {step === 2 && analysis && (
        <div className="form-step">
          <h2>AI Analysis Complete</h2>
          <p className="subtitle">Review what our AI found. Confirm to submit.</p>

          <div className="analysis-card">
            <div className="analysis-row">
              <span className="label">Category</span>
              <span className="value cat-badge">
                {CATEGORY_ICONS[analysis.category] || "📋"} {analysis.category}
              </span>
            </div>
            <div className="analysis-row">
              <span className="label">Severity</span>
              <span
                className="value severity-badge"
                style={{ background: SEVERITY_COLOR[analysis.severity] + "22", color: SEVERITY_COLOR[analysis.severity] }}
              >
                {SEVERITY_LABEL[analysis.severity]} ({analysis.severity}/5)
              </span>
            </div>
            <div className="analysis-row">
              <span className="label">Department</span>
              <span className="value">{analysis.department}</span>
            </div>
            {analysis.location?.address && (
              <div className="analysis-row">
                <span className="label">Location</span>
                <span className="value">{analysis.location.address}</span>
              </div>
            )}
            <div className="analysis-row summary-row">
              <span className="label">Summary</span>
              <span className="value">{analysis.summary}</span>
            </div>
            {analysis.keywords?.length > 0 && (
              <div className="analysis-row">
                <span className="label">Tags</span>
                <div className="tags">
                  {analysis.keywords.map((k) => (
                    <span key={k} className="tag">{k}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && <div className="error-msg">{error}</div>}

          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => setStep(1)} id="btn-back">
              ← Edit
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading}
              id="btn-confirm-submit"
            >
              {loading ? <span className="spinner" /> : "✅ Confirm & Submit"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && ticket && (
        <div className="form-step success-step">
          <div className="success-icon">{ticket.is_duplicate ? "📊" : "✅"}</div>
          <h2>{ticket.is_duplicate ? "Issue Already Reported" : "Complaint Submitted!"}</h2>
          {ticket.is_duplicate ? (
            <p>
              A similar issue was already reported in this area. Your report has been counted —
              this issue now has <strong>{ticket.report_count} reports</strong> and has been
              escalated in priority.
            </p>
          ) : (
            <p>Your complaint has been logged and assigned to <strong>{ticket.department}</strong>.</p>
          )}

          <div className="ticket-id-box">
            <span className="ticket-label">Your Ticket ID</span>
            <span className="ticket-num" id="submitted-ticket-id">#{ticket.id}</span>
            <span className="ticket-hint">Save this to track your complaint status</span>
          </div>

          <button className="btn btn-primary" onClick={reset} id="btn-report-another">
            Report Another Issue
          </button>
        </div>
      )}
    </div>
  );
}
