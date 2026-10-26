import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import truckImage from "../images/moving_truck.jpg";

export default function DriverLogin() {
  const navigate = useNavigate();
  const [driverId, setDriverId] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    if (!driverId.trim() || !accessCode.trim()) {
      setError("Enter your driver ID and access code to continue.");
      return;
    }
    setError("");
    navigate("/driver", { state: { driverId: driverId.trim() } });
  }

  return (
    <main className="driver-login-page" style={{ "--login-photo": `url(${truckImage})` }}>
      <header className="login-topbar">
        <Link className="portal-brand" to="/" aria-label="Back to NER Logistics home">
          <span className="portal-brand-mark">NE</span>
          <span><strong>NER LOGISTICS</strong><small>ACCESS & INTELLIGENCE</small></span>
        </Link>
        <Link className="login-back-link" to="/">Back to home <span aria-hidden="true">↗</span></Link>
      </header>

      <section className="login-layout">
        <div className="login-story-panel">
          <div className="login-photo-overlay" />
          <div className="login-story-content">
            <span className="login-story-kicker"><i /> FIELD OPERATIONS PORTAL</span>
            <h1>Every road report helps the journey ahead.</h1>
            <p>Share route conditions, send incident photos, and keep essential updates ready—even when your connection isn’t.</p>
            <div className="login-story-points">
              <div><span>01</span><strong>Report road conditions</strong></div>
              <div><span>02</span><strong>Attach incident photos</strong></div>
              <div><span>03</span><strong>Queue updates offline</strong></div>
            </div>
            <span className="login-photo-caption">FIELD REPORTING · NORTH EAST INDIA</span>
          </div>
        </div>

        <div className="login-form-panel">
          <div className="login-form-content">
            <div className="login-form-kicker">DRIVER ACCESS</div>
            <h2>Welcome back</h2>
            <p className="login-form-intro">Sign in to open the field reporting workspace.</p>
            <div className="login-demo-notice"><span aria-hidden="true">ⓘ</span><p><strong>Class demo access</strong><br />This prototype form does not verify credentials against an identity service.</p></div>
            <form className="driver-login-form" onSubmit={handleSubmit}>
              <label htmlFor="driver-id">Driver ID</label>
              <div className="login-input-wrap"><span aria-hidden="true">♙</span><input id="driver-id" autoComplete="username" value={driverId} onChange={(event) => setDriverId(event.target.value)} placeholder="Enter your driver ID" /></div>
              <label htmlFor="driver-code">Access code</label>
              <div className="login-input-wrap"><span aria-hidden="true">⌑</span><input id="driver-code" type="password" autoComplete="current-password" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} placeholder="Enter your access code" /></div>
              {error && <div className="login-error" role="alert">{error}</div>}
              <button className="driver-login-submit" type="submit">Continue to field workspace <span aria-hidden="true">→</span></button>
            </form>
            <div className="login-form-help"><span className="login-lock-icon" aria-hidden="true">⌑</span><span>For this demonstration, any non-empty ID and access code will open the driver workspace.</span></div>
            <Link className="login-dashboard-link" to="/command">Open the command center instead <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="login-form-footer"><span>NER LOGISTICS INTELLIGENCE</span><span>DRIVER PORTAL · DEMO</span></div>
        </div>
      </section>
      <footer className="login-page-footer"><span>North East India</span><span>Connecting people · enabling opportunities</span></footer>
    </main>
  );
}
