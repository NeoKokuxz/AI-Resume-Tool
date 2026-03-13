# TODOs — Mocked & Unfinished Features

## 🔴 Mocked / Broken

### `/api/resume` — Still reads from disk cache
`src/app/api/resume/route.ts` reads/writes a local `.resume-cache.json` file on disk.
Used by the Chrome extension to fetch the user's base resume.
- [ ] Replace with Supabase query: fetch `resumes` row via `user_profiles.base_resume_id`
- [ ] Requires the extension to send an auth token or the route to look up by session

### `/api/jobs/import` — In-memory store only
`src/app/api/jobs/import/route.ts` stores imported jobs in a module-level array (`pendingJobs[]`).
Data is lost on every server restart. No user association.
- [ ] Replace with Supabase `jobs` table insert
- [ ] Associate job with the correct user (requires auth token from extension)

### Chrome Extension — Mock profile for auto-fill
`chrome-extension/sidepanel.js` uses a hardcoded `MOCK_PROFILE` object for form auto-fill (Step 3).
- [ ] Replace with real data fetched from `user_profiles` via `/api/resume` or a new `/api/profile` endpoint
- [ ] Map profile fields (name, phone, linkedin, location) to the auto-fill payload

### Chrome Extension — Hardcoded `localhost:3000`
`WEB_APP_URL = "http://localhost:3000"` is hardcoded at the top of `sidepanel.js`.
- [ ] Make this configurable (extension settings page or build-time env)
- [ ] Point to production URL when deployed

---

## 🟡 Incomplete Features

### Profile Settings Page
Users can set their profile during onboarding but there is no page to view or edit it afterward.
- [ ] Build `/settings` or `/profile` page showing all `user_profiles` fields
- [ ] Allow editing name, title, years of experience, location, phone, LinkedIn, GitHub, skills

### Resume Page — No PDF Export
The resume page shows plain text content. There is no way to download the base resume as PDF from the web app (only the Chrome extension generates PDFs).
- [ ] Add "Download PDF" button on the resume page using `/api/generate-pdf`

### Jobs Page — TypeScript Error
`src/app/(app)/jobs/page.tsx` line 199: passing object without `id` and `addedAt` fields where a full `Job` type is required.
- [ ] Fix the type error (add `id` and `addedAt` to the object or use `Omit<Job, ...>`)

### `generate-pdf` Route — TypeScript Error
`src/app/api/generate-pdf/route.ts` line 101: `Uint8Array` is not assignable to `BodyInit`.
- [ ] Wrap `pdfBytes` in a `Buffer` or use `new Response(pdfBytes)` instead of `new NextResponse(pdfBytes)`

### Dashboard — No Real-time Updates
Dashboard stats and activity feed are read from Zustand store (hydrated once on load).
- [ ] Add Supabase realtime subscriptions or a refresh mechanism for live updates

### Email Monitor — Manual Only
Emails are manually copy-pasted. No inbox integration.
- [ ] Gmail API or Outlook API OAuth integration
- [ ] Webhook or polling to pull new emails automatically
- [ ] Auto-update application status when a relevant email is classified

---

## 🟢 Nice to Have

### Rate Limiting on AI Endpoints
No rate limiting on `/api/extract-resume`, `/api/generate-resume`, `/api/analyze-job`, `/api/classify-email`.
- [ ] Add Upstash Ratelimit (or simple token-bucket in middleware)

### Input Validation
No Zod schema validation on API route inputs.
- [ ] Add Zod on all API routes

### Error Tracking
- [ ] Add Sentry for runtime error monitoring

### Background Jobs
Resume generation and email polling can be slow. Currently blocking.
- [ ] Move to Vercel Cron Jobs or BullMQ + Redis for background processing

### CI/CD
- [ ] GitHub Actions workflow for lint + type-check on PRs
- [ ] Vercel preview deployments per PR

---

## ✅ Done

- [x] Supabase database + Row Level Security
- [x] Email/password authentication
- [x] Onboarding flow with AI resume extraction (Gemini)
- [x] All data persisted to Supabase (resumes, jobs, applications, emails, user_profiles)
- [x] Tailored resumes stored in `resumes` table, referenced by UUID
- [x] Switch AI from Claude to Gemini 2.5 Flash
- [x] Real resume tailoring + cover letter generation (unmocked)
- [x] PDF generation for Chrome extension
- [x] Kanban drag-and-drop application pipeline
- [x] ATS scoring (local keyword + experience + title algorithm)
