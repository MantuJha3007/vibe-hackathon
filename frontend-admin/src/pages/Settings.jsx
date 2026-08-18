import { useState, useEffect } from "react";
import { checkHealth, seedTickets } from "../api/client";

const DEFAULT_PROFILE = {
  name: "Admin User",
  role: "System Administrator",
  email: "admin@sentinel.local",
};

const DEFAULT_NOTIFICATIONS = {
  assignment: true,
  highPriority: true,
  statusChange: true,
  dailySummary: false,
};

const DEFAULT_PREFERENCES = {
  defaultView: "split",
  defaultSeverity: "all",
  autoRefresh: true,
  refreshInterval: "30",
};

export default function Settings() {
  // Profile state
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("sentinel_profile");
      return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  // Notifications state
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem("sentinel_notifications");
      return saved ? JSON.parse(saved) : DEFAULT_NOTIFICATIONS;
    } catch {
      return DEFAULT_NOTIFICATIONS;
    }
  });

  // Dashboard Preferences state
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem("sentinel_preferences");
      return saved ? JSON.parse(saved) : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  // System Health state
  const [healthStatus, setHealthStatus] = useState("Checking...");
  const [latency, setLatency] = useState(null);
  const [isHealthChecking, setIsHealthChecking] = useState(false);
  const [lastSync, setLastSync] = useState("Just now");
  const [seedStatus, setSeedStatus] = useState("");

  // Toast / feedback message
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const runHealthCheck = async () => {
    setIsHealthChecking(true);
    try {
      const res = await checkHealth();
      setHealthStatus("Connected");
      setLatency(res.latency ?? 25);
      setLastSync("Just now");
      showToast(`Health check passed (${res.latency ?? 25}ms latency)`);
    } catch {
      setHealthStatus("Disconnected");
      setLatency(null);
      showToast("Health check failed: Backend unreachable");
    } finally {
      setIsHealthChecking(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    localStorage.setItem("sentinel_profile", JSON.stringify(profile));
    showToast("Profile information updated successfully.");
  };

  const handleToggleNotification = (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    localStorage.setItem("sentinel_notifications", JSON.stringify(updated));
  };

  const handleSavePreferences = () => {
    localStorage.setItem("sentinel_preferences", JSON.stringify(preferences));
    showToast("Dashboard preferences saved.");
  };

  const handleExportData = () => {
    const exportPayload = {
      exportDate: new Date().toISOString(),
      version: "Sentinel MVP 1.0",
      profile,
      notifications,
      preferences,
      systemInfo: {
        backendStatus: healthStatus,
        apiEndpoint: import.meta.env.VITE_API_URL || "http://localhost:8000",
      },
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sentinel_operator_config_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Configuration data exported as JSON.");
  };

  const [confirmClear, setConfirmClear] = useState(false);

  const handleClearPreferences = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 5000);
      return;
    }
    localStorage.removeItem("sentinel_profile");
    localStorage.removeItem("sentinel_notifications");
    localStorage.removeItem("sentinel_preferences");
    setProfile(DEFAULT_PROFILE);
    setNotifications(DEFAULT_NOTIFICATIONS);
    setPreferences(DEFAULT_PREFERENCES);
    setConfirmClear(false);
    showToast("Local preferences reset to defaults.");
  };

  const handleSeedDemoData = async () => {
    setSeedStatus("Seeding...");
    try {
      const res = await seedTickets();
      setSeedStatus(`Seeded ${res.total} demo incidents!`);
      showToast(`Successfully populated ${res.total} realistic demo incidents.`);
    } catch {
      setSeedStatus("Seed failed");
      showToast("Could not seed data. Check backend connection.");
    }
  };

  return (
    <div className="settings-page">
      {/* Toast Notification */}
      {toast && <div className="settings-toast">✓ {toast}</div>}

      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Settings</div>
          <div className="page-description">Manage Sentinel operational preferences.</div>
        </div>
      </div>

      {/* 6 Panels Grid */}
      <div className="settings-grid">
        {/* Card 1: Profile */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">Profile</div>
            <div className="settings-card-subtitle">Update your profile information.</div>
          </div>
          <form onSubmit={handleSaveProfile} className="settings-form">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-input"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                required
                id="input-profile-name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <input
                type="text"
                className="form-input"
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                required
                id="input-profile-role"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                required
                id="input-profile-email"
              />
            </div>
            <button type="submit" className="btn-primary btn-full" id="btn-save-profile">
              Save Changes
            </button>
          </form>
        </div>

        {/* Card 2: Notifications */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">Notifications</div>
            <div className="settings-card-subtitle">Choose which operational events you want to be notified about.</div>
          </div>
          <div className="toggles-list">
            <div className="toggle-row">
              <span className="toggle-label">Incident assignment notifications</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={notifications.assignment}
                  onChange={() => handleToggleNotification("assignment")}
                  id="toggle-assignment"
                />
                <span className="slider round" />
              </label>
            </div>

            <div className="toggle-row">
              <span className="toggle-label">High-priority incident alerts</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={notifications.highPriority}
                  onChange={() => handleToggleNotification("highPriority")}
                  id="toggle-high-priority"
                />
                <span className="slider round" />
              </label>
            </div>

            <div className="toggle-row">
              <span className="toggle-label">Status change notifications</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={notifications.statusChange}
                  onChange={() => handleToggleNotification("statusChange")}
                  id="toggle-status-change"
                />
                <span className="slider round" />
              </label>
            </div>

            <div className="toggle-row">
              <span className="toggle-label">Daily operational summary</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={notifications.dailySummary}
                  onChange={() => handleToggleNotification("dailySummary")}
                  id="toggle-daily-summary"
                />
                <span className="slider round" />
              </label>
            </div>
          </div>
        </div>

        {/* Card 3: Data & Privacy */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">Data &amp; Privacy</div>
            <div className="settings-card-subtitle">Manage your data and local preferences.</div>
          </div>
          <div className="actions-list">
            <div className="action-row">
              <div className="action-info">
                <div className="action-icon">⏱️</div>
                <div>
                  <div className="action-title">Export My Data</div>
                  <div className="action-desc">Download your preferences and local data.</div>
                </div>
              </div>
              <button className="btn-outline-action" onClick={handleExportData} id="btn-export-data">
                Export
              </button>
            </div>

            <div className="action-row">
              <div className="action-info">
                <div className="action-icon">🔄</div>
                <div>
                  <div className="action-title">Clear Local Preferences</div>
                  <div className="action-desc">Reset all local settings to default values.</div>
                </div>
              </div>
              <button className="btn-danger-outline" onClick={handleClearPreferences} id="btn-clear-prefs">
                {confirmClear ? "Confirm Reset?" : "Clear"}
              </button>
            </div>

            <div className="action-row" style={{ marginTop: "4px" }}>
              <div className="action-info">
                <div className="action-icon">🌱</div>
                <div>
                  <div className="action-title">Seed Demo Data</div>
                  <div className="action-desc">Populate realistic test incidents in backend database.</div>
                </div>
              </div>
              <button className="btn-outline-action" onClick={handleSeedDemoData} id="btn-seed-data">
                {seedStatus || "Seed"}
              </button>
            </div>
          </div>
        </div>

        {/* Card 4: Dashboard Preferences */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">Dashboard Preferences</div>
            <div className="settings-card-subtitle">Customize your dashboard experience.</div>
          </div>
          <div className="settings-form">
            <div className="form-group">
              <label className="form-label">Default incident view</label>
              <select
                className="form-select"
                value={preferences.defaultView}
                onChange={(e) => setPreferences({ ...preferences, defaultView: e.target.value })}
                id="select-default-view"
              >
                <option value="split">Split View</option>
                <option value="map">Map View</option>
                <option value="list">List View</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Default severity filter</label>
              <select
                className="form-select"
                value={preferences.defaultSeverity}
                onChange={(e) => setPreferences({ ...preferences, defaultSeverity: e.target.value })}
                id="select-default-severity"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical (Sev 5)</option>
                <option value="high">High &amp; Critical (Sev 4–5)</option>
                <option value="medium">Medium &amp; Low (Sev 1–3)</option>
              </select>
            </div>

            <div className="toggle-row" style={{ padding: "8px 0" }}>
              <span className="toggle-label">Auto-refresh</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.autoRefresh}
                  onChange={(e) => setPreferences({ ...preferences, autoRefresh: e.target.checked })}
                  id="toggle-auto-refresh"
                />
                <span className="slider round" />
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Refresh interval</label>
              <select
                className="form-select"
                value={preferences.refreshInterval}
                onChange={(e) => setPreferences({ ...preferences, refreshInterval: e.target.value })}
                id="select-refresh-interval"
              >
                <option value="15">15 seconds</option>
                <option value="30">30 seconds</option>
                <option value="60">60 seconds</option>
              </select>
            </div>

            <button
              type="button"
              className="btn-primary btn-full"
              onClick={handleSavePreferences}
              id="btn-save-preferences"
            >
              Save Preferences
            </button>
          </div>
        </div>

        {/* Card 5: System Information */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">System Information</div>
            <div className="settings-card-subtitle">Current system status and connection information.</div>
          </div>
          <div className="sys-info-table">
            <div className="sys-info-row">
              <span className="sys-info-label">Backend Status</span>
              <span className={`sys-status-badge ${healthStatus === "Connected" ? "connected" : "error"}`}>
                <span className="status-dot-sm" />
                {healthStatus} {latency !== null ? `(${latency}ms)` : ""}
              </span>
            </div>

            <div className="sys-info-row">
              <span className="sys-info-label">API Endpoint</span>
              <span className="sys-info-val mono">{import.meta.env.VITE_API_URL || "http://localhost:8000"}</span>
            </div>

            <div className="sys-info-row">
              <span className="sys-info-label">System Status</span>
              <span className="sys-info-val" style={{ color: "var(--success)", fontWeight: 600 }}>
                Operational
              </span>
            </div>

            <div className="sys-info-row">
              <span className="sys-info-label">Version</span>
              <span className="sys-info-val">Sentinel MVP 1.0</span>
            </div>

            <div className="sys-info-row">
              <span className="sys-info-label">Last Synchronization</span>
              <span className="sys-info-val">{lastSync}</span>
            </div>

            <div style={{ marginTop: "16px" }}>
              <button
                className="btn-health-check"
                onClick={runHealthCheck}
                disabled={isHealthChecking}
                id="btn-check-health"
              >
                {isHealthChecking ? "Pinging backend..." : "Check System Health"}
              </button>
            </div>
          </div>
        </div>

        {/* Card 6: About Sentinel */}
        <div className="settings-card about-card">
          <div className="settings-card-header">
            <div className="settings-card-title">About Sentinel</div>
            <div className="settings-card-subtitle">AI-powered civic complaint intelligence platform.</div>
          </div>
          <div className="about-content">
            <p className="about-desc">
              Sentinel helps civic authorities manage and resolve incidents efficiently with AI-powered insights.
            </p>
            <div className="about-shield-logo">
              <div className="about-shield-icon">🛡️</div>
            </div>
            <div className="about-footer-copy">© 2025 Sentinel. All rights reserved.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
