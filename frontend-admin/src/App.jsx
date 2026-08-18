import Dashboard from "./pages/Dashboard";
import "./App.css";

export default function App() {
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
          <button className="nav-item active" id="nav-overview">
            <span className="nav-item-icon">📊</span>
            <span>Overview</span>
          </button>
          <button className="nav-item" id="nav-incidents">
            <span className="nav-item-icon">📋</span>
            <span>Incidents</span>
          </button>
          <button className="nav-item" id="nav-map">
            <span className="nav-item-icon">🗺</span>
            <span>Map</span>
          </button>
          <button className="nav-item" id="nav-departments">
            <span className="nav-item-icon">🏛</span>
            <span>Departments</span>
          </button>

          <div className="sidebar-section-label" style={{ marginTop: "8px" }}>Analysis</div>
          <button className="nav-item" id="nav-reports">
            <span className="nav-item-icon">📈</span>
            <span>Reports</span>
          </button>
          <button className="nav-item" id="nav-analytics">
            <span className="nav-item-icon">📉</span>
            <span>Analytics</span>
          </button>
          <button className="nav-item" id="nav-settings">
            <span className="nav-item-icon">⚙️</span>
            <span>Settings</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sys-status">
            <span className="status-dot" />
            <span>System Operational</span>
          </div>
          <div className="sidebar-footer-link">
            <span>❓</span>
            <span>Help &amp; Support</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="app-main">
        <Dashboard />
      </main>
    </div>
  );
}
