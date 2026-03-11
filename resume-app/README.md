# AI Resume Tool

An AI-powered job application automation system that helps you track applications, score your resume against job descriptions, and generate tailored resumes using Claude AI.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss)

## Features

- **ATS Scoring** — Instantly score your resume against any job description using keyword, experience, and title matching
- **AI Resume Tailoring** — Generate a job-specific resume and cover letter powered by Claude Sonnet
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
| State | Zustand (localStorage persistence) |
| AI | Anthropic Claude API (Haiku + Sonnet) |
| Drag & Drop | @dnd-kit |
| Icons | Lucide React |

## Getting Started

### Prerequisites

- Node.js 20.9+
- npm or yarn
- Anthropic API key (optional — app works without it, AI features disabled)

### Installation

```bash
# Clone the repo
git clone git@github.com:NeoKokuxz/AI-Resume-Tool.git
cd AI-Resume-Tool

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
```

Edit `.env.local` and add your Anthropic API key:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## AI Features

| Feature | Model | Requires API Key |
|---|---|---|
| Job analysis (extract title/company) | Claude Haiku | Yes |
| Resume tailoring | Claude Sonnet | Yes |
| Cover letter generation | Claude Sonnet | Yes |
| Email classification | Claude Haiku | Falls back to rule-based |

All other features (ATS scoring, Kanban board, resume upload, dashboard) work fully without an API key.

## ATS Score Formula

```
score = keyword_match × 0.5 + experience_match × 0.3 + title_similarity × 0.2
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Dashboard
│   ├── resume/page.tsx       # Resume manager
│   ├── jobs/page.tsx         # Job listings + ATS scoring
│   ├── applications/page.tsx # Kanban board
│   ├── email/page.tsx        # Email monitor
│   └── api/
│       ├── analyze-job/      # Claude job analysis
│       ├── generate-resume/  # Claude resume + cover letter
│       └── classify-email/   # Claude email classification
├── components/
│   ├── layout/               # Sidebar, Header
│   └── ui/                   # Button, Modal, Badge, ATSScoreRing
├── lib/
│   ├── store.ts              # Zustand state management
│   ├── ats-scorer.ts         # Local ATS scoring engine
│   └── utils.ts              # Helpers and formatters
└── types/
    └── index.ts              # Shared TypeScript types
```

## Roadmap

See [todos.md](./todos.md) for the full production readiness checklist, including:

- [ ] PostgreSQL database (Supabase / Neon)
- [ ] Authentication (Auth.js + Google OAuth)
- [ ] File storage for PDF/DOCX resumes
- [ ] Real email inbox integration (Gmail API)
- [ ] Job auto-fetching via JSearch API
- [ ] Background job queue
- [ ] Rate limiting + input validation

## License

MIT
