const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function analyzeComplaint(text, lat = null, lng = null) {
  const res = await fetch(`${BASE_URL}/complaints/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lat, lng }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Analysis failed");
  }
  return res.json();
}

export async function transcribeAudio(audioBlob, filename = "recording.webm") {
  const formData = new FormData();
  formData.append("audio", audioBlob, filename);
  const res = await fetch(`${BASE_URL}/complaints/transcribe`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Voice transcription failed");
  }
  return res.json();
}

export async function analyzeImage(imageFile) {
  const formData = new FormData();
  formData.append("image", imageFile, imageFile.name || "incident.jpg");
  const res = await fetch(`${BASE_URL}/complaints/image/analyze`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Image analysis failed");
  }
  return res.json();
}

export async function submitComplaint(text, lat = null, lng = null) {
  const res = await fetch(`${BASE_URL}/complaints`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lat, lng }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Submission failed");
  }
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Voice submission failed");
  }
  return res.json();
}

export async function getTicket(ticketId) {
  const res = await fetch(`${BASE_URL}/tickets/${ticketId}`);
  if (!res.ok) throw new Error("Ticket not found");
  return res.json();
}

