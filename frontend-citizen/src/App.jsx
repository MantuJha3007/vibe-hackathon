import { useState } from "react";
import SubmitComplaint from "./pages/SubmitComplaint";
import TrackTicket from "./pages/TrackTicket";
import "./App.css";

export default function App() {
  const [page, setPage] = useState("submit");

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-icon">🛡️</span>
          <span className="brand-name">Sentinel</span>
          <span className="brand-tag">Civic Intelligence</span>
        </div>
        <nav className="header-nav">
          <button
            id="nav-submit"
            className={`nav-btn ${page === "submit" ? "active" : ""}`}
            onClick={() => setPage("submit")}
          >
            📝 Report Issue
          </button>
          <button
            id="nav-track"
            className={`nav-btn ${page === "track" ? "active" : ""}`}
            onClick={() => setPage("track")}
          >
            🔍 Track Status
          </button>
        </nav>
      </header>

      <main className="app-main">
        {page === "submit" ? <SubmitComplaint /> : <TrackTicket />}
      </main>

      <footer className="app-footer">
        <span>Powered by Groq AI · Built for citizens</span>
      </footer>
    </div>
  );
}
