# ExamBuddy Admin Dashboard

Scaffolded React + Vite admin dashboard for ExamBuddy. This app communicates only with the FastAPI backend via `VITE_API_BASE_URL`.

Setup:

```bash
cd admindashboardd
npm install
npm run dev
```

Env:
- `VITE_API_BASE_URL` — set to your FastAPI base, e.g. `http://localhost:8000/api/v1`

Notes:
- This initial scaffold includes Login (test onboard), Dashboard, Documents list, Upload PDF, and Document Detail with extraction preview.
- Several backend endpoints (document detail, publish, reprocess, processing status, audit) may need to be implemented or adapted on the FastAPI server.
