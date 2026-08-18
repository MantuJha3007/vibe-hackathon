import { useState, Fragment } from "react";
import VoiceRecorder from "./VoiceRecorder";
import ImageUploader from "./ImageUploader";
import { analyzeComplaint, submitComplaint } from "../api/client";

const SEVERITY_COLOR = ["", "#16A34A", "#16A34A", "#D97706", "#EA580C", "#DC2626"];
const SEVERITY_LABEL = ["", "Minor", "Low", "Moderate", "High", "Critical"];

const SEV_PRIORITY = {
  1: { label: "Low", cls: "badge-low" },
  2: { label: "Low", cls: "badge-low" },
  3: { label: "Medium", cls: "badge-medium" },
  4: { label: "High", cls: "badge-high" },
  5: { label: "Critical", cls: "badge-critical" },
};

export default function ComplaintForm({ onSuccess, onTrackTicket }) {
  const [step, setStep] = useState(1); // 1=input, 2=preview, 3=done
  const [inputMode, setInputMode] = useState("text"); // 'text' | 'voice' | 'image'
  const [text, setText] = useState("");
  const [location, setLocation] = useState(null); // { lat, lng, text }
  const [locationLoading, setLocationLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Location capture using browser geolocation
  function handleGetLocation() {
    if (!navigator.geolocation) {
      setLocation({ text: "Geolocation not supported" });
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          text: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
        });
        setLocationLoading(false);
      },
      (err) => {
        console.warn("Location error:", err);
        setLocation({ text: "Location permission denied" });
        setLocationLoading(false);
      },
      { timeout: 10000 }
    );
  }

  // Analyze complaint text
  async function handleAnalyze() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await analyzeComplaint(text, location?.lat, location?.lng);
      setAnalysis(result);
      setStep(2);
    } catch (err) {
      setError(err.message || "Could not analyze complaint. Check your API connection.");
    } finally {
      setLoading(false);
    }
  }

  // Handle voice transcript ready
  function handleVoiceTranscript(transcriptText) {
    setText(transcriptText);
    setInputMode("text");
  }

  // Handle YOLO image detection ready
  function handleImageDetection({ summary, suggestedCategory }) {
    setText(summary);
    setInputMode("text");
  }

  // Submit final complaint
  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const result = await submitComplaint(text, location?.lat, location?.lng);
      setTicket(result);
      setStep(3);
      onSuccess?.(result);
    } catch (err) {
      setError(err.message || "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep(1);
    setInputMode("text");
    setText("");
    setAnalysis(null);
    setTicket(null);
    setError("");
  }

  // Step progress
  const steps = [
    { label: "Describe Issue", num: 1 },
    { label: "Review", num: 2 },
    { label: "Submitted", num: 3 },
  ];

  const priority = analysis ? SEV_PRIORITY[analysis.severity] : null;
  const priorityPct = analysis
    ? Math.min(((analysis.severity - 1) / 4) * 100, 100)
    : 0;
  const priorityBarColor = analysis
    ? SEVERITY_COLOR[analysis.severity]
    : "#2563EB";

  return (
    <div className="page-container">
      {/* Step 1: Input */}
      {step === 1 && (
        <>
          <div className="page-title">Report a Civic Issue</div>
          <div className="page-subtitle">
            Describe the issue you've observed. Sentinel will analyze it and
            route it to the appropriate department.
          </div>

          {/* Step progress */}
          <div className="progress-bar">
            {steps.map((s, i) => (
              <Fragment key={s.num}>
                <div
                  className={`progress-step ${step >= s.num ? "active" : ""} ${step > s.num ? "done" : ""}`}
                >
                  <div className="step-dot">
                    {step > s.num ? "✓" : s.num}
                  </div>
                  <span className="step-name">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`step-connector ${step > s.num ? "done" : ""}`}
                  />
                )}
              </Fragment>
            ))}
          </div>

          <div className="card">
            {/* Mode Toggle (3 Options: Text / Voice / Image) */}
            <div className="card-section">
              <div className="mode-toggle">
                <button
                  type="button"
                  className={`mode-btn ${inputMode === "text" ? "active" : ""}`}
                  onClick={() => setInputMode("text")}
                  id="btn-mode-text"
                >
                  ✏️ Text Report
                </button>
                <button
                  type="button"
                  className={`mode-btn ${inputMode === "voice" ? "active" : ""}`}
                  onClick={() => setInputMode("voice")}
                  id="btn-mode-voice"
                >
                  🎙️ Voice Report
                </button>
                <button
                  type="button"
                  className={`mode-btn ${inputMode === "image" ? "active" : ""}`}
                  onClick={() => setInputMode("image")}
                  id="btn-mode-image"
                >
                  🖼️ Image Report
                </button>
              </div>

              {/* TEXT MODE */}
              {inputMode === "text" && (
                <>
                  <div className="section-label">Describe the Issue</div>
                  <textarea
                    id="complaint-text"
                    className="complaint-textarea"
                    placeholder="e.g. There is a large pothole outside the college gate. Bikes are almost falling and it has been there for several days..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={5}
                  />
                  <div className="char-count">{text.length} / 500</div>
                </>
              )}

              {/* VOICE MODE */}
              {inputMode === "voice" && (
                <>
                  <div className="section-label">Voice Report</div>
                  <VoiceRecorder
                    onTranscriptReady={handleVoiceTranscript}
                    disabled={loading}
                  />
                </>
              )}

              {/* IMAGE MODE */}
              {inputMode === "image" && (
                <>
                  <div className="section-label">Image Report</div>
                  <ImageUploader
                    onDetectionReady={handleImageDetection}
                    disabled={loading}
                  />
                </>
              )}
            </div>

            {/* Location */}
            <div className="card-section">
              <div className="section-label">Location</div>
              <div className="location-row">
                <span className="location-icon">📍</span>
                <span className="location-text">
                  {location?.text || "Location will be captured automatically"}
                </span>
                <button
                  type="button"
                  className="location-action"
                  onClick={handleGetLocation}
                  disabled={locationLoading}
                  id="btn-use-location"
                >
                  {locationLoading ? "Locating..." : "Use my location"}
                </button>
              </div>
            </div>

            {/* CTA */}
            {inputMode === "text" && (
              <div className="card-section">
                {error && <div className="error-msg">{error}</div>}
                <button
                  type="button"
                  className="btn btn-primary btn-full"
                  onClick={handleAnalyze}
                  disabled={loading || text.trim().length < 5}
                  id="btn-analyze"
                >
                  {loading ? <span className="spinner" /> : "Analyze Complaint →"}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Step 2: Preview AI analysis */}
      {step === 2 && analysis && (
        <>
          <div className="page-title">Review Analysis</div>
          <div className="page-subtitle">
            Confirm the AI classification and submit your complaint.
          </div>

          {/* Step progress */}
          <div className="progress-bar">
            {steps.map((s, i) => (
              <Fragment key={s.num}>
                <div
                  className={`progress-step ${step >= s.num ? "active" : ""} ${step > s.num ? "done" : ""}`}
                >
                  <div className="step-dot">
                    {step > s.num ? "✓" : s.num}
                  </div>
                  <span className="step-name">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`step-connector ${step > s.num ? "done" : ""}`}
                  />
                )}
              </Fragment>
            ))}
          </div>

          <div className="card">
            <div className="card-section">
              {/* Analysis header */}
              <div className="analysis-result-header">
                <div className="analysis-check">✓</div>
                <div className="analysis-result-title">Analysis Complete</div>
              </div>

              {/* Category + Priority */}
              <div className="analysis-category-row">
                <div className="analysis-category-name">{analysis.category}</div>
                {priority && (
                  <span className={`priority-badge ${priority.cls}`}>
                    {priority.label} Priority
                  </span>
                )}
              </div>

              {/* Info grid */}
              <div className="analysis-info-grid">
                <div className="analysis-info-item">
                  <div className="analysis-info-label">Severity</div>
                  <div
                    className="analysis-info-value"
                    style={{ color: SEVERITY_COLOR[analysis.severity] }}
                  >
                    {SEVERITY_LABEL[analysis.severity]}
                  </div>
                </div>
                <div className="analysis-info-item">
                  <div className="analysis-info-label">Department</div>
                  <div className="analysis-info-value">{analysis.department}</div>
                </div>
                {analysis.location?.address && (
                  <div className="analysis-info-item" style={{ gridColumn: "1 / -1" }}>
                    <div className="analysis-info-label">Location</div>
                    <div className="analysis-info-value">{analysis.location.address}</div>
                  </div>
                )}
              </div>

              {/* Priority score bar */}
              <div className="priority-score-row">
                <span className="priority-score-label">Priority Score</span>
                <span className="priority-score-value">
                  {SEVERITY_LABEL[analysis.severity]}
                </span>
              </div>
              <div className="priority-bar-track">
                <div
                  className="priority-bar-fill"
                  style={{
                    width: `${priorityPct}%`,
                    background: priorityBarColor,
                  }}
                />
              </div>

              {/* AI Summary */}
              <div className="section-label" style={{ marginTop: "12px" }}>AI Summary</div>
              <div className="analysis-summary-box">{analysis.summary}</div>

              {/* Original Text / Observation */}
              <div className="section-label" style={{ marginTop: "12px" }}>Reported Text</div>
              <div className="reported-text-box">"{text}"</div>

              {/* Tags */}
              {analysis.keywords?.length > 0 && (
                <div className="analysis-tags">
                  {analysis.keywords.map((k) => (
                    <span key={k} className="analysis-tag">{k}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="card-section">
              {error && <div className="error-msg">{error}</div>}
              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setStep(1)}
                  id="btn-back"
                >
                  ← Edit Details
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={loading}
                  id="btn-confirm-submit"
                >
                  {loading ? <span className="spinner" /> : "Submit Complaint"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Step 3: Success */}
      {step === 3 && ticket && (
        <>
          <div className="page-title">
            {ticket.is_duplicate ? "Report Added" : "Complaint Submitted"}
          </div>
          <div className="page-subtitle">
            {ticket.is_duplicate
              ? "Your report has been added to an existing incident."
              : "Your complaint has been logged and assigned."}
          </div>

          {ticket.is_duplicate && (
            <div className="duplicate-notice" style={{ marginBottom: "16px" }}>
              <div className="duplicate-notice-header">
                <span className="duplicate-icon">⚠</span>
                <span className="duplicate-title">Similar Incident Found</span>
              </div>
              <p className="duplicate-desc">
                This issue appears to match an existing incident nearby. Your
                report has been counted and the priority has been updated.
              </p>
              <div className="duplicate-ticket-ref">
                <span className="duplicate-ticket-id">INC-{ticket.id}</span>
                <span className="duplicate-ticket-reports">
                  {ticket.report_count} citizen reports
                </span>
              </div>
            </div>
          )}

          <div className="success-card">
            <div className="success-banner">
              <span className="success-banner-icon">
                {ticket.is_duplicate ? "📊" : "✅"}
              </span>
              <div className="success-banner-title">
                {ticket.is_duplicate ? "Report Registered" : "Complaint Logged"}
              </div>
              <div className="success-banner-desc">
                {ticket.is_duplicate
                  ? `This issue now has ${ticket.report_count} citizen reports and has been escalated in priority.`
                  : `Your complaint has been assigned to ${ticket.department} for action.`}
              </div>
            </div>

            <div className="ticket-id-section">
              <div className="ticket-id-label">Your Ticket ID</div>
              <div className="ticket-id-value" id="submitted-ticket-id">
                INC-{ticket.id}
              </div>
              <div className="ticket-id-hint">
                Save this ID to track your complaint status
              </div>
            </div>

            <div className="success-actions">
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={reset}
                id="btn-report-another"
              >
                Report Another Issue
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => onTrackTicket?.(ticket.id)}
                id="btn-track-complaint"
              >
                Track Complaint
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
