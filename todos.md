# Production Readiness TODOs

## 1. Database
Currently using **localStorage** — data is per-browser, not shared.

**Recommended: PostgreSQL via Supabase or Neon**

3 tables from the docs, plus users:
```sql
users         -- auth accounts
jobs          -- job postings per user
applications  -- pipeline per user
resumes       -- stored resume versions per user
emails        -- classified emails per user
```

**ORM:** Prisma or Drizzle — both work great with Next.js 16

---

## 2. Authentication
Currently there is **no auth at all** — anyone can access everything.

**Recommended: Auth.js (NextAuth v5)**
- Google OAuth (fastest setup)
- GitHub OAuth
- Email/password
- Magic link

Every database row needs a `user_id` foreign key so users only see their own data.

---

## 3. File Storage
Currently resumes are stored as raw text in localStorage.

**For real PDF/DOCX uploads:** Vercel Blob, AWS S3, or Supabase Storage
- Store the file, save the URL in the database
- Parse PDF server-side (using `pdf-parse` or `mammoth`)

---

## 4. Real Email Integration
Currently emails are manually copy-pasted.

**Gmail API or Outlook API:**
- OAuth to connect user's inbox
- Webhook or polling to pull new emails automatically
- Filter by job-related keywords
- Auto-classify and update application status

---

## 5. Background Jobs / Queue
Some tasks are too slow for a request/response cycle:
- Resume generation (can take 10–30s)
- Email polling
- Batch ATS scoring

**Recommended:** Vercel Cron Jobs (simple) or BullMQ + Redis (robust)

---

## 6. Security
| Issue | Fix |
|---|---|
| API key exposed risk | Keep `ANTHROPIC_API_KEY` server-side only (already done) |
| No rate limiting | Add rate limiting on API routes (Upstash Ratelimit) |
| No input validation | Add Zod schemas on all API routes |
| No CSRF protection | Auth.js handles this automatically |

---

## 7. Deployment
**Recommended stack:**

| Layer | Service |
|---|---|
| Frontend + API routes | Vercel |
| Database | Supabase or Neon (PostgreSQL) |
| File storage | Vercel Blob or Supabase Storage |
| Redis (if queues needed) | Upstash |
| Email integration | Gmail API or Resend |

---

## Full Production Checklist

```
Infrastructure
  ☐ PostgreSQL database (Supabase / Neon)
  ☐ Authentication (Auth.js + Google OAuth)
  ☐ File storage for resumes (Vercel Blob / S3)

Features
  ☐ Real email inbox integration (Gmail API)
  ☐ PDF/DOCX parsing server-side
  ☐ Background job queue (Vercel Cron / BullMQ)

Security & Reliability
  ☐ Input validation with Zod on all API routes
  ☐ Rate limiting on AI endpoints
  ☐ Error tracking (Sentry)
  ☐ Environment variables locked down

DevOps
  ☐ CI/CD pipeline (GitHub Actions)
  ☐ Preview deployments per PR (Vercel does this free)
  ☐ Database migrations (Prisma Migrate)
```

---

## Fastest Path to Production
1. Supabase (database + storage + auth in one)
2. Auth.js on top for Next.js integration
3. Deploy to Vercel
