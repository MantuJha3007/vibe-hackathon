const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function analyzeComplaint(text, lat = null, lng = null) {
  const res = await fetch(`${BASE_URL}/complaints/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lat, lng }),
  });
  if (!res.ok) throw new Error("Analysis failed");
  return res.json();
}

export async function submitComplaint(text, lat = null, lng = null) {
  const res = await fetch(`${BASE_URL}/complaints`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lat, lng }),
  });
  if (!res.ok) throw new Error("Submission failed");
  return res.json();
}

export async function submitVoiceComplaint(audioBlob, lat = null, lng = null) {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");
  if (lat) formData.append("lat", lat);
  if (lng) formData.append("lng", lng);
  const res = await fetch(`${BASE_URL}/complaints/voice`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Voice submission failed");
  return res.json();
}

export async function getTicket(ticketId) {
  const res = await fetch(`${BASE_URL}/tickets/${ticketId}`);
  if (!res.ok) throw new Error("Ticket not found");
  return res.json();
}
