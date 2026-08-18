import { useState } from "react";
import { getTicket } from "../api/client";

const STATUS_CONFIG = {
  new: { label: "New", color: "#60a5fa", icon: "🆕", desc: "Your complaint has been received and queued." },
  in_progress: { label: "In Progress", color: "#facc15", icon: "🔧", desc: "The concerned department is working on your issue." },
  resolved: { label: "Resolved", color: "#4ade80", icon: "✅", desc: "Your issue has been resolved. Thank you for reporting!" },
};

export default function StatusTracker() {
  const [ticketId, setTicketId] = useState("");
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleTrack(e) {
    e.preventDefault();
    const id = ticketId.replace("#", "").trim();
    if (!id || isNaN(Number(id))) {
      setError("Please enter a valid numeric ticket ID.");
      return;
    }
    setLoading(true);
    setError("");
    setTicket(null);
    try {
      const t = await getTicket(Number(id));
      setTicket(t);
    } catch {
      setError(`Ticket #${id} not found. Please check your ticket number.`);
    } finally {
      setLoading(false);
    }
  }

  const cfg = ticket ? STATUS_CONFIG[ticket.status] : null;

  return (
    <div className="status-tracker glass-card">
      <h2>Track Your Complaint</h2>
      <p className="subtitle">Enter your ticket ID to see the current status</p>

      <form onSubmit={handleTrack} className="track-form">
        <div className="input-group">
          <span className="input-prefix">#</span>
          <input
            id="ticket-id-input"
            type="text"
            className="track-input"
            placeholder="Enter ticket number..."
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
          />
        </div>
        <button
          id="btn-track"
          className="btn btn-primary"
          type="submit"
          disabled={loading || !ticketId.trim()}
        >
          {loading ? <span className="spinner" /> : "🔍 Track"}
        </button>
      </form>

      {error && <div className="error-msg">{error}</div>}

      {ticket && cfg && (
        <div className="ticket-result">
          <div className="status-header" style={{ borderColor: cfg.color }}>
            <span className="status-icon" style={{ fontSize: "2.5rem" }}>{cfg.icon}</span>
            <div>
              <div className="status-label" style={{ color: cfg.color }}>{cfg.label}</div>
              <div className="status-desc">{cfg.desc}</div>
            </div>
          </div>

          <div className="ticket-details">
            <div className="detail-row">
              <span>Ticket ID</span><span>#{ticket.id}</span>
            </div>
            <div className="detail-row">
              <span>Issue Type</span><span>{ticket.category}</span>
            </div>
            <div className="detail-row">
              <span>Department</span><span>{ticket.department}</span>
            </div>
            <div className="detail-row">
              <span>Reports</span><span>{ticket.report_count} person{ticket.report_count > 1 ? "s" : ""} reported this</span>
            </div>
            <div className="detail-row">
              <span>Severity</span>
              <span className={`sev sev-${ticket.severity}`}>
                {"●".repeat(ticket.severity)}{"○".repeat(5 - ticket.severity)}
              </span>
            </div>
            <div className="detail-row">
              <span>Submitted</span>
              <span>{new Date(ticket.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          </div>

          <div className="status-timeline">
            {["new", "in_progress", "resolved"].map((s, i) => {
              const statuses = ["new", "in_progress", "resolved"];
              const currentIdx = statuses.indexOf(ticket.status);
              const isDone = i <= currentIdx;
              const c = STATUS_CONFIG[s];
              return (
                <div key={s} className={`timeline-step ${isDone ? "done" : ""}`}>
                  <div className="timeline-dot" style={{ background: isDone ? c.color : "#334155" }}>
                    {isDone ? "✓" : i + 1}
                  </div>
                  <span>{c.label}</span>
                  {i < 2 && <div className={`timeline-line ${isDone && i < currentIdx ? "done" : ""}`} />}
                </div>
              );
            })}
          </div>

          <p className="ticket-summary">"{ticket.summary}"</p>
        </div>
      )}
    </div>
  );
}
