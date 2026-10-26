// Illustrative network and scenario data for the eight-state regional demo.
// Links are schematic connectors, not surveyed roads or routable geometry.
export const REGIONAL_HUBS = [
  { id: "assam", state: "Assam", city: "Guwahati", lat: 26.1445, lon: 91.7362 },
  { id: "arunachal", state: "Arunachal Pradesh", city: "Itanagar", lat: 27.0844, lon: 93.6053 },
  { id: "meghalaya", state: "Meghalaya", city: "Shillong", lat: 25.5788, lon: 91.8933 },
  { id: "manipur", state: "Manipur", city: "Imphal", lat: 24.8170, lon: 93.9368 },
  { id: "mizoram", state: "Mizoram", city: "Aizawl", lat: 23.7271, lon: 92.7176 },
  { id: "nagaland", state: "Nagaland", city: "Kohima", lat: 25.6751, lon: 94.1086 },
  { id: "tripura", state: "Tripura", city: "Agartala", lat: 23.8315, lon: 91.2868 },
  { id: "sikkim", state: "Sikkim", city: "Gangtok", lat: 27.3389, lon: 88.6065 },
];

const HUB_BY_ID = Object.fromEntries(REGIONAL_HUBS.map((hub) => [hub.id, hub]));

export const REGIONAL_LINKS = [
  ["sikkim", "assam"], ["assam", "arunachal"], ["assam", "meghalaya"],
  ["assam", "nagaland"], ["nagaland", "manipur"], ["assam", "mizoram"],
  ["assam", "tripura"],
].map(([from, to]) => ({ from: HUB_BY_ID[from], to: HUB_BY_ID[to] }));

export const DEMO_SHIPMENTS = [
  { id: "SIM-101", from: "assam", to: "arunachal", cargo: "Medical kits", offset: 0.08 },
  { id: "SIM-204", from: "assam", to: "meghalaya", cargo: "Food supplies", offset: 0.26 },
  { id: "SIM-318", from: "nagaland", to: "manipur", cargo: "Water filters", offset: 0.43 },
  { id: "SIM-427", from: "assam", to: "mizoram", cargo: "Emergency blankets", offset: 0.58 },
  { id: "SIM-536", from: "assam", to: "tripura", cargo: "Essential medicines", offset: 0.73 },
  { id: "SIM-642", from: "sikkim", to: "assam", cargo: "Relief supplies", offset: 0.89 },
];

export const DEMO_SITUATIONS = [
  { id: "SCN-AS", hub: "assam", type: "Flooded approach", level: "high", latOffset: 0.035, lonOffset: 0.018 },
  { id: "SCN-AR", hub: "arunachal", type: "Slope movement", level: "high", latOffset: -0.025, lonOffset: 0.035 },
  { id: "SCN-ML", hub: "meghalaya", type: "Bridge inspection", level: "medium", latOffset: -0.035, lonOffset: -0.03 },
  { id: "SCN-MN", hub: "manipur", type: "Road damage", level: "medium", latOffset: 0.03, lonOffset: 0.025 },
  { id: "SCN-MZ", hub: "mizoram", type: "Heavy rainfall", level: "high", latOffset: -0.025, lonOffset: 0.03 },
  { id: "SCN-NL", hub: "nagaland", type: "Temporary delay", level: "low", latOffset: 0.02, lonOffset: -0.035 },
  { id: "SCN-TR", hub: "tripura", type: "Water crossing check", level: "medium", latOffset: -0.025, lonOffset: -0.035 },
  { id: "SCN-SK", hub: "sikkim", type: "Weather access review", level: "high", latOffset: 0.025, lonOffset: 0.035 },
].map((scenario) => {
  const hub = HUB_BY_ID[scenario.hub];
  return { ...scenario, state: hub.state, lat: hub.lat + scenario.latOffset, lon: hub.lon + scenario.lonOffset };
});
