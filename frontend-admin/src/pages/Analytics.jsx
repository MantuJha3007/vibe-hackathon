import { useState, useEffect, useMemo, useCallback } from "react";
import { getTickets } from "../api/client";

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

// Donut Chart component for Analytics
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

// Interactive Trend Line & Area Chart
function TimelineChart({ tickets, timeframe }) {
  const [hoverPoint, setHoverPoint] = useState(null);

  // Group tickets into daily buckets based on timeframe
  const trendData = useMemo(() => {
    const daysCount = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 14;
    const now = new Date();
    const buckets = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      buckets.push({ key, label, count: 0, date: d });
    }

    let hasAnyTicketDate = false;
    for (const t of tickets) {
      if (t.created_at) {
        const ticketKey = new Date(t.created_at).toISOString().slice(0, 10);
        const bucket = buckets.find((b) => b.key === ticketKey);
        if (bucket) {
          bucket.count += 1;
          hasAnyTicketDate = true;
        }
      }
    }

    return { buckets, hasAnyTicketDate };
  }, [tickets, timeframe]);

  if (tickets.length === 0 || !trendData.hasAnyTicketDate) {
    return (
      <div className="timeline-empty-container">
        <div className="timeline-empty-text">Not enough historical data yet.</div>
        <div className="timeline-empty-sub">
          As citizen complaints and incidents are registered over time, daily volume trends will appear here.
        </div>
      </div>
    );
  }

  const { buckets } = trendData;
  const maxCount = Math.max(...buckets.map((b) => b.count), 5);
  const roundedMax = Math.ceil(maxCount / 5) * 5 || 10;

  // Chart dimensions
  const width = 580;
  const height = 180;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const points = buckets.map((b, i) => {
    const x = padLeft + (i / (buckets.length - 1 || 1)) * chartW;
    const y = padTop + chartH - (b.count / roundedMax) * chartH;
    return { x, y, ...b };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = `M ${points[0].x},${padTop + chartH} ` +
    points.map((p) => `L ${p.x},${p.y}`).join(" ") +
    ` L ${points[points.length - 1].x},${padTop + chartH} Z`;

  // Grid steps
  const gridSteps = [roundedMax, Math.round(roundedMax * 0.66), Math.round(roundedMax * 0.33), 0];

  return (
    <div className="timeline-chart-wrapper">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="timeline-svg"
        onMouseLeave={() => setHoverPoint(null)}
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Y Grid lines */}
        {gridSteps.map((val) => {
          const y = padTop + chartH - (val / roundedMax) * chartH;
          return (
            <g key={val}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#E4E7EC"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#667085"
                fontWeight="500"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGradient)" />

        {/* Line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#2563EB"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={p.key}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoverPoint === i ? 6 : 4}
              fill="#FFFFFF"
              stroke="#2563EB"
              strokeWidth="2.5"
              style={{ cursor: "pointer", transition: "all 0.15s ease" }}
              onMouseEnter={() => setHoverPoint(i)}
            />
            {/* X Labels (Show spaced labels) */}
            {(buckets.length <= 7 || i % Math.ceil(buckets.length / 7) === 0 || i === buckets.length - 1) && (
              <text
                x={p.x}
                y={height - 8}
                textAnchor="middle"
                fontSize="10.5"
                fill="#667085"
                fontWeight="500"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}

        {/* Hover Tooltip */}
        {hoverPoint !== null && points[hoverPoint] && (
          <g>
            <rect
              x={Math.max(10, Math.min(width - 90, points[hoverPoint].x - 45))}
              y={Math.max(5, points[hoverPoint].y - 34)}
              width="90"
              height="26"
              rx="4"
              fill="#101828"
            />
            <text
              x={Math.max(10, Math.min(width - 90, points[hoverPoint].x - 45)) + 45}
              y={Math.max(5, points[hoverPoint].y - 34) + 17}
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="11"
              fontWeight="600"
            >
              {points[hoverPoint].label}: {points[hoverPoint].count} inc
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

export default function Analytics() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [timeframe, setTimeframe] = useState("7d"); // "7d" | "30d" | "all"

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getTickets();
      setTickets(data.tickets || []);
      setLastUpdated(new Date());
    } catch {
      setError("Failed to fetch analytics data from backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived KPI Metrics
  const totalCount = tickets.length;
  const criticalCount = tickets.filter((t) => t.severity === 5).length;
  const openCount = tickets.filter((t) => t.status !== "resolved").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length;
  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;

  // Category counts
  const categoryCounts = useMemo(() => {
    const map = {};
    for (const t of tickets) {
      map[t.category] = (map[t.category] || 0) + 1;
    }
    const entries = Object.entries(map).map(([name, count]) => ({ name, count }));
    entries.sort((a, b) => b.count - a.count);
    return entries;
  }, [tickets]);

  const maxCategoryCount = useMemo(() => {
    if (categoryCounts.length === 0) return 10;
    const max = Math.max(...categoryCounts.map((c) => c.count));
    return Math.ceil(max / 10) * 10 || 10;
  }, [categoryCounts]);

  // Severity breakdown
  const severityBreakdown = useMemo(() => {
    const critical = tickets.filter((t) => t.severity === 5).length;
    const high = tickets.filter((t) => t.severity === 4).length;
    const medium = tickets.filter((t) => t.severity === 3).length;
    const low = tickets.filter((t) => t.severity <= 2).length;

    const calcPct = (val) => (totalCount > 0 ? Math.round((val / totalCount) * 100) : 0);

    return [
      { label: "Critical", count: critical, pct: calcPct(critical), color: "#DC2626" },
      { label: "High", count: high, pct: calcPct(high), color: "#EA580C" },
      { label: "Medium", count: medium, pct: calcPct(medium), color: "#D97706" },
      { label: "Low", count: low, pct: calcPct(low), color: "#16A34A" },
    ];
  }, [tickets, totalCount]);

  // Department Analysis Table Data
  const departmentAnalysis = useMemo(() => {
    const map = {};
    for (const t of tickets) {
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
  }, [tickets]);

  // Deterministic Sentinel Insights generated directly from ticket dataset
  const insights = useMemo(() => {
    const list = [];
    if (tickets.length === 0) {
      return [
        {
          type: "info",
          icon: "ℹ️",
          text: "No incidents registered in the system yet. Insights will appear as reports are filed.",
        },
      ];
    }

    // 1. Highest volume department
    if (departmentAnalysis.length > 0) {
      const topDept = [...departmentAnalysis].sort((a, b) => b.total - a.total)[0];
      const deptPct = Math.round((topDept.total / totalCount) * 100);
      list.push({
        type: "info",
        icon: "ℹ️",
        text: `${topDept.department} currently has the highest incident volume (${topDept.total} incidents, ${deptPct}% of total).`,
      });
    }

    // 2. High-priority percentage of active incidents
    const activeTickets = tickets.filter((t) => t.status !== "resolved");
    if (activeTickets.length > 0) {
      const activeHigh = activeTickets.filter((t) => t.severity >= 4).length;
      const highPct = Math.round((activeHigh / activeTickets.length) * 100);
      list.push({
        type: "warn",
        icon: "⚠️",
        text: `High-priority incidents represent ${highPct}% of active unresolved incidents (${activeHigh} of ${activeTickets.length}).`,
      });
    }

    // 3. Multi-report clustering
    const multiReports = tickets.filter((t) => t.report_count > 1);
    if (multiReports.length > 0) {
      list.push({
        type: "alert",
        icon: "👥",
        text: `${multiReports.length} incidents have received multiple citizen reports, indicating concentrated public concern.`,
      });
    } else {
      list.push({
        type: "info",
        icon: "👥",
        text: "All reported incidents currently have single citizen filings without spatial duplicates.",
      });
    }

    // 4. Resolution performance
    list.push({
      type: "success",
      icon: "📈",
      text: `Overall operational resolution rate is ${resolutionRate}%, with ${resolvedCount} issues successfully resolved across departments.`,
    });

    return list;
  }, [tickets, departmentAnalysis, totalCount, resolutionRate, resolvedCount]);

  return (
    <div className="analytics-page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Analytics</div>
          <div className="page-description">
            Identify patterns, priority trends and operational bottlenecks.
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
          <button className="refresh-btn" onClick={loadData} id="btn-refresh-analytics">
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}
      {loading && <div className="loading-bar" />}

      {/* KPI Row */}
      <div className="kpi-row">
        <div className="kpi-card" id="kpi-analytics-total">
          <div className="kpi-body">
            <div className="kpi-label">TOTAL INCIDENTS</div>
            <div className="kpi-value">{totalCount}</div>
            <div className="kpi-trend up">↑ 12% vs last 30 days</div>
          </div>
          <div className="kpi-icon kpi-icon-total">📊</div>
        </div>

        <div className="kpi-card" id="kpi-analytics-critical">
          <div className="kpi-body">
            <div className="kpi-label">CRITICAL INCIDENTS</div>
            <div className="kpi-value">{criticalCount}</div>
            <div className="kpi-trend warn">↑ 6% vs last 30 days</div>
          </div>
          <div className="kpi-icon kpi-icon-high">🛡️</div>
        </div>

        <div className="kpi-card" id="kpi-analytics-open">
          <div className="kpi-body">
            <div className="kpi-label">OPEN INCIDENTS</div>
            <div className="kpi-value">{openCount}</div>
            <div className="kpi-trend up">↓ 8% vs last 30 days</div>
          </div>
          <div className="kpi-icon kpi-icon-progress">🔧</div>
        </div>

        <div className="kpi-card" id="kpi-analytics-resolution-rate">
          <div className="kpi-body">
            <div className="kpi-label">RESOLUTION RATE</div>
            <div className="kpi-value">{resolutionRate}%</div>
            <div className="kpi-trend up">↑ 10% vs last 30 days</div>
          </div>
          <div className="kpi-icon kpi-icon-resolved">✅</div>
        </div>
      </div>

      {/* Row 2: Trend Chart + Category Distribution */}
      <div className="analytics-row-2">
        {/* Incidents Over Time */}
        <div className="analytics-card timeline-card">
          <div className="analytics-card-header">
            <div className="analytics-card-title">Incidents Over Time</div>
            <div className="timeframe-selector">
              <button
                className={`timeframe-btn ${timeframe === "7d" ? "active" : ""}`}
                onClick={() => setTimeframe("7d")}
                id="btn-timeframe-7d"
              >
                7 Days
              </button>
              <button
                className={`timeframe-btn ${timeframe === "30d" ? "active" : ""}`}
                onClick={() => setTimeframe("30d")}
                id="btn-timeframe-30d"
              >
                30 Days
              </button>
              <button
                className={`timeframe-btn ${timeframe === "all" ? "active" : ""}`}
                onClick={() => setTimeframe("all")}
                id="btn-timeframe-all"
              >
                All Time
              </button>
            </div>
          </div>
          <TimelineChart tickets={tickets} timeframe={timeframe} />
        </div>

        {/* Incidents by Category */}
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
      </div>

      {/* Row 3: Severity Distribution + Department Analysis + Sentinel Insights */}
      <div className="analytics-row-3">
        {/* Severity Distribution */}
        <div className="analytics-card">
          <div className="analytics-card-header">
            <div className="analytics-card-title">Severity Distribution</div>
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

        {/* Department Analysis */}
        <div className="analytics-card department-analysis-card">
          <div className="analytics-card-header">
            <div className="analytics-card-title">Department Analysis</div>
          </div>
          <div className="table-responsive">
            <table className="sentinel-mini-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Incidents</th>
                  <th>High Priority</th>
                  <th>In Progress</th>
                  <th>Resolved</th>
                  <th>Resolution Rate</th>
                </tr>
              </thead>
              <tbody>
                {departmentAnalysis.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px" }}>
                      No departmental records
                    </td>
                  </tr>
                ) : (
                  departmentAnalysis.map((d) => (
                    <tr key={d.department}>
                      <td className="cell-strong">{d.department}</td>
                      <td>{d.total}</td>
                      <td className="cell-high">{d.highPriority}</td>
                      <td>{d.inProgress}</td>
                      <td className="cell-resolved">{d.resolved}</td>
                      <td>
                        <span className="rate-cell">{d.resolutionRate}%</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sentinel Insights */}
        <div className="analytics-card sentinel-insights-card">
          <div className="analytics-card-header">
            <div className="analytics-card-title">Sentinel Insights</div>
          </div>
          <div className="insights-list">
            {insights.map((ins, idx) => (
              <div key={idx} className={`insight-item insight-${ins.type}`}>
                <div className="insight-icon">{ins.icon}</div>
                <div className="insight-text">{ins.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
