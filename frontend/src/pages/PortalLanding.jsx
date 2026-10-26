import { Link } from "react-router-dom";
import heroImage from "../images/misty_ner_mountains.jpg";

const CAPABILITIES = [
  {
    number: "01",
    icon: "↗",
    title: "Risk-aware routing",
    text: "Compare a shortest-distance baseline with a route shaped by the project’s heuristic risk score.",
  },
  {
    number: "02",
    icon: "⌖",
    title: "Regional map view",
    text: "Explore an eight-state overview alongside detailed route data for the Guwahati–Tawang corridor.",
  },
  {
    number: "03",
    icon: "◉",
    title: "Driver field reports",
    text: "Share road observations, attach photos, and keep reports queued when connectivity drops.",
  },
  {
    number: "04",
    icon: "✳",
    title: "AI project analyst",
    text: "Ask questions about the project’s graph, incident records, and field reports in natural language.",
  },
];

export default function PortalLanding() {
  return (
    <main className="portal-landing" style={{ "--landing-photo": `url(${heroImage})` }}>
      <header className="portal-nav">
        <Link className="portal-brand" to="/" aria-label="NER Logistics home">
          <span className="portal-brand-mark">NE</span>
          <span><strong>NER LOGISTICS</strong><small>ACCESS & INTELLIGENCE</small></span>
        </Link>
        <nav className="portal-nav-links" aria-label="Main navigation">
          <a href="#about">About</a>
          <a href="#capabilities">Capabilities</a>
          <Link to="/command">Command center</Link>
          <Link className="portal-nav-login" to="/driver/login"><span aria-hidden="true">♙</span> Login</Link>
        </nav>
      </header>

      <section className="portal-hero" id="about">
        <div className="portal-hero-inner">
          <div className="portal-hero-copy">
            <div className="portal-kicker"><span /> CONNECTING ROUTES. OPENING ACCESS.</div>
            <h1>Smarter logistics for a more connected <em>North East.</em></h1>
            <p className="portal-hero-description">
              Explore a decision-support prototype for route comparison, regional risk visibility, and driver field reporting across North Eastern India.
            </p>
            <div className="portal-hero-actions">
              <Link className="portal-button portal-button-bright" to="/driver/login">Enter driver portal <span aria-hidden="true">→</span></Link>
              <Link className="portal-text-link" to="/command">Explore command center <span aria-hidden="true">↗</span></Link>
            </div>
            <div className="portal-hero-note"><span className="portal-status-light" /> Class demonstration · data-informed route planning</div>
          </div>

          <div className="portal-visual-card" aria-label="Platform overview">
            <div className="portal-visual-top"><span className="portal-live-label"><i /> PLATFORM OVERVIEW</span><span>NER · 8 STATES</span></div>
            <div className="portal-network-art" aria-hidden="true">
              <svg viewBox="0 0 420 280" role="presentation">
                <path className="network-outline" d="M99 28 154 42 183 25 220 49 258 52 274 79 317 88 297 119 330 146 296 169 288 204 256 211 238 246 206 222 177 246 158 215 126 214 116 186 83 170 101 143 73 122 91 93 70 65Z" />
                <path className="network-route" d="M105 174 151 154 170 130 200 137 222 110 256 122 284 96" />
                <path className="network-link" d="M151 154 139 92M170 130 186 74M200 137 208 188M222 110 262 172M256 122 299 151M186 74 240 70M139 92 102 120" />
                {[[105,174],[151,154],[170,130],[200,137],[222,110],[256,122],[284,96],[139,92],[186,74],[208,188],[262,172],[299,151],[240,70],[102,120]].map(([cx,cy]) => <circle key={`${cx}-${cy}`} className="network-node" cx={cx} cy={cy} r="4" />)}
              </svg>
              <div className="network-label network-label-one"><span>01</span> CORRIDOR ROUTING</div>
              <div className="network-label network-label-two"><span>02</span> REGIONAL CONTEXT</div>
            </div>
            <div className="portal-visual-bottom">
              <div><span>REGIONAL VIEW</span><strong>8 states</strong></div>
              <div><span>ROUTE DETAIL</span><strong>Guwahati — Tawang</strong></div>
              <div><span>FIELD TOOLS</span><strong>Reports & photos</strong></div>
            </div>
          </div>
          <div className="portal-hero-index">01 <span>/</span> NORTH EAST LOGISTICS INTELLIGENCE</div>
        </div>
      </section>

      <section className="portal-capabilities" id="capabilities">
        <div className="portal-section-heading">
          <div><div className="portal-section-kicker">ONE WORKSPACE. CONNECTED SIGNALS.</div><h2>Built to make the next move clearer.</h2></div>
          <p>Map the context, compare route options, and bring field observations into the same planning view.</p>
        </div>
        <div className="portal-capability-grid">
          {CAPABILITIES.map((capability) => (
            <article className="portal-capability" key={capability.number}>
              <div className="portal-capability-top"><span>{capability.number}</span><i aria-hidden="true">{capability.icon}</i></div>
              <h3>{capability.title}</h3>
              <p>{capability.text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="portal-footer" id="contact">
        <Link className="portal-brand portal-brand-footer" to="/">
          <span className="portal-brand-mark">NE</span><span><strong>NER LOGISTICS</strong><small>ACCESS & INTELLIGENCE</small></span>
        </Link>
        <span>Smarter logistics · stronger access · a connected North East</span>
        <Link to="/driver/login">Driver login <span aria-hidden="true">→</span></Link>
      </footer>
    </main>
  );
}
