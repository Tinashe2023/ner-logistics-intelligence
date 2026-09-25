const API_BASE = "http://localhost:8000/api";

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
