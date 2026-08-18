const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function reverseGeocode(lat, lng) {
  const res = await fetch(`${BASE_URL}/complaints/location/reverse-geocode?lat=${lat}&lng=${lng}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Reverse geocode failed");
  }
  return res.json();
}

export async function analyzeComplaint(text, locationData = null) {
  const payload = {
    text,
    lat: locationData?.lat ?? null,
    lng: locationData?.lng ?? null,
    address: locationData?.address ?? null,
    location_accuracy: locationData?.accuracy ?? null,
    location_source: locationData?.source ?? "gps",
    location_timestamp: locationData?.timestamp ?? null,
  };

  const res = await fetch(`${BASE_URL}/complaints/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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

export async function submitComplaint(text, locationData = null) {
  const payload = {
    text,
    lat: locationData?.lat ?? null,
    lng: locationData?.lng ?? null,
    address: locationData?.address ?? null,
    location_accuracy: locationData?.accuracy ?? null,
    location_source: locationData?.source ?? "gps",
    location_timestamp: locationData?.timestamp ?? null,
  };

  const res = await fetch(`${BASE_URL}/complaints`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Submission failed");
  }
  return res.json();
}

export async function submitVoiceComplaint(audioBlob, locationData = null) {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");
  if (locationData?.lat) formData.append("lat", locationData.lat);
  if (locationData?.lng) formData.append("lng", locationData.lng);
  if (locationData?.address) formData.append("address", locationData.address);
  if (locationData?.accuracy) formData.append("location_accuracy", locationData.accuracy);
  if (locationData?.source) formData.append("location_source", locationData.source);

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


