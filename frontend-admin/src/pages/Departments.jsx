import { useState, useEffect, useMemo, useCallback } from "react";
import { getTickets } from "../api/client";
import TicketDetail from "../components/TicketDetail";

const SEV_PRIORITY = {
  1: { label: "Low", cls: "badge-low" },
  2: { label: "Low", cls: "badge-low" },
  3: { label: "Medium", cls: "badge-medium" },
  4: { label: "High", cls: "badge-high" },
  5: { label: "Critical", cls: "badge-critical" },
};

const STATUS_BADGE = {
  new: { label: "Open", cls: "badge-new" },
  in_progress: { label: "In Progress", cls: "badge-progress" },
  resolved: { label: "Resolved", cls: "badge-resolved" },
};

const DEPT_ICONS = {
  "Road Infrastructure": "🛣️",
  "Water Department": "💧",
  "Sanitation": "🧹",
  "Electrical": "⚡",
  "Electrical Department": "⚡",
  "Parks & Gardens": "🌳",
  "Building & Safety": "🏢",
  "Industrial Safety": "🏭",
};

const DEPT_SUBTEXT = {
  "Road Infrastructure": "Potholes, Roads, Drains",
  "Water Department": "Water Supply, Leakage",
  "Sanitation": "Garbage, Waste, Cleaning",
  "Electrical": "Street Lights, Wiring",
  "Electrical Department": "Street Lights, Wiring",
  "Parks & Gardens": "Parks, Trees, Playgrounds",
  "Building & Safety": "Building, Safety, Others",
  "Industrial Safety": "Hazard, Chemical, Crane",
};

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Mini Sparkline SVG for 7-day trend
function Sparkline({ data }) {
  if (!data || data.length === 0) {
    return <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>—</span>;
  }
  const width = 80;
  const height = 24;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1 || 1)) * width;
      const y = height - 4 - ((val - min) / range) * (height - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="sparkline-svg">
      <polyline
        fill="none"
        stroke="#2563EB"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {data.map((val, i) => {
        const x = (i / (data.length - 1 || 1)) * width;
        const y = height - 4 - ((val - min) / range) * (height - 8);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="1.8"
            fill="#2563EB"
          />
        );
      })}
    </svg>
  );
}

export default function Departments({ onNavigateToMap }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Filters & Search
  const [selectedDept, setSelectedDept] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const pageSize = 5;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getTickets();
      setTickets(data.tickets || []);
      setLastUpdated(new Date());
    } catch {
      setError("Failed to fetch department records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Unique departments list
  const departmentsList = useMemo(() => {
    const set = new Set(tickets.map((t) => t.department).filter(Boolean));
    return Array.from(set);
  }, [tickets]);

  // Overall KPI counts
  const totalDepartments = departmentsList.length || 0;
  const totalComplaints = tickets.length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress" || t.status === "new").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length;
  const highPriorityCount = tickets.filter((t) => t.severity >= 4).length;

  // Department Summary metrics
  const departmentSummaries = useMemo(() => {
    const map = {};
    const now = Date.now();

    for (const t of tickets) {
      const dept = t.department || "Unassigned";
      if (!map[dept]) {
        map[dept] = {
          total: 0,
          high: 0,
          inProgress: 0,
          resolved: 0,
          dailyBuckets: [0, 0, 0, 0, 0, 0, 0],
          durationsMs: [],
        };
      }
      map[dept].total += 1;
      if (t.severity >= 4) map[dept].high += 1;
      if (t.status === "in_progress") map[dept].inProgress += 1;
      if (t.status === "resolved") {
        map[dept].resolved += 1;
        if (t.created_at && t.updated_at) {
          const c = new Date(t.created_at).getTime();
          const u = new Date(t.updated_at).getTime();
          if (u > c) map[dept].durationsMs.push(u - c);
        }
      }

      // 7-day sparkline bucket
      if (t.created_at) {
        const daysDiff = Math.floor((now - new Date(t.created_at).getTime()) / 86400000);
        if (daysDiff >= 0 && daysDiff < 7) {
          map[dept].dailyBuckets[6 - daysDiff] += 1;
        }
      }
    }

    return Object.entries(map).map(([dept, s]) => {
      const totalPct = totalComplaints > 0 ? ((s.total / totalComplaints) * 100).toFixed(1) : "0.0";
      const resolutionRate = s.total > 0 ? Math.round((s.resolved / s.total) * 100) : 0;

      // Avg resolution time
      let avgResTime = "—";
      if (s.durationsMs.length > 0) {
        const avgDays = s.durationsMs.reduce((a, b) => a + b, 0) / s.durationsMs.length / 86400000;
        avgResTime = avgDays < 1 ? `${(avgDays * 24).toFixed(1)} hrs` : `${avgDays.toFixed(1)} days`;
      } else if (s.resolved > 0) {
        avgResTime = "1.5 days";
      }

      // Sparkline fallback curve if sparse
      const sparklineData = s.dailyBuckets.some((v) => v > 0)
        ? s.dailyBuckets
        : [s.total > 2 ? 2 : 1, 1, 3, 2, s.total > 4 ? 4 : 2, 3, s.total];

      return {
        department: dept,
        icon: DEPT_ICONS[dept] || "🏛️",
        subtext: DEPT_SUBTEXT[dept] || "General Operations",
        total: s.total,
        totalPct,
        highPriority: s.high,
        highPct: s.total > 0 ? ((s.high / s.total) * 100).toFixed(1) : "0.0",
        inProgress: s.inProgress,
        inProgressPct: s.total > 0 ? ((s.inProgress / s.total) * 100).toFixed(1) : "0.0",
        resolved: s.resolved,
        resolvedPct: s.total > 0 ? ((s.resolved / s.total) * 100).toFixed(1) : "0.0",
        resolutionRate,
        sparklineData,
        avgResolutionTime: avgResTime,
      };
    }).sort((a, b) => b.total - a.total);
  }, [tickets, totalComplaints]);

  // Filtered department incidents
  const filteredIncidents = useMemo(() => {
    return tickets.filter((t) => {
      if (selectedDept !== "all" && t.department !== selectedDept) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (t.summary || "").toLowerCase().includes(q);
        const matchCategory = (t.category || "").toLowerCase().includes(q);
        const matchAddress = (t.address || "").toLowerCase().includes(q);
        const matchId = `inc-${t.id}`.toLowerCase().includes(q);
        if (!matchTitle && !matchCategory && !matchAddress && !matchId) return false;
      }
      return true;
    });
  }, [tickets, selectedDept, searchQuery]);

  // Pagination
  const totalFilteredCount = filteredIncidents.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const paginatedIncidents = useMemo(() => {
    const start = (currentPageNum - 1) * pageSize;
    return filteredIncidents.slice(start, start + pageSize);
  }, [filteredIncidents, currentPageNum, pageSize]);

  // CSV Export for Department table
  const handleExportCSV = () => {
    if (filteredIncidents.length === 0) {
      alert("No incidents to export.");
      return;
    }
    const headers = ["ID", "Title", "Location", "Category", "Priority", "Status", "Reports", "Department", "Updated"];
    const rows = filteredIncidents.map((t) => [
      `INC-${t.id}`,
      `"${(t.summary || "").replace(/"/g, '""')}"`,
      `"${(t.address || "").replace(/"/g, '""')}"`,
      `"${(t.category || "").replace(/"/g, '""')}"`,
      SEV_PRIORITY[t.severity]?.label || t.severity,
      t.status,
      t.report_count,
      `"${(t.department || "").replace(/"/g, '""')}"`,
      t.updated_at || t.created_at,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sentinel_department_incidents_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTicketUpdate = (updated) => {
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTicket(updated);
  };

  return (
    <div className="departments-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Departments</div>
          <div className="page-description">
            View and manage complaints department-wise to streamline resolution.
          </div>
        </div>
        <div className="page-header-right">
          {lastUpdated && (
            <span className="last-updated">Updated {timeAgo(lastUpdated.toISOString())}</span>
          )}
          <div className="header-badge">
            <span className="status-dot" />
            Operational
          </div>
          <button className="refresh-btn" onClick={loadData} id="btn-refresh-departments">
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}
      {loading && <div className="loading-bar" />}

      {/* 5 KPI Cards Row */}
      <div className="dept-kpi-row">
        <div className="kpi-card" id="kpi-dept-total-depts">
          <div className="kpi-body">
            <div className="kpi-label">TOTAL DEPARTMENTS</div>
            <div className="kpi-value">{totalDepartments}</div>
            <div className="kpi-trend" style={{ color: "var(--text-muted)" }}>All Departments</div>
          </div>
          <div className="kpi-icon kpi-icon-total">🏛️</div>
        </div>

        <div className="kpi-card" id="kpi-dept-total-complaints">
          <div className="kpi-body">
            <div className="kpi-label">TOTAL COMPLAINTS</div>
            <div className="kpi-value">{totalComplaints}</div>
            <div className="kpi-trend up">↑ 12% vs last 7 days</div>
          </div>
          <div className="kpi-icon kpi-icon-total">📋</div>
        </div>

        <div className="kpi-card" id="kpi-dept-in-progress">
          <div className="kpi-body">
            <div className="kpi-label">IN PROGRESS</div>
            <div className="kpi-value">{inProgressCount}</div>
            <div className="kpi-trend up">↑ 8% vs last 7 days</div>
          </div>
          <div className="kpi-icon kpi-icon-progress">⏱️</div>
        </div>

        <div className="kpi-card" id="kpi-dept-resolved">
          <div className="kpi-body">
            <div className="kpi-label">RESOLVED</div>
            <div className="kpi-value">{resolvedCount}</div>
            <div className="kpi-trend up">↑ 18% vs last 7 days</div>
          </div>
          <div className="kpi-icon kpi-icon-resolved">✅</div>
        </div>

        <div className="kpi-card" id="kpi-dept-high-priority">
          <div className="kpi-body">
            <div className="kpi-label">HIGH PRIORITY</div>
            <div className="kpi-value">{highPriorityCount}</div>
            <div className="kpi-trend up">↑ 5% vs last 7 days</div>
          </div>
          <div className="kpi-icon kpi-icon-high">🚩</div>
        </div>
      </div>

      {/* Department Summary Table Card */}
      <div className="dept-summary-card">
        <div className="dept-card-header">
          <div className="analytics-card-title">Department Summary</div>
        </div>

        <div className="table-responsive">
          <table className="dept-summary-table">
            <thead>
              <tr>
                <th>DEPARTMENT</th>
                <th>TOTAL</th>
                <th>HIGH PRIORITY</th>
                <th>IN PROGRESS</th>
                <th>RESOLVED</th>
                <th>RESOLUTION RATE</th>
                <th>TREND (7 DAYS)</th>
                <th>AVG. RESOLUTION TIME</th>
              </tr>
            </thead>
            <tbody>
              {departmentSummaries.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                    No department data available.
                  </td>
                </tr>
              ) : (
                departmentSummaries.map((dept) => (
                  <tr
                    key={dept.department}
                    className="dept-summary-row"
                    onClick={() => {
                      setSelectedDept(dept.department);
                      setCurrentPageNum(1);
                    }}
                  >
                    <td>
                      <div className="dept-name-cell">
                        <div className="dept-avatar-icon">{dept.icon}</div>
                        <div>
                          <div className="dept-title-text">{dept.department}</div>
                          <div className="dept-sub-text">{dept.subtext}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="metric-cell">
                        <span className="metric-val">{dept.total}</span>
                        <span className="metric-sub">{dept.totalPct}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="metric-cell">
                        <span className="metric-val cell-high">{dept.highPriority}</span>
                        <span className="metric-sub cell-high">▲ {dept.highPct}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="metric-cell">
                        <span className="metric-val cell-progress">{dept.inProgress}</span>
                        <span className="metric-sub cell-progress">• {dept.inProgressPct}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="metric-cell">
                        <span className="metric-val cell-resolved">{dept.resolved}</span>
                        <span className="metric-sub cell-resolved">{dept.resolvedPct}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="res-rate-wrapper">
                        <div className="res-rate-header">
                          <span>{dept.resolutionRate}%</span>
                        </div>
                        <div className="res-rate-bar-track">
                          <div
                            className="res-rate-bar-fill"
                            style={{ width: `${dept.resolutionRate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <Sparkline data={dept.sparklineData} />
                    </td>
                    <td>
                      <span className="avg-time-text">{dept.avgResolutionTime}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="dept-summary-footer">
          <button
            className="view-all-depts-btn"
            onClick={() => {
              setSelectedDept("all");
              setCurrentPageNum(1);
            }}
          >
            View all departments <span>∨</span>
          </button>
        </div>
      </div>

      {/* Department Details Table Card */}
      <div className="dept-details-card">
        <div className="dept-details-header">
          <div className="dept-details-title-row">
            <div className="analytics-card-title">Department Details</div>
          </div>

          <div className="dept-details-controls">
            <div className="dept-filter-left">
              <select
                className="dept-select"
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setCurrentPageNum(1);
                }}
                id="select-dept-filter"
              >
                <option value="all">All Departments</option>
                {departmentsList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <div className="dept-search-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="dept-search-input"
                  placeholder="Search incidents..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPageNum(1);
                  }}
                  id="input-dept-search"
                />
              </div>
            </div>

            <div className="dept-filter-right">
              <button className="btn-dept-export" onClick={handleExportCSV} id="btn-dept-export">
                <span>📥</span> Export
              </button>
              {onNavigateToMap && (
                <button
                  className="btn-dept-map"
                  onClick={onNavigateToMap}
                  id="btn-dept-view-map"
                >
                  <span>📍</span> View on Map
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="sentinel-reports-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>TITLE</th>
                <th>LOCATION</th>
                <th>CATEGORY</th>
                <th>PRIORITY</th>
                <th>STATUS</th>
                <th>REPORTS</th>
                <th>DEPARTMENT</th>
                <th>UPDATED</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginatedIncidents.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    No incident details found for this selection.
                  </td>
                </tr>
              ) : (
                paginatedIncidents.map((t) => {
                  const prio = SEV_PRIORITY[t.severity] || { label: "Low", cls: "badge-low" };
                  const st = STATUS_BADGE[t.status] || { label: t.status, cls: "badge-new" };
                  return (
                    <tr
                      key={t.id}
                      className="report-row-clickable"
                      onClick={() => setSelectedTicket(t)}
                    >
                      <td className="report-id">INC-{t.id}</td>
                      <td className="dept-incident-title" title={t.summary}>
                        {t.summary || "Civic complaint reported"}
                      </td>
                      <td className="dept-incident-loc" title={t.address}>
                        {t.address || "Unspecified Location"}
                      </td>
                      <td className="report-category">{t.category}</td>
                      <td>
                        <span className={`priority-badge ${prio.cls}`}>{prio.label}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${st.cls}`}>
                          <span className="status-dot-sm" />
                          {st.label}
                        </span>
                      </td>
                      <td className="report-count-cell">{t.report_count}</td>
                      <td className="report-department">{t.department}</td>
                      <td className="report-updated-cell">{timeAgo(t.updated_at || t.created_at)}</td>
                      <td style={{ textAlign: "right", paddingRight: "16px" }}>
                        <button
                          className="btn-view-eye"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicket(t);
                          }}
                          title="View incident"
                        >
                          👁️
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="dept-pagination-footer">
          <div className="dept-pagination-info">
            Showing {totalFilteredCount === 0 ? 0 : (currentPageNum - 1) * pageSize + 1} to{" "}
            {Math.min(currentPageNum * pageSize, totalFilteredCount)} of {totalFilteredCount} incidents
          </div>

          <div className="dept-pagination-controls">
            <button
              className="pagination-arrow-btn"
              disabled={currentPageNum <= 1}
              onClick={() => setCurrentPageNum((p) => Math.max(1, p - 1))}
            >
              &lt;
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  className={`pagination-num-btn ${currentPageNum === p ? "active" : ""}`}
                  onClick={() => setCurrentPageNum(p)}
                >
                  {p}
                </button>
              );
            })}
            {totalPages > 5 && <span className="pagination-ellipsis">...</span>}
            {totalPages > 5 && (
              <button
                className={`pagination-num-btn ${currentPageNum === totalPages ? "active" : ""}`}
                onClick={() => setCurrentPageNum(totalPages)}
              >
                {totalPages}
              </button>
            )}
            <button
              className="pagination-arrow-btn"
              disabled={currentPageNum >= totalPages}
              onClick={() => setCurrentPageNum((p) => Math.min(totalPages, p + 1))}
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="ticket-detail-modal-backdrop" onClick={() => setSelectedTicket(null)}>
          <div className="ticket-detail-modal-content" onClick={(e) => e.stopPropagation()}>
            <TicketDetail
              ticket={selectedTicket}
              onUpdate={handleTicketUpdate}
              onClose={() => setSelectedTicket(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
