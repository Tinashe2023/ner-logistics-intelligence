Three services, three terminals, from the project root `ner-logistics-intelligence`:

**Terminal 1 — Backend (FastAPI)**

```bash
cd "C:\Users\TinasheHando\Desktop\2026 Research\ner-logistics-intelligence\backend"
conda activate ner-logistics
uvicorn app.main:app --reload --port 8000
```

→ API docs at `http://localhost:8000/docs`

**Terminal 2 — Frontend (React dashboard + driver view)**

```bash
cd "C:\Users\TinasheHando\Desktop\2026 Research\ner-logistics-intelligence\frontend"
npm run dev
```

→ Open the URL it prints (usually `http://localhost:5173`)

**Terminal 3 — PHP admin panel**

```bash
cd "C:\Users\TinasheHando\Desktop\2026 Research\ner-logistics-intelligence\php-admin"
php -S localhost:8080 -t public
```

→ Open `http://localhost:8080`, log in with `dispatcher` / `ner2026`

Start them in that order (backend first, since the other two depend on it), and leave all three terminals running at once. Worth pinning this in a `RUNNING.md` in your project root so you don't have to ask again — want me to create that file now?
