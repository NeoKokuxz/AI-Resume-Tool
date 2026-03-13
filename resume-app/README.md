# AI Resume Tool

An AI-powered job application automation system that helps you track applications, score your resume against job descriptions, and generate tailored resumes using Google Gemini AI.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?logo=supabase)

## Features

- **Onboarding** — Upload your resume on first login; AI extracts your name, title, years of experience, location, phone, LinkedIn, GitHub, and skills automatically
- **ATS Scoring** — Instantly score your resume against any job description using keyword, experience, and title matching
- **AI Resume Tailoring** — Generate a job-specific resume and cover letter powered by Gemini
- **Kanban Application Tracker** — Drag-and-drop pipeline with 7 stages (Saved → Applied → ATS Passed → Recruiter → Interview → Offer → Rejected)
- **Email Monitor** — Paste emails and auto-classify them (interview invite, rejection, assessment, recruiter outreach)
- **Resume Manager** — Upload, paste, or edit your base resume with automatic skill detection
- **Dashboard** — Overview of your entire job search pipeline with stats and recent activity

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth & Database | Supabase (PostgreSQL + Row Level Security) |
| State | Zustand |
| AI | Google Gemini 2.5 Flash |
| PDF Parsing | pdfjs-dist (server-side) |
| Drag & Drop | @dnd-kit |
| Icons | Lucide React |

## Getting Started

### Prerequisites

- Node.js 20.9+
- npm
- Supabase project
- Google Gemini API key

### Installation

```bash
# Clone the repo
git clone git@github.com:NeoKokuxz/AI-Resume-Tool.git
cd AI-Resume-Tool/resume-app

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_...
GEMINI_API_KEY=AIza...
```

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

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## User Flow

1. **Sign up** → confirm email → sign in
2. **Onboarding** → upload resume → AI extracts your profile fields → review & confirm → saved to database
3. **Dashboard** → add jobs, track applications, monitor emails

## AI Features

| Feature | Model |
|---|---|
| Resume field extraction (onboarding) | Gemini 2.5 Flash |
| Job description analysis | Gemini 2.5 Flash |
| Resume tailoring + cover letter | Gemini 2.5 Flash |
| Email classification | Gemini 2.5 Flash (falls back to rule-based) |

## ATS Score Formula

```
score = keyword_match × 0.5 + experience_match × 0.3 + title_similarity × 0.2
```

## Project Structure

```
src/
├── app/
│   ├── (app)/                         # Authenticated route group
│   │   ├── layout.tsx                 # Auth shell + hydration + onboarding redirect
│   │   ├── page.tsx                   # Dashboard (lean — composes components)
│   │   ├── resume/page.tsx            # Resume manager
│   │   ├── jobs/page.tsx              # Job listings + ATS scoring
│   │   ├── applications/page.tsx      # Kanban board
│   │   ├── email/page.tsx             # Email monitor
│   │   └── profile/page.tsx           # User profile editor
│   ├── onboarding/page.tsx            # First-login onboarding flow
│   ├── login/page.tsx                 # Sign in / sign up
│   └── api/
│       ├── extract-resume/            # Gemini resume field extraction
│       ├── analyze-job/               # Gemini job analysis
│       ├── generate-resume/           # Gemini resume tailoring + cover letter
│       ├── generate-pdf/              # PDF generation (pdf-lib)
│       └── classify-email/            # Gemini email classification
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx               # App sidebar with nav + user profile link
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   ├── Modal.tsx
│   │   └── ATSScoreRing.tsx
│   ├── dashboard/
│   │   └── StatCard.tsx              # Stat metric card
│   ├── resume/
│   │   ├── ResumeUploader.tsx        # Drag-and-drop upload zone
│   │   ├── ResumeEditor.tsx          # Textarea edit mode
│   │   └── ResumeViewer.tsx          # Meta + skills + content viewer
│   ├── jobs/
│   │   ├── JobCard.tsx               # Job card with ATS breakdown
│   │   └── AddJobModal.tsx           # Add job form modal
│   ├── applications/
│   │   ├── ApplicationCard.tsx       # Draggable application card
│   │   ├── KanbanColumn.tsx          # Droppable kanban column
│   │   └── ResumeModal.tsx           # Tailored resume + cover letter viewer
│   ├── email/
│   │   ├── EmailSummaryBar.tsx       # Classification summary grid
│   │   ├── EmailGroup.tsx            # Group of emails by classification
│   │   ├── EmailCard.tsx             # Single email row
│   │   └── AddEmailModal.tsx         # Add email form modal
│   └── profile/
│       ├── ProfileField.tsx          # Reusable labeled input field
│       └── SkillEditor.tsx           # Skill tag input (shared across pages)
├── lib/
│   ├── store.ts                      # Zustand state management
│   ├── db.ts                         # Supabase CRUD operations
│   ├── gemini.ts                     # Gemini AI client
│   ├── ats-scorer.ts                 # Local ATS scoring engine
│   ├── resume-utils.ts               # Resume helpers (extractSkills)
│   ├── email-utils.ts                # Email helpers (classifyEmail API call)
│   └── utils.ts                      # Shared formatters and helpers
└── types/
    └── index.ts                      # Shared TypeScript types
```

## License

MIT
