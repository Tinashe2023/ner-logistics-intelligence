# Incident Review Admin Panel (PHP)

Server-side scripted admin panel for dispatchers to review, approve, or
reject field-reported incidents before they affect the risk-aware routing
engine. Built separately from the FastAPI core to demonstrate server-side
scripting concepts (sessions, PDO, form handling, server-side rendering).

Status: scaffolded, not yet built — planned for Week 3 (Phase 5: Incident
Intelligence), once the FastAPI backend + Postgres schema exist for it to
read from.

Planned structure:
  public/index.php      - login page (session-based auth)
  public/incidents.php  - list + approve/reject incidents (reads/writes Postgres via PDO)
  includes/db.php       - PDO connection helper
  includes/auth.php     - session check helper
