import { useState, useEffect, useCallback } from "react";
import TicketMap from "../components/TicketMap";
import TicketList from "../components/TicketList";
import TicketDetail from "../components/TicketDetail";
import { getTickets } from "../api/client";

const SEV_LABEL = { 1: "Low", 2: "Low", 3: "Medium", 4: "High", 5: "Critical" };

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Dashboard({ initialView }) {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState(() => {
    if (initialView) return initialView;
    try {
      const saved = localStorage.getItem("sentinel_preferences");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.defaultView) return parsed.defaultView;
      }
    } catch {}
    return "split";
  });
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (initialView) {
      setView(initialView);
    }
  }, [initialView]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? { status: filter } : {};
      const data = await getTickets(params);
      setTickets(data.tickets);
      setLastUpdated(new Date());
    } catch {
      setError("Could not load tickets from backend.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  function handleUpdate(updated) {
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelected(updated);
  }

  const allTickets = tickets; // for KPIs we always use the full list
  const counts = {
    all: tickets.length,
    new: tickets.filter((t) => t.status === "new").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    high_priority: tickets.filter((t) => t.severity >= 4).length,
  };

  const filterLabels = {
    all: "All",
    new: "New",
    in_progress: "In Progress",
    resolved: "Resolved",
  };

  const viewLabels = {
    split: "Split",
    map: "Map",
    list: "List",
  };

  return (
    <div className="dashboard">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Overview</div>
          <div className="page-description">
            Monitor and manage all civic and industrial incidents.
          </div>
        </div>
        <div className="page-header-right">
          {lastUpdated && (
            <span className="last-updated">
              Updated {timeAgo(lastUpdated.toISOString())}
            </span>
          )}
          <div className="header-badge">
            <span className="status-dot" />
            Operational
          </div>
          <button className="refresh-btn" onClick={load} id="btn-refresh">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="kpi-row">
        <div className="kpi-card" id="kpi-total">
          <div className="kpi-body">
            <div className="kpi-label">Total Incidents</div>
            <div className="kpi-value">{counts.all}</div>
            <div className="kpi-trend">All time</div>
          </div>
          <div className="kpi-icon kpi-icon-total">📊</div>
        </div>
        <div className="kpi-card" id="kpi-high">
          <div className="kpi-body">
            <div className="kpi-label">High Priority</div>
            <div className="kpi-value">{counts.high_priority}</div>
            <div className="kpi-trend warn">Sev 4–5</div>
          </div>
          <div className="kpi-icon kpi-icon-high">🔴</div>
        </div>
        <div className="kpi-card" id="kpi-progress">
          <div className="kpi-body">
            <div className="kpi-label">In Progress</div>
            <div className="kpi-value">{counts.in_progress}</div>
            <div className="kpi-trend">Active</div>
          </div>
          <div className="kpi-icon kpi-icon-progress">🔧</div>
        </div>
        <div className="kpi-card" id="kpi-resolved">
          <div className="kpi-body">
            <div className="kpi-label">Resolved</div>
            <div className="kpi-value">{counts.resolved}</div>
            <div className="kpi-trend up">Closed</div>
          </div>
          <div className="kpi-icon kpi-icon-resolved">✅</div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="controls-bar">
        <div className="filter-tabs">
          {["all", "new", "in_progress", "resolved"].map((f) => (
            <button
              key={f}
              id={`filter-${f}`}
              className={`filter-tab ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {filterLabels[f]}{" "}
              {f !== "all" && (
                <span style={{ opacity: 0.65, marginLeft: 2 }}>
                  ({counts[f] ?? 0})
                </span>
              )}
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
              {viewLabels[v]}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}
      {loading && <div className="loading-bar" />}

      {/* Main Content */}
      <div className={`dashboard-body view-${view}`}>
        {(view === "split" || view === "map") && (
          <div className="map-pane">
            <TicketMap
              tickets={tickets}
              selected={selected}
              onSelect={setSelected}
            />
          </div>
        )}
        {(view === "split" || view === "list") && (
          <div className="list-pane">
            <TicketList
              tickets={tickets}
              selected={selected}
              onSelect={setSelected}
            />
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
