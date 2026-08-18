import { useState, useEffect, useCallback } from "react";
import TicketMap from "../components/TicketMap";
import TicketList from "../components/TicketList";
import TicketDetail from "../components/TicketDetail";
import { getTickets } from "../api/client";

export default function Dashboard() {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("split"); // split | map | list

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? { status: filter } : {};
      const data = await getTickets(params);
      setTickets(data.tickets);
    } catch {
      setError("Could not load tickets from backend.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  function handleUpdate(updated) {
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelected(updated);
  }

  const counts = {
    all: tickets.length,
    new: tickets.filter((t) => t.status === "new").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  const avgSeverity = tickets.length
    ? (tickets.reduce((s, t) => s + t.severity, 0) / tickets.length).toFixed(1)
    : "—";

  return (
    <div className="dashboard">
      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-card" id="stat-total">
          <span className="stat-num">{counts.all}</span>
          <span className="stat-lbl">Total</span>
        </div>
        <div className="stat-card stat-new" id="stat-new">
          <span className="stat-num">{counts.new}</span>
          <span className="stat-lbl">New</span>
        </div>
        <div className="stat-card stat-progress" id="stat-progress">
          <span className="stat-num">{counts.in_progress}</span>
          <span className="stat-lbl">In Progress</span>
        </div>
        <div className="stat-card stat-resolved" id="stat-resolved">
          <span className="stat-num">{counts.resolved}</span>
          <span className="stat-lbl">Resolved</span>
        </div>
        <div className="stat-card" id="stat-severity">
          <span className="stat-num">{avgSeverity}</span>
          <span className="stat-lbl">Avg Severity</span>
        </div>
        <button className="refresh-btn" onClick={load} id="btn-refresh" title="Refresh">
          🔄
        </button>
      </div>

      {/* Filter & View Controls */}
      <div className="controls-bar">
        <div className="filter-tabs">
          {["all", "new", "in_progress", "resolved"].map((f) => (
            <button
              key={f}
              id={`filter-${f}`}
              className={`filter-tab ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f === "in_progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="view-tabs">
          {["split", "map", "list"].map((v) => (
            <button
              key={v}
              id={`view-${v}`}
              className={`view-tab ${view === v ? "active" : ""}`}
              onClick={() => setView(v)}
            >
              {v === "split" ? "⬛ Split" : v === "map" ? "🗺 Map" : "📋 List"}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <div className="loading-bar" />}

      {/* Main Content */}
      <div className={`dashboard-body view-${view}`}>
        {(view === "split" || view === "map") && (
          <div className="map-pane">
            <TicketMap tickets={tickets} selected={selected} onSelect={setSelected} />
          </div>
        )}
        {(view === "split" || view === "list") && (
          <div className="list-pane">
            <TicketList tickets={tickets} selected={selected} onSelect={setSelected} />
          </div>
        )}
        <div className={`detail-pane ${selected ? "has-ticket" : ""}`}>
          <TicketDetail
            ticket={selected}
            onUpdate={handleUpdate}
            onClose={() => setSelected(null)}
          />
        </div>
      </div>
    </div>
  );
}
