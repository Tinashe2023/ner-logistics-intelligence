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
    <header className="app-nav">
      <h1>NER Logistics</h1>
      <Link to="/" style={linkStyle("/")}>Command Center</Link>
      <Link to="/driver" style={linkStyle("/driver")}>Driver View</Link>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-root">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/driver" element={<><Nav /><DriverView /></>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
