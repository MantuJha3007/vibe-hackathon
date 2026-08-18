// Severity → priority label and badge class
const SEV_PRIORITY = {
  1: { label: "Low", cls: "badge-low" },
  2: { label: "Low", cls: "badge-low" },
  3: { label: "Medium", cls: "badge-medium" },
  4: { label: "High", cls: "badge-high" },
  5: { label: "Critical", cls: "badge-critical" },
};

const STATUS_BADGE = {
  new: { label: "New", cls: "badge-new" },
  in_progress: { label: "In Progress", cls: "badge-progress" },
  resolved: { label: "Resolved", cls: "badge-resolved" },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function TicketList({ tickets, selected, onSelect }) {
  return (
    <div>
      {/* Table Header */}
      <div className="ticket-table-header">
        <span className="th">ID</span>
        <span className="th">Category</span>
        <span className="th">Priority</span>
        <span className="th">Department</span>
        <span className="th">Status</span>
        <span className="th">Reports</span>
        <span className="th">Updated</span>
      </div>

      <div className="ticket-list">
        {tickets.length === 0 && (
          <div className="empty-list">No tickets match the current filter.</div>
        )}
        {tickets.map((ticket) => {
          const priority = SEV_PRIORITY[ticket.severity] || {
            label: "Unknown",
            cls: "",
          };
          const badge = STATUS_BADGE[ticket.status] || {
            label: ticket.status,
            cls: "",
          };
          return (
            <div
              key={ticket.id}
              className={`ticket-row ${
                selected?.id === ticket.id ? "selected" : ""
              }`}
              onClick={() => onSelect(ticket)}
              id={`ticket-row-${ticket.id}`}
            >
              <span className="td ticket-id-cell">INC-{ticket.id}</span>
              <span className="td ticket-cat-cell">{ticket.category}</span>
              <span className="td">
                <span className={`priority-badge ${priority.cls}`}>
                  {priority.label}
                </span>
              </span>
              <span className="td ticket-dept-cell" title={ticket.department}>
                {ticket.department}
              </span>
              <span className="td">
                <span className={`status-badge ${badge.cls}`}>
                  <span className="status-dot-sm" />
                  {badge.label}
                </span>
              </span>
              <span className="td ticket-reports-cell">
                {ticket.report_count}{" "}
                {ticket.report_count === 1 ? "report" : "reports"}
              </span>
              <span className="td ticket-time-cell">
                {timeAgo(ticket.updated_at || ticket.created_at)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
