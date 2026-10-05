// VITE_API_BASE_URL is set in Vercel's project settings once the backend
// is deployed (e.g. https://your-app.onrender.com/api). Falls back to
// localhost for local development, where it's not set.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export async function fetchRiskMap() {
  const res = await fetch(`${API_BASE}/network/risk-map`);
  if (!res.ok) throw new Error("Failed to fetch risk map");
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

export async function reportIncident({ lat, lon, type, severity, description }) {
  const res = await fetch(`${API_BASE}/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lon, type, severity, description }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to report incident");
  }
  return res.json();
}
