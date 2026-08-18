const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function getTickets(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.department) query.set("department", params.department);
  if (params.category) query.set("category", params.category);
  if (params.severity) query.set("severity", params.severity);
  const res = await fetch(`${BASE_URL}/tickets?${query}`);
  if (!res.ok) throw new Error("Failed to fetch tickets");
  return res.json();
}

export async function getTicket(id) {
  const res = await fetch(`${BASE_URL}/tickets/${id}`);
  if (!res.ok) throw new Error("Ticket not found");
  return res.json();
}

export async function updateTicketStatus(id, status) {
  const res = await fetch(`${BASE_URL}/tickets/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Status update failed");
  return res.json();
}

export async function checkHealth() {
  const start = performance.now();
  const res = await fetch(`${BASE_URL}/health`, { cache: "no-store" });
  const latency = Math.round(performance.now() - start);
  if (!res.ok) throw new Error("Backend health check failed");
  const data = await res.json();
  return { ...data, latency };
}

export async function seedTickets() {
  const res = await fetch(`${BASE_URL}/tickets/seed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to seed sample tickets");
  return res.json();
}

