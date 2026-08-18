import { useState } from "react";
import SubmitComplaint from "./pages/SubmitComplaint";
import TrackTicket from "./pages/TrackTicket";
import "./App.css";

export default function App() {
  const [page, setPage] = useState("submit");

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">🛡️</div>
            <span className="sidebar-logo-name">Sentinel</span>
          </div>
          <div className="sidebar-subtitle">Citizen Portal</div>
        </div>

        <nav className="sidebar-nav">
          <button
            id="nav-submit"
            className={`nav-item ${page === "submit" ? "active" : ""}`}
            onClick={() => setPage("submit")}
          >
            <span className="nav-item-icon">📝</span>
            Report Issue
          </button>
          <button
            id="nav-track"
            className={`nav-item ${page === "track" ? "active" : ""}`}
            onClick={() => setPage("track")}
          >
            <span className="nav-item-icon">🔍</span>
            Track Complaint
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-footer-link">
            <span>ℹ️</span> About Sentinel
          </button>
          <button className="sidebar-footer-link">
            <span>❓</span> Help &amp; Support
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="app-main">
        {page === "submit" ? <SubmitComplaint /> : <TrackTicket />}
      </main>
    </div>
  );
}
