const SEV_COLOR = { 1: "#4ade80", 2: "#a3e635", 3: "#facc15", 4: "#fb923c", 5: "#f87171" };
const STATUS_BADGE = {
  new: { label: "New", cls: "badge-new" },
  in_progress: { label: "In Progress", cls: "badge-progress" },
  resolved: { label: "Resolved", cls: "badge-resolved" },
};

export default function TicketList({ tickets, selected, onSelect }) {
  return (
    <div className="ticket-list">
      {tickets.length === 0 && (
        <div className="empty-list">No tickets match the current filter.</div>
      )}
      {tickets.map((ticket) => {
        const badge = STATUS_BADGE[ticket.status] || { label: ticket.status, cls: "" };
        return (
          <div
            key={ticket.id}
            className={`ticket-row ${selected?.id === ticket.id ? "selected" : ""}`}
            onClick={() => onSelect(ticket)}
            id={`ticket-row-${ticket.id}`}
          >
            <div className="ticket-row-left">
              <div
                className="sev-bar"
                style={{ background: SEV_COLOR[ticket.severity] }}
                title={`Severity ${ticket.severity}`}
              />
              <div className="ticket-row-info">
                <div className="ticket-row-top">
                  <span className="ticket-row-id">#{ticket.id}</span>
                  <span className="ticket-row-cat">{ticket.category}</span>
                  {ticket.report_count > 1 && (
                    <span className="report-count" title="Reports">🔥 {ticket.report_count}</span>
                  )}
                </div>
                <div className="ticket-row-summary">{ticket.summary}</div>
                <div className="ticket-row-meta">
                  <span>{ticket.department}</span>
                  {ticket.address && <span>· {ticket.address}</span>}
                  <span>· Priority {ticket.priority_score.toFixed(1)}</span>
                </div>
              </div>
            </div>
            <div className="ticket-row-right">
              <span className={`status-badge ${badge.cls}`}>{badge.label}</span>
              <span className="ticket-date">
                {new Date(ticket.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
