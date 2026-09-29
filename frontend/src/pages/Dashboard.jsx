import { useEffect, useState } from "react";
import RiskMap from "../components/RiskMap";
import ControlPanel from "../components/ControlPanel";
import { fetchRiskMap, fetchRoute } from "../api";

export default function Dashboard() {
  const [riskMapData, setRiskMapData] = useState(null);
  const [routeComparison, setRouteComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRiskMap()
      .then(setRiskMapData)
      .catch((e) => setError(e.message));
  }, []);

  async function handleRequestRoute(origin, destination) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRoute(origin, destination);
      setRouteComparison(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && (
        <div style={{ padding: "0.5rem 1rem", background: "#c0392b", color: "white" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex" }}>
        <ControlPanel
          riskMapData={riskMapData}
          onRequestRoute={handleRequestRoute}
          routeComparison={routeComparison}
          loading={loading}
          onReset={() => setRouteComparison(null)}
        />
        <div style={{ flex: 1 }}>
          {riskMapData ? (
            <RiskMap riskMapData={riskMapData} routeComparison={routeComparison} />
          ) : (
            <p style={{ padding: "2rem" }}>Loading network data...</p>
          )}
        </div>
      </div>
    </div>
  );
}
