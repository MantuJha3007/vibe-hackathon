import { useState, Fragment } from "react";
import VoiceRecorder from "./VoiceRecorder";
import { analyzeComplaint, submitComplaint, submitVoiceComplaint } from "../api/client";

const SEVERITY_COLOR = ["", "#16A34A", "#16A34A", "#D97706", "#EA580C", "#DC2626"];
const SEVERITY_LABEL = ["", "Minor", "Low", "Moderate", "High", "Critical"];

const SEV_PRIORITY = {
  1: { label: "Low", cls: "badge-low" },
  2: { label: "Low", cls: "badge-low" },
  3: { label: "Medium", cls: "badge-medium" },
  4: { label: "High", cls: "badge-high" },
  5: { label: "Critical", cls: "badge-critical" },
};

export default function ComplaintForm({ onSuccess }) {
  const [step, setStep] = useState(1); // 1=input, 2=preview, 3=done
  const [inputMode, setInputMode] = useState("text");
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
    } catch {
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
    } catch {
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
    } catch {
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

  // Progress connector helper
  const steps = [
    { label: "Describe Issue", num: 1 },
    { label: "Review", num: 2 },
    { label: "Submitted", num: 3 },
  ];

  const priority = analysis ? SEV_PRIORITY[analysis.severity] : null;

  // Priority bar score (normalize severity 1-5 to 0-100)
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
            {/* Mode Toggle */}
            <div className="card-section">
              <div className="mode-toggle">
                <button
                  className={`mode-btn ${inputMode === "text" ? "active" : ""}`}
                  onClick={() => setInputMode("text")}
                  id="btn-mode-text"
                >
                  ✏️ Text Report
                </button>
                <button
                  className={`mode-btn ${inputMode === "voice" ? "active" : ""}`}
                  onClick={() => setInputMode("voice")}
                  id="btn-mode-voice"
                >
                  🎙 Voice Report
                </button>
              </div>

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

              {inputMode === "voice" && (
                <>
                  <div className="section-label">Voice Report</div>
                  <p style={{ fontSize: "13.5px", color: "var(--text-muted)", marginBottom: "12px", lineHeight: "1.5" }}>
                    Click the button below and describe your issue clearly.
                  </p>
                  {error && <div className="error-msg">{error}</div>}
                  {loading && (
                    <div className="loading-voice">
                      <span className="spinner-dark" />
                      Transcribing and analyzing…
                    </div>
                  )}
                  <VoiceRecorder onTranscript={handleVoiceBlob} disabled={loading} />
                </>
              )}
            </div>

            {/* Location */}
            <div className="card-section">
              <div className="section-label">Location</div>
              <div className="location-row">
                <span className="location-icon">📍</span>
                <span className="location-text" style={{ color: "var(--text-muted)" }}>
                  Location will be captured automatically
                </span>
                <button className="location-action">Use my location</button>
              </div>
            </div>

            {/* CTA */}
            {inputMode === "text" && (
              <div className="card-section">
                {error && <div className="error-msg">{error}</div>}
                <button
                  className="btn btn-primary btn-full"
                  onClick={handleAnalyze}
                  disabled={loading || text.trim().length < 10}
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
              <div className="section-label" style={{ marginTop: "4px" }}>AI Summary</div>
              <div className="analysis-summary-box">{analysis.summary}</div>

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
                  className="btn btn-ghost"
                  onClick={() => setStep(1)}
                  id="btn-back"
                >
                  ← Edit Details
                </button>
                <button
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
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={reset}
                id="btn-report-another"
              >
                Report Another Issue
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
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
