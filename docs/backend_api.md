# ExamBuddy Admin Dashboard — Backend API Specifications

This document lists the recommended admin API endpoints, request/response examples, and required backend changes so the React admin dashboard can operate without exposing secrets.

---
## Security / Notes
- Frontend must only use `VITE_API_BASE_URL` (no secrets).  
- Backend must enforce admin authorization on every protected endpoint (check `user.role == 'admin'` or `user.is_admin`).  
- Sanitize error messages returned to the UI (no stack traces, no secrets).  
- Add audit records for every admin action (upload, edit, delete, publish, unpublish, reprocess).

---
## Authentication

### POST /api/v1/auth/login
- Body: `{ "username": "admin@example.com", "password": "secret" }`  
- Response 200: `{ "access_token": "<JWT>", "token_type": "bearer" }`  
- Notes: token `sub` should be `user_id`. Backend must verify admin role.

(Existing `POST /api/v1/auth/onboard` returns tokens for testing but a proper admin login endpoint should be implemented.)

---
## Documents

### GET /api/v1/documents
- Auth: Bearer (admin)
- Query params: `page`, `per_page`, `q`, `school_id`, `department_id`, `semester_id`, `subject_id`, `document_type`, `status`, `sort_by`, `sort_dir`
- Response 200:
```
{ "items": [Document], "total": 148, "page": 1, "per_page": 25 }
```
- Server-side pagination required.

### GET /api/v1/documents/{id}
- Auth: Bearer (admin)  
- Response 200: full Document including `structured_json`, `metadata_json`, `extracted_text` (for review)  
- 404 if not found.

### PUT /api/v1/documents/{id}
- Auth: Bearer (admin)  
- Body: partial update (e.g. `{ "structured_json": {...}, "title":"..." }`)  
- Response 200: updated Document  
- Notes: Save edits as `draft`. Create audit record.

### DELETE /api/v1/documents/{id}
- Auth: Bearer (admin)  
- Response 204  
- Notes: Prefer soft-delete (`status = removed` or `deleted_at`) or enforce cascade; create audit record.

---
## Processing / Re-process

### POST /api/v1/documents/{id}/process
- Auth: Bearer (admin)  
- Body (optional): `{ "force": false }`  
- Response 202: `{ "job_id": "...", "status": "queued" }`  
- Notes: Enqueue background job; set document.status `processing`.

### GET /api/v1/processing
- Auth: Bearer (admin)  
- Query: `status`, `page`, `per_page`  
- Response 200: `{ "items": [{ job_id, document_id, started_at, updated_at, progress, status, error_message }], "total": N }`

### GET /api/v1/documents/{id}/processing-status
- Auth: Bearer (admin)  
- Response 200: `{ job_id, status, progress, error }`
- Use polling from the UI if WebSockets are not available.

---
## Publish / Unpublish

### POST /api/v1/documents/{id}/publish
- Auth: Bearer (admin)  
- Body: `{ "force_publish_incomplete": false }`  
- Response 200: `{ "status": "published", "published_at": "2026-08-10T...Z", "warning": "..." }`  
- Behavior: If extraction is incomplete, require `force_publish_incomplete=true` and create an audit record with the explicit confirmation.

### POST /api/v1/documents/{id}/unpublish
- Auth: Bearer (admin)  
- Response 200: `{ "status": "draft" }`  
- Create audit record.

### POST /api/v1/documents/bulk/publish
- Auth: Bearer (admin)  
- Body: `{ "document_ids": ["id1","id2"], "force": false }`  
- Response 202: `{ "task_id": "...", "count": 2 }`  
- Notes: Provide task progress endpoint or return task id for polling.

---
## Errors & Audit

### GET /api/v1/errors
- Auth: Bearer (admin)
- Query: `document_id`, `type`, `since`, `page`  
- Response 200: `{ "items": [{ document_id, error_type, time, message_safe }], "total": N }`
- Messages must be safe (no stack traces, no sensitive data).

### GET /api/v1/audit
- Auth: Bearer (admin)
- Query: `admin_id`, `action`, `document_id`, `page`  
- Response 200: `{ "items": [{ admin_id, action, document_id, details, timestamp }], "total": N }`

---
## Models (examples)

### Document (partial)
```
{
  "id": "uuid",
  "title": "DBMS Syllabus",
  "document_type": "syllabus",
  "school_id": "uuid",
  "department_id": "uuid",
  "semester_id": "uuid",
  "subject_id": "uuid",
  "cloudinary_url": "https://...",
  "file_size": 1024000,
  "status": "draft|processing|completed|incomplete|failed|published",
  "structured_json": { ... },
  "metadata_json": { ... },
  "created_at": "2026-08-10T...Z"
}
```

### ProcessingJob
```
{ "job_id": "uuid", "document_id": "uuid", "status": "queued|running|failed|completed", "progress": 65, "started_at": "...", "error_message": null }
```

### AuditRecord
```
{ "id": "uuid", "admin_id": "uuid", "action": "upload|edit|delete|publish|unpublish|reprocess", "document_id": "uuid", "details": "string", "timestamp": "..." }
```

---
## Sample flows

### Re-process document (admin UI)
1. UI: `POST /api/v1/documents/{id}/process` → Response `job_id`
2. UI polls `GET /api/v1/documents/{id}/processing-status` until `status` = `completed` or `failed`.
3. On success backend updates `structured_json` and `status`.

### Publish incomplete document (explicit confirm)
1. UI detects `expected_units=5`, `extracted_units=2` → shows warning and asks for confirmation.
2. If admin confirms, UI sends `POST /api/v1/documents/{id}/publish` with `{ "force_publish_incomplete": true }`.
3. Backend records audit: `Published with incomplete extraction (2/5) — admin_id: ...`.

---
## Required backend implementation summary
- Add admin `login` endpoint (if absent) and enforce admin-only dependency.  
- Add `GET /api/v1/documents/{id}`, `PUT` and `DELETE`.  
- Extend `GET /api/v1/documents` to support pagination, search, and filters.  
- Create `processing_jobs` model and background worker pattern to handle re-processing.  
- Add publish/unpublish endpoints with `force` flag and audit logging.  
- Create `errors` and `audit_logs` models and endpoints.  
- Sanitize and limit returned fields (avoid exposing secrets).  

---
## Next steps for frontend integration
1. Implement route-protected UI using admin login.  
2. Wire list/detail/upload to the endpoints above.  
3. Implement polling for processing jobs.  
4. Implement Extraction Review UI and Editor saving to `PUT /api/v1/documents/{id}`.  


---
If you want, I can now:
- Generate an OpenAPI-compatible YAML for these endpoints, or
- Start implementing the UI flows that rely on these endpoints (re-process, publish confirmation, extraction review).
