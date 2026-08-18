import Dashboard from "./pages/Dashboard";
import "./App.css";

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-icon">🛡️</span>
          <span className="brand-name">Sentinel</span>
          <span className="brand-tag">Admin Dashboard</span>
        </div>
        <div className="header-right">
          <span className="live-dot" />
          <span className="live-label">Live</span>
        </div>
      </header>
      <main className="app-main">
        <Dashboard />
      </main>
    </div>
  );
}
