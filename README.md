# AI Job Agent

An AI-powered job application system — a Next.js web app paired with a Chrome extension that scans job listings, scores your resume against them, tailors your resume with AI, and auto-fills applications.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3ECF8E?logo=supabase)
![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?logo=google)

---

## Monorepo Structure

```
resume-app/          # Next.js web application
chrome-extension/    # Chrome side panel extension
```

---

## Web App (`resume-app/`)

### Features

- **Onboarding** — Upload your resume; AI extracts your name, title, years of experience, location, phone, LinkedIn, GitHub, and skills automatically
- **ATS Scoring** — Score your resume against any job description using Gemini AI (keyword match, experience fit, title alignment)
- **AI Resume Tailoring** — Generate a fully ATS-optimized, job-specific resume and cover letter using Gemini 2.5 Flash, with full keyword mirroring and bullet rewriting
- **Kanban Application Tracker** — Drag-and-drop pipeline across 7 stages: Saved → Applied → ATS Passed → Recruiter Contact → Interview → Offer → Rejected
- **Job Detail View** — Click any application card to see the full job listing, ATS breakdown, matched/missing keywords, salary, and job type
- **Email Monitor** — Paste emails to auto-classify them (interview invite, rejection, assessment, recruiter outreach)
- **Resume Manager** — Upload, paste, or edit your base resume with automatic skill detection
- **Dashboard** — Stats, pipeline bar chart, recent activity, and quick actions
- **Interview Prep — Study** — AI-generated study plan tailored to your resume and a goal (e.g. "transition into ML"). Plan is cached per user; chapters group into Beginner / Intermediate / Advanced sections; each lesson generates rich content on demand (overview, walkthrough, examples, exercises, further reading). Topic chips (3 fixed cores + AI-suggested from your resume) can be toggled to force them into the plan as required chapters. Pick which Gemini model to use (Flash Lite / Flash / Pro) per generation; default is Flash.
- **Interview Prep — Mock Interview** *(stub)* — Suggested mock-interview cards (behavioral, system design, technical, recruiter screen). Live AI-led sessions are planned.

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth & Database | Supabase (PostgreSQL + Row Level Security) |
| State | Zustand |
| AI — Resume tailoring | Gemini 2.5 Flash |
| AI — ATS scoring, extraction, classification | Gemini 2.5 Flash Lite |
| PDF Parsing | pdfjs-dist |
| PDF Generation | pdf-lib |
| Drag & Drop | @dnd-kit |
| Icons | Lucide React |

### Getting Started

**Prerequisites:** Node.js 20.9+, a Supabase project, a Google Gemini API key

```bash
cd resume-app
npm install
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=AIza...
```

```bash
npm run dev
# Open http://localhost:3000
```

### Codebase organization

- `src/lib/` — pure helpers and constants (no React). AI generation, Supabase
  clients, feature utils.
- `src/components/<feature>/` — feature-specific components (e.g.
  `components/study/`).
- `src/components/ui/` — generic UI primitives (`Button`, `Modal`, `StatTile`).
- `src/app/(app)/<page>/page.tsx` — pages are composition only: state,
  handlers, and component calls. No inline business logic.

See [`REFACTORING.md`](./REFACTORING.md) for the playbook used to keep this
structure clean as the app grows.

### Supabase Setup

Run the following SQL in your Supabase Dashboard → SQL Editor:

```sql
-- Resumes (base + tailored)
create table resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null check (type in ('base', 'tailored')),
  file_name text,
  content text,
  skills text[],
  uploaded_at timestamptz default now()
);
alter table resumes enable row level security;
create policy "Users manage own resumes" on resumes for all using (auth.uid() = user_id);

-- Jobs
create table jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text, company text, description text, location text, url text,
  ats_result jsonb,
  added_at timestamptz default now()
);
alter table jobs enable row level security;
create policy "Users manage own jobs" on jobs for all using (auth.uid() = user_id);

-- Applications
create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  job_snapshot jsonb,
  status text,
  ats_score int,
  tailored_resume_id uuid references resumes(id) on delete set null,
  cover_letter text,
  notes text,
  applied_at timestamptz default now()
);
alter table applications enable row level security;
create policy "Users manage own applications" on applications for all using (auth.uid() = user_id);

-- Emails
create table emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  subject text, sender text, body text, classification text,
  received_at timestamptz default now()
);
alter table emails enable row level security;
create policy "Users manage own emails" on emails for all using (auth.uid() = user_id);

-- User profiles
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  work_title text,
  years_experience int,
  linkedin text,
  github text,
  phone text,
  location text,
  skills text[],
  base_resume_id uuid references resumes(id) on delete set null,
  onboarded boolean not null default false
);
alter table user_profiles enable row level security;
create policy "Users manage own profile" on user_profiles for all using (auth.uid() = id);

-- Resume data (rich extracted profile used by autofill + study plan)
create table resume_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  full_name text default '', email text default '', phone text default '',
  linkedin text default '', github text default '', website text default '',
  location text default '', city text default '', state text default '', country text default '',
  work_title text default '', years_experience int default 0, summary text default '',
  skills jsonb default '[]'::jsonb, tools jsonb default '[]'::jsonb,
  languages jsonb default '[]'::jsonb, certifications jsonb default '[]'::jsonb,
  education jsonb default '[]'::jsonb, experience jsonb default '[]'::jsonb,
  work_authorization text default '',
  updated_at timestamptz default now(),
  unique(user_id)
);
alter table resume_data enable row level security;
create policy "Users manage own resume_data" on resume_data for all using (auth.uid() = user_id);

-- Study plans (AI-generated, one row per user; lessons cached inside chapters jsonb)
create table study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  prompt text not null default '',
  overview text default '',
  chapters jsonb not null default '[]'::jsonb,
  resume_id uuid,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);
alter table study_plans enable row level security;
create policy "Users manage own study_plan" on study_plans for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email) values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

### API Routes

| Route | Description |
|---|---|
| `POST /api/extract-resume` | AI extraction of profile fields from resume text |
| `POST /api/analyze-job` | AI job description analysis |
| `POST /api/ats-score` | Gemini AI ATS scoring (returns score, summary, matched/missing keywords) |
| `POST /api/generate-resume` | ATS-optimized resume tailoring + cover letter generation |
| `POST /api/generate-pdf` | PDF generation from resume text |
| `POST /api/parse-pdf` | PDF text extraction |
| `POST /api/classify-email` | AI email classification |
| `POST /api/autofill` | Field-by-field autofill answers for a job application form |
| `POST /api/resume-data/extract` | Extract rich structured profile from resume text and upsert |
| `GET /api/resume-data` | Read user's structured resume data |
| `GET /api/profile` | Authenticated user profile |
| `GET /api/resume` | Authenticated user's base resume |
| `POST /api/jobs/import` | Save job + create application (used by Chrome extension) |
| `PATCH /api/applications/update` | Update application status |
| `GET /api/study-plan` | Read cached plan + staleness flag (resume changed since cache) |
| `POST /api/study-plan` | Generate a new plan; accepts `prompt` + `tags[]` (tags become required chapters); upserts to `study_plans` |
| `POST /api/study-plan/chapter` | Append a single new chapter (topic required) to the cached plan |
| `POST /api/study-plan/lesson` | Generate detailed lesson content; persists into the chapter's `lessons[]` |
| `GET /api/study-plan/topics` | Topic chip suggestions — 3 fixed cores + AI-inferred from the user's resume (Flash Lite) |

Extension-facing routes require `Authorization: Bearer <supabase_access_token>`.
Web-app-only routes (`/api/study-plan/*`, `/api/resume-data/extract`) use the
session cookie via `lib/supabase/route-auth.ts`.

---

## Chrome Extension (`chrome-extension/`)

A side panel extension that turns any job listing page into an end-to-end application workflow.

### Features

- **Authentication** — Sign in with your resume app Supabase credentials directly in the extension
- **Profile display** — Shows your avatar, name, title, and top skills after sign-in
- **Step 1 — Scan & Score** — Extracts the job listing from the current tab, sends it to Gemini for ATS scoring, and displays an animated score ring with matched/missing keywords and a summary
- **Step 2 — Tailor Resume** — Saves the job to your tracker (status: `saved`), calls the AI to generate a fully tailored resume and cover letter, lets you download as PDF
- **Step 3 — Apply** — Marks your application as `applied`, opens the external application page, and auto-fills form fields using your profile data and tailored resume

### Extension Flow

```
Sign in → Land on job listing → [Scan & Score This Job]
  → ATS score + keyword breakdown displayed
  → [Tailor Resume for This Job]
    → Job saved to tracker (status: saved)
    → AI generates tailored resume + cover letter
    → Download PDF
    → [Proceed to Apply]
      → Application status → applied
      → Opens application page
      → Auto-fills fields with your profile + resume
```

### Installation

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `chrome-extension/` folder
4. The extension icon appears in your toolbar — pin it and open the side panel

### Configuration

In `chrome-extension/sidepanel.js`, update:

```js
const WEB_APP_URL = "http://localhost:3000"; // or your deployed URL
const SUPABASE_URL = "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_...";
```

---

## AI Features

| Feature | Default model | Notes |
|---|---|---|
| Resume field extraction (onboarding) | Gemini 2.5 Flash Lite | JSON output |
| Job ATS scoring | Gemini 2.5 Flash Lite | Returns score, summary, keywords |
| Resume tailoring + cover letter | Gemini 2.5 Flash | Full document rewrite, no truncation |
| Email classification | Gemini 2.5 Flash Lite | Falls back to rule-based |
| Autofill answers | Gemini 2.5 Flash Lite | Per-field, mixes rule-based and AI |
| Study plan generation | User-selectable; default Flash | Accepts prompt + tags (tags = required chapters). Cached in `study_plans`; stale banner when resume changes |
| Study topic suggestions | Flash Lite | Chip list — 3 fixed cores + ~5 inferred from resume; fail-soft to fixed only |
| Study chapter (topic add) | User-selectable; default Flash | Appends to existing plan, avoids overlap with current chapters |
| Study lesson detail | User-selectable; default Flash | Cached per lesson; first click generates, subsequent clicks are instant |

All study endpoints share `lib/ai-generate.ts` for retries + automatic fallback
across the 3 model tiers when Gemini returns 503/429.

### Resume Tailoring — What the AI does

1. Mirrors exact keywords and phrases from the job description
2. Reorders experience sections to lead with the most relevant roles
3. Rewrites bullets as achievement-driven, role-specific statements
4. Reorders the skills section to prioritize required skills
5. Rewrites the summary as a targeted elevator pitch
6. Does not fabricate — only restructures what exists in the base resume

---

## License

MIT
