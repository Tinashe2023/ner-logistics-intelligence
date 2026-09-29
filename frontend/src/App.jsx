import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import DriverView from "./pages/DriverView";

function Nav() {
  const location = useLocation();
  const linkStyle = (path) => ({
    color: location.pathname === path ? "white" : "#aaa",
    marginRight: "1.5rem",
    textDecoration: "none",
    fontWeight: location.pathname === path ? "bold" : "normal",
  });
  return (
    <header style={{ padding: "1rem", background: "#0f0f1e", color: "white", display: "flex", alignItems: "center" }}>
      <h1 style={{ margin: 0, fontSize: "1.3rem", marginRight: "2rem" }}>NER Logistics Intelligence</h1>
      <Link to="/" style={linkStyle("/")}>Command Center</Link>
      <Link to="/driver" style={linkStyle("/driver")}>Driver View</Link>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ fontFamily: "sans-serif" }}>
        <Nav />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/driver" element={<DriverView />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
