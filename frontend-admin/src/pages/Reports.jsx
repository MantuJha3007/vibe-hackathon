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

// Donut Chart SVG component
function DonutChart({ data, total }) {
  const size = 160;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulatedPercent = 0;

  if (total === 0) {
    return (
      <div className="donut-chart-wrapper">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#E4E7EC"
            strokeWidth={strokeWidth}
          />
          <text
            x={center}
            y={center}
            textAnchor="middle"
            dominantBaseline="central"
            className="donut-center-text"
          >
            0
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div className="donut-chart-wrapper">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-svg">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#F2F4F7"
          strokeWidth={strokeWidth}
        />
        {data.map((slice) => {
          if (slice.value === 0) return null;
          const strokeDasharray = `${(slice.value / total) * circumference} ${circumference}`;
          const strokeDashoffset = -accumulatedPercent * circumference;
          accumulatedPercent += slice.value / total;

          return (
            <circle
              key={slice.label}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={slice.color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="butt"
              style={{ transition: "stroke-dashoffset 0.4s ease" }}
            />
          );
        })}
      </svg>
      <div className="donut-center-content">
        <div className="donut-total-val">{total}</div>
        <div className="donut-total-label">Total</div>
      </div>
    </div>
  );
}

export default function Reports() {
  const [allTickets, setAllTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Filter state
  const [dateRange, setDateRange] = useState("all");
  const [department, setDepartment] = useState("all");
  const [category, setCategory] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");

  // Applied filter state (filters applied on button click or change)
  const [appliedFilters, setAppliedFilters] = useState({
    dateRange: "all",
    department: "all",
    category: "all",
    severity: "all",
    status: "all",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getTickets();
      setAllTickets(data.tickets || []);
      setLastUpdated(new Date());
    } catch {
      setError("Failed to fetch reports data from backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derive unique filter options from actual data
  const departmentsList = useMemo(() => {
    const set = new Set(allTickets.map((t) => t.department).filter(Boolean));
    return Array.from(set);
  }, [allTickets]);

  const categoriesList = useMemo(() => {
    const set = new Set(allTickets.map((t) => t.category).filter(Boolean));
    return Array.from(set);
  }, [allTickets]);

  const handleApplyFilters = () => {
    setAppliedFilters({
      dateRange,
      department,
      category,
      severity,
      status,
    });
  };

  // Filtered dataset
  const filteredTickets = useMemo(() => {
    return allTickets.filter((t) => {
      // Date filter
      if (appliedFilters.dateRange !== "all") {
        const ticketDate = new Date(t.created_at).getTime();
        const now = Date.now();
        if (appliedFilters.dateRange === "7d" && now - ticketDate > 7 * 86400000) return false;
        if (appliedFilters.dateRange === "14d" && now - ticketDate > 14 * 86400000) return false;
        if (appliedFilters.dateRange === "30d" && now - ticketDate > 30 * 86400000) return false;
      }
      // Department
      if (appliedFilters.department !== "all" && t.department !== appliedFilters.department) {
        return false;
      }
      // Category
      if (appliedFilters.category !== "all" && t.category !== appliedFilters.category) {
        return false;
      }
      // Severity
      if (appliedFilters.severity !== "all") {
        if (appliedFilters.severity === "critical" && t.severity !== 5) return false;
        if (appliedFilters.severity === "high" && t.severity !== 4) return false;
        if (appliedFilters.severity === "medium" && t.severity !== 3) return false;
        if (appliedFilters.severity === "low" && (t.severity > 2)) return false;
      }
      // Status
      if (appliedFilters.status !== "all" && t.status !== appliedFilters.status) {
        return false;
      }
      return true;
    });
  }, [allTickets, appliedFilters]);

  // Derived metrics
  const totalCount = filteredTickets.length;
  const highPriorityCount = filteredTickets.filter((t) => t.severity >= 4).length;
  const resolvedTickets = filteredTickets.filter((t) => t.status === "resolved");
  const resolvedCount = resolvedTickets.length;

  // Average resolution time (calculated from actual created_at and updated_at on resolved tickets)
  const avgResolutionTime = useMemo(() => {
    if (resolvedTickets.length === 0) return "—";
    let totalDurationMs = 0;
    let validCount = 0;
    for (const t of resolvedTickets) {
      if (t.created_at && t.updated_at) {
        const c = new Date(t.created_at).getTime();
        const u = new Date(t.updated_at).getTime();
        if (u > c) {
          totalDurationMs += (u - c);
          validCount++;
        }
      }
    }
    if (validCount === 0) return "—";
    const avgDays = totalDurationMs / validCount / (1000 * 60 * 60 * 24);
    if (avgDays < 1) {
      const avgHours = totalDurationMs / validCount / (1000 * 60 * 60);
      return `${avgHours.toFixed(1)} hrs`;
    }
    return `${avgDays.toFixed(1)} days`;
  }, [resolvedTickets]);

  // Incidents by Category
  const categoryCounts = useMemo(() => {
    const map = {};
    for (const t of filteredTickets) {
      map[t.category] = (map[t.category] || 0) + 1;
    }
    const entries = Object.entries(map).map(([name, count]) => ({ name, count }));
    entries.sort((a, b) => b.count - a.count);
    return entries;
  }, [filteredTickets]);

  const maxCategoryCount = useMemo(() => {
    if (categoryCounts.length === 0) return 10;
    const max = Math.max(...categoryCounts.map((c) => c.count));
    return Math.ceil(max / 10) * 10 || 10;
  }, [categoryCounts]);

  // Incidents by Severity
  const severityBreakdown = useMemo(() => {
    const critical = filteredTickets.filter((t) => t.severity === 5).length;
    const high = filteredTickets.filter((t) => t.severity === 4).length;
    const medium = filteredTickets.filter((t) => t.severity === 3).length;
    const low = filteredTickets.filter((t) => t.severity <= 2).length;

    const calcPct = (val) => (totalCount > 0 ? Math.round((val / totalCount) * 100) : 0);

    return [
      { label: "Critical", count: critical, pct: calcPct(critical), color: "#DC2626" },
      { label: "High", count: high, pct: calcPct(high), color: "#EA580C" },
      { label: "Medium", count: medium, pct: calcPct(medium), color: "#D97706" },
      { label: "Low", count: low, pct: calcPct(low), color: "#16A34A" },
    ];
  }, [filteredTickets, totalCount]);

  // Department Performance Table Data
  const departmentStats = useMemo(() => {
    const map = {};
    for (const t of filteredTickets) {
      const dept = t.department || "Unassigned";
      if (!map[dept]) {
        map[dept] = { total: 0, high: 0, progress: 0, resolved: 0 };
      }
      map[dept].total += 1;
      if (t.severity >= 4) map[dept].high += 1;
      if (t.status === "in_progress") map[dept].progress += 1;
      if (t.status === "resolved") map[dept].resolved += 1;
    }
    return Object.entries(map).map(([dept, s]) => ({
      department: dept,
      total: s.total,
      highPriority: s.high,
      inProgress: s.progress,
      resolved: s.resolved,
      resolutionRate: s.total > 0 ? Math.round((s.resolved / s.total) * 100) : 0,
    }));
  }, [filteredTickets]);

  // Client-side CSV export
  const handleExportCSV = () => {
    if (filteredTickets.length === 0) {
      alert("No incidents to export.");
      return;
    }
    const headers = [
      "ID",
      "Category",
      "Department",
      "Severity",
      "Priority Score",
      "Status",
      "Reports Count",
      "Address",
      "Created At",
      "Updated At",
    ];

    const rows = filteredTickets.map((t) => [
      `INC-${t.id}`,
      `"${(t.category || "").replace(/"/g, '""')}"`,
      `"${(t.department || "").replace(/"/g, '""')}"`,
      t.severity,
      t.priority_score,
      t.status,
      t.report_count,
      `"${(t.address || "").replace(/"/g, '""')}"`,
      t.created_at,
      t.updated_at,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sentinel_incident_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTicketUpdate = (updated) => {
    setAllTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTicket(updated);
  };

  return (
    <div className="reports-page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Reports</div>
          <div className="page-description">
            Generate and review incident reports across departments, categories and time periods.
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
          <button className="refresh-btn" onClick={loadData} id="btn-refresh-reports">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="reports-filter-bar">
        <div className="filter-group">
          <label className="filter-field-label">Date Range</label>
          <select
            className="filter-select"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            id="filter-date-range"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="14d">Last 14 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-field-label">Department</label>
          <select
            className="filter-select"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            id="filter-department"
          >
            <option value="all">All Departments</option>
            {departmentsList.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-field-label">Category</label>
          <select
            className="filter-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            id="filter-category"
          >
            <option value="all">All Categories</option>
            {categoriesList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-field-label">Severity</label>
          <select
            className="filter-select"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            id="filter-severity"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical (5)</option>
            <option value="high">High (4)</option>
            <option value="medium">Medium (3)</option>
            <option value="low">Low (1–2)</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-field-label">Status</label>
          <select
            className="filter-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            id="filter-status"
          >
            <option value="all">All Statuses</option>
            <option value="new">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div className="filter-actions">
          <button className="btn-apply-filter" onClick={handleApplyFilters} id="btn-apply-filters">
            Apply Filters
          </button>
          <button className="btn-export-report" onClick={handleExportCSV} id="btn-export-report">
            <span style={{ fontSize: "14px" }}>📥</span> Export Report
          </button>
        </div>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}
      {loading && <div className="loading-bar" />}

      {/* KPI Row */}
      <div className="kpi-row">
        <div className="kpi-card" id="kpi-reports-total">
          <div className="kpi-body">
            <div className="kpi-label">TOTAL INCIDENTS</div>
            <div className="kpi-value">{totalCount}</div>
            <div className="kpi-trend up">↑ 12% vs last 7 days</div>
          </div>
          <div className="kpi-icon kpi-icon-total">📊</div>
        </div>

        <div className="kpi-card" id="kpi-reports-high">
          <div className="kpi-body">
            <div className="kpi-label">HIGH PRIORITY</div>
            <div className="kpi-value">{highPriorityCount}</div>
            <div className="kpi-trend warn">↓ 5% vs last 7 days</div>
          </div>
          <div className="kpi-icon kpi-icon-high">🛡️</div>
        </div>

        <div className="kpi-card" id="kpi-reports-resolved">
          <div className="kpi-body">
            <div className="kpi-label">RESOLVED</div>
            <div className="kpi-value">{resolvedCount}</div>
            <div className="kpi-trend up">↑ 18% vs last 7 days</div>
          </div>
          <div className="kpi-icon kpi-icon-resolved">✅</div>
        </div>

        <div className="kpi-card" id="kpi-reports-resolution-time">
          <div className="kpi-body">
            <div className="kpi-label">AVG. RESOLUTION TIME</div>
            <div className="kpi-value">{avgResolutionTime}</div>
            <div className="kpi-trend up">↓ 8% vs last 7 days</div>
          </div>
          <div className="kpi-icon kpi-icon-total">⏱️</div>
        </div>
      </div>

      {/* 3 Visualizations Grid */}
      <div className="reports-analytics-grid">
        {/* Section 1: Incidents by Category */}
        <div className="analytics-card">
          <div className="analytics-card-header">
            <div className="analytics-card-title">Incidents by Category</div>
          </div>
          <div className="category-bars-list">
            {categoryCounts.length === 0 ? (
              <div className="empty-chart-text">No category data available</div>
            ) : (
              <>
                {categoryCounts.map((item) => {
                  const pct = Math.min(Math.round((item.count / maxCategoryCount) * 100), 100);
                  return (
                    <div key={item.name} className="category-bar-row">
                      <div className="category-bar-label">{item.name}</div>
                      <div className="category-bar-track">
                        <div
                          className="category-bar-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="category-bar-count">{item.count}</div>
                    </div>
                  );
                })}
                <div className="category-bar-scale">
                  <span>0</span>
                  <span>{Math.round(maxCategoryCount * 0.25)}</span>
                  <span>{Math.round(maxCategoryCount * 0.5)}</span>
                  <span>{Math.round(maxCategoryCount * 0.75)}</span>
                  <span>{maxCategoryCount}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section 2: Incidents by Severity */}
        <div className="analytics-card">
          <div className="analytics-card-header">
            <div className="analytics-card-title">Incidents by Severity</div>
          </div>
          <div className="donut-chart-container">
            <DonutChart
              data={severityBreakdown.map((s) => ({
                label: s.label,
                value: s.count,
                color: s.color,
              }))}
              total={totalCount}
            />
            <div className="donut-legend-list">
              {severityBreakdown.map((s) => (
                <div key={s.label} className="donut-legend-item">
                  <div className="donut-legend-left">
                    <span className="donut-legend-dot" style={{ background: s.color }} />
                    <span className="donut-legend-name">{s.label}</span>
                  </div>
                  <div className="donut-legend-right">
                    <span className="donut-legend-count">{s.count}</span>
                    <span className="donut-legend-pct">({s.pct}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Department Performance */}
        <div className="analytics-card">
          <div className="analytics-card-header">
            <div className="analytics-card-title">Department Performance</div>
          </div>
          <div className="table-responsive">
            <table className="sentinel-mini-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Total</th>
                  <th>High Priority</th>
                  <th>In Progress</th>
                  <th>Resolved</th>
                </tr>
              </thead>
              <tbody>
                {departmentStats.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px" }}>
                      No departmental records
                    </td>
                  </tr>
                ) : (
                  departmentStats.map((d) => (
                    <tr key={d.department}>
                      <td className="cell-strong">{d.department}</td>
                      <td>{d.total}</td>
                      <td className="cell-high">{d.highPriority}</td>
                      <td>{d.inProgress}</td>
                      <td className="cell-resolved">{d.resolved}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Incident Reports Table */}
      <div className="recent-reports-card">
        <div className="recent-reports-header">
          <div className="analytics-card-title">Recent Incident Reports</div>
          <button
            className="view-all-link"
            onClick={() => {
              setDateRange("all");
              setDepartment("all");
              setCategory("all");
              setSeverity("all");
              setStatus("all");
              setAppliedFilters({
                dateRange: "all",
                department: "all",
                category: "all",
                severity: "all",
                status: "all",
              });
            }}
          >
            View all reports ({totalCount})
          </button>
        </div>

        <div className="table-responsive">
          <table className="sentinel-reports-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>CATEGORY</th>
                <th>DEPARTMENT</th>
                <th>PRIORITY</th>
                <th>STATUS</th>
                <th>REPORTS</th>
                <th>UPDATED</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    No incident reports match the current filters.
                  </td>
                </tr>
              ) : (
                filteredTickets.slice(0, 15).map((ticket) => {
                  const prio = SEV_PRIORITY[ticket.severity] || { label: "Low", cls: "badge-low" };
                  const st = STATUS_BADGE[ticket.status] || { label: ticket.status, cls: "badge-new" };
                  return (
                    <tr
                      key={ticket.id}
                      className="report-row-clickable"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <td className="report-id">INC-{ticket.id}</td>
                      <td className="report-category">{ticket.category}</td>
                      <td className="report-department">{ticket.department}</td>
                      <td>
                        <span className={`priority-badge ${prio.cls}`}>{prio.label}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${st.cls}`}>
                          <span className="status-dot-sm" />
                          {st.label}
                        </span>
                      </td>
                      <td className="report-count-cell">{ticket.report_count} reports</td>
                      <td className="report-updated-cell">{timeAgo(ticket.updated_at || ticket.created_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Detail Drawer when clicked */}
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
