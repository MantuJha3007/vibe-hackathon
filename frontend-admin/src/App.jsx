import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Departments from "./pages/Departments";
import Reports from "./pages/Reports";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import "./App.css";

export default function App() {
  const [currentPage, setCurrentPage] = useState("overview");

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">🛡️</div>
            <span className="sidebar-logo-name">Sentinel</span>
          </div>
          <div className="sidebar-subtitle">Civic Operations</div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Operations</div>
          <button
            className={`nav-item ${currentPage === "overview" ? "active" : ""}`}
            id="nav-overview"
            onClick={() => setCurrentPage("overview")}
          >
            <span className="nav-item-icon">📊</span>
            <span>Overview</span>
          </button>
          <button
            className={`nav-item ${currentPage === "incidents" ? "active" : ""}`}
            id="nav-incidents"
            onClick={() => setCurrentPage("incidents")}
          >
            <span className="nav-item-icon">📋</span>
            <span>Incidents</span>
          </button>
          <button
            className={`nav-item ${currentPage === "map" ? "active" : ""}`}
            id="nav-map"
            onClick={() => setCurrentPage("map")}
          >
            <span className="nav-item-icon">🗺️</span>
            <span>Map</span>
          </button>
          <button
            className={`nav-item ${currentPage === "departments" ? "active" : ""}`}
            id="nav-departments"
            onClick={() => setCurrentPage("departments")}
          >
            <span className="nav-item-icon">🏛️</span>
            <span>Departments</span>
          </button>

          <div className="sidebar-section-label" style={{ marginTop: "8px" }}>
            Analysis
          </div>
          <button
            className={`nav-item ${currentPage === "reports" ? "active" : ""}`}
            id="nav-reports"
            onClick={() => setCurrentPage("reports")}
          >
            <span className="nav-item-icon">📈</span>
            <span>Reports</span>
          </button>
          <button
            className={`nav-item ${currentPage === "analytics" ? "active" : ""}`}
            id="nav-analytics"
            onClick={() => setCurrentPage("analytics")}
          >
            <span className="nav-item-icon">📉</span>
            <span>Analytics</span>
          </button>
          <button
            className={`nav-item ${currentPage === "settings" ? "active" : ""}`}
            id="nav-settings"
            onClick={() => setCurrentPage("settings")}
          >
            <span className="nav-item-icon">⚙️</span>
            <span>Settings</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sys-status">
            <span className="status-dot" />
            <span>System Operational</span>
          </div>
          <div className="sidebar-footer-link" onClick={() => setCurrentPage("settings")}>
            <span>❓</span>
            <span>Help &amp; Support</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="app-main">
        {currentPage === "overview" && <Dashboard initialView="split" key="overview" />}
        {currentPage === "incidents" && <Dashboard initialView="list" key="incidents" />}
        {currentPage === "map" && <Dashboard initialView="map" key="map" />}
        {currentPage === "departments" && (
          <Departments onNavigateToMap={() => setCurrentPage("map")} key="departments" />
        )}
        {currentPage === "reports" && <Reports />}
        {currentPage === "analytics" && <Analytics />}
        {currentPage === "settings" && <Settings />}
      </main>
    </div>
  );
}

