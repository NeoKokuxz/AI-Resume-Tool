# AI Job Agent — Web App

The Next.js web application for the AI Job Agent monorepo. See the [root README](../README.md) for full project documentation including the Chrome extension.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3ECF8E?logo=supabase)
![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?logo=google)

## Quick Start

```bash
npm install
cp .env.local.example .env.local  # fill in Supabase + Gemini keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=AIza...
```

## Project Structure

```
src/
├── app/
│   ├── (app)/                         # Authenticated route group
│   │   ├── layout.tsx                 # Auth shell + hydration + onboarding redirect
│   │   ├── page.tsx                   # Dashboard
│   │   ├── resume/page.tsx            # Resume manager
│   │   ├── jobs/page.tsx              # Job listings + ATS scoring
│   │   ├── applications/page.tsx      # Kanban board
│   │   ├── email/page.tsx             # Email monitor
│   │   └── profile/page.tsx          # User profile editor
│   ├── onboarding/page.tsx            # First-login onboarding flow
│   ├── login/page.tsx                 # Sign in / sign up
│   └── api/
│       ├── extract-resume/            # Gemini resume field extraction
│       ├── analyze-job/               # Gemini job analysis
│       ├── ats-score/                 # Gemini ATS scoring (Chrome extension)
│       ├── generate-resume/           # Gemini resume tailoring + cover letter
│       ├── generate-pdf/              # PDF generation
│       ├── parse-pdf/                 # PDF text extraction
│       ├── classify-email/            # Gemini email classification
│       ├── profile/                   # Authenticated user profile (Chrome extension)
│       ├── resume/                    # Authenticated base resume (Chrome extension)
│       ├── jobs/import/               # Save job + create application (Chrome extension)
│       └── applications/update/       # Update application status (Chrome extension)
├── components/
│   ├── ui/                            # Button, Badge, Modal, ATSScoreRing
│   ├── applications/
│   │   ├── ApplicationCard.tsx        # Draggable card — click upper to view job details
│   │   ├── KanbanColumn.tsx           # Droppable kanban column
│   │   ├── ResumeModal.tsx            # Tailored resume + cover letter viewer
│   │   └── JobDetailModal.tsx         # Full job listing popup (salary, ATS, description)
│   ├── jobs/JobCard.tsx               # Job card with ATS breakdown bars
│   ├── resume/                        # ResumeUploader, ResumeEditor, ResumeViewer
│   ├── email/                         # EmailSummaryBar, EmailGroup, EmailCard, AddEmailModal
│   └── profile/                       # ProfileField, SkillEditor
├── lib/
│   ├── store.ts                       # Zustand state
│   ├── db.ts                          # Supabase CRUD
│   ├── gemini.ts                      # Gemini clients (flash + flash-lite)
│   ├── ai-queue/
│   │   ├── auth.ts                    # Bearer token helpers for extension API routes
│   │   └── client.ts                  # Supabase service role client
│   ├── ats-scorer.ts                  # Local ATS scoring engine
│   └── utils.ts                       # Shared formatters and helpers
└── types/
    └── index.ts                       # Shared TypeScript types
```

## AI Models

| Feature | Model |
|---|---|
| Resume tailoring + cover letter | `gemini-2.5-flash` |
| ATS scoring, field extraction, email classification | `gemini-2.5-flash-lite` |
