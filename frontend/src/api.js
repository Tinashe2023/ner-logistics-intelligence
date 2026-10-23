// VITE_API_BASE_URL is set in Vercel's project settings once the backend
// is deployed (e.g. https://your-app.onrender.com/api). Falls back to
// localhost for local development, where it's not set.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
const API_ROOT = API_BASE.replace(/\/api\/?$/, "");

async function fetchWithTimeout(url, options, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function checkApiHealth() {
  try {
    const res = await fetchWithTimeout(`${API_ROOT}/`, {}, 5000);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchRiskMap() {
  const res = await fetch(`${API_BASE}/network/risk-map`);
  if (!res.ok) throw new Error("Failed to fetch risk map");
  return res.json();
}

export async function fetchIncidents() {
  const res = await fetch(`${API_BASE}/incidents`);
  if (!res.ok) throw new Error("Failed to fetch field reports");
  return res.json();
}

export async function fetchCorridorWeather() {
  const res = await fetch(`${API_BASE}/weather/corridor`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Corridor weather is unavailable");
  }
  return res.json();
}

export async function fetchRoute(origin, destination) {
  const res = await fetch(`${API_BASE}/route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin, destination }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to fetch route");
  }
  return res.json();
}

export async function reportIncident({ localId, lat, lon, type, severity, description }) {
  const res = await fetchWithTimeout(`${API_BASE}/incidents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(localId ? { "Idempotency-Key": localId } : {}),
    },
    body: JSON.stringify({ lat, lon, type, severity, description }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to report incident");
  }
  return res.json();
}

export async function uploadIncidentPhoto(incidentId, photo) {
  const formData = new FormData();
  formData.append("photo", photo.blob, photo.name || "field-photo");
  const res = await fetchWithTimeout(`${API_BASE}/incidents/${incidentId}/photos`, {
    method: "POST",
    headers: { "Idempotency-Key": photo.localId },
    body: formData,
  }, 30000);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to upload field photo");
  }
  return res.json();
}
