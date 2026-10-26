import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import DriverView from "./pages/DriverView";
import PortalLanding from "./pages/PortalLanding";
import DriverLogin from "./pages/DriverLogin";
import "./styles/portal.css";

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
      <Link className="app-nav-brand" to="/">NER Logistics</Link>
      <Link to="/command" style={linkStyle("/command")}>Command Center</Link>
      <Link to="/driver" style={linkStyle("/driver")}>Driver View</Link>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-root">
        <Routes>
          <Route path="/" element={<PortalLanding />} />
          <Route path="/command" element={<Dashboard />} />
          <Route path="/driver/login" element={<DriverLogin />} />
          <Route path="/driver" element={<><Nav /><DriverView /></>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
