import { BrowserRouter, Routes, Route, Link, Outlet, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import DriverView from "./pages/DriverView";
import PortalLanding from "./pages/PortalLanding";
import DriverLogin from "./pages/DriverLogin";
import MovementVisibility from "./pages/MovementVisibility";
import { MovementDemoProvider } from "./context/MovementDemoContext";
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
      <Link to="/movement" style={linkStyle("/movement")}>Movement Visibility</Link>
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
          <Route path="/driver/login" element={<DriverLogin />} />
          <Route element={<MovementDemoProvider><Outlet /></MovementDemoProvider>}>
            <Route path="/command" element={<Dashboard />} />
            <Route path="/movement" element={<><Nav /><MovementVisibility /></>} />
            <Route path="/driver" element={<><Nav /><DriverView /></>} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}
