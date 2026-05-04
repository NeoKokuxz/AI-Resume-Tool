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
│   ├── (authed)/                           # Authenticated route group
│   │   ├── layout.tsx                      # Auth shell + hydration + onboarding redirect
│   │   ├── dashboard/page.tsx              # Stats, pipeline, recent activity
│   │   ├── resume/page.tsx                 # Resume manager
│   │   ├── jobs/page.tsx                   # Job listings + ATS scoring
│   │   ├── applications/page.tsx           # Kanban board
│   │   ├── email/page.tsx                  # Email monitor
│   │   ├── profile/page.tsx                # User profile editor
│   │   ├── study/page.tsx                  # Study plan (Interview Prep)
│   │   └── interview/page.tsx              # Mock interview stub (Interview Prep)
│   ├── onboarding/page.tsx                 # First-login onboarding flow
│   ├── login/page.tsx                      # Sign in / sign up
│   └── api/
│       ├── extract-resume/                 # Gemini resume field extraction
│       ├── analyze-job/                    # Gemini job analysis
│       ├── ats-score/                      # Gemini ATS scoring (Chrome extension)
│       ├── generate-resume/                # Gemini resume tailoring + cover letter
│       ├── generate-pdf/, parse-pdf/       # PDF generation + extraction
│       ├── classify-email/                 # Gemini email classification
│       ├── autofill/                       # Form-field autofill (rules + AI)
│       ├── resume-data/                    # Rich extracted profile (read + extract)
│       ├── profile/, resume/               # Auth'd profile + base resume (Chrome ext)
│       ├── jobs/import/                    # Save job + create application (Chrome ext)
│       ├── applications/update/            # Update application status (Chrome ext)
│       └── study-plan/                     # Study plan endpoints
│           ├── route.ts                    # GET cached plan / POST generate plan (accepts tags)
│           ├── chapter/route.ts            # POST append a single chapter (topic required)
│           ├── lesson/route.ts             # POST generate detailed lesson content
│           └── topics/route.ts             # GET fixed + AI-suggested topic chips
├── components/
│   ├── ui/                                 # Generic primitives — Button, Badge, Modal, ATSScoreRing, StatTile
│   ├── layout/Sidebar.tsx                  # Nav with expandable groups (Applications & Jobs, Interview Prep)
│   ├── applications/                       # ApplicationCard, KanbanColumn, ResumeModal, JobDetailModal
│   ├── jobs/                                # JobCard, AddJobModal
│   ├── resume/                             # ResumeUploader, ResumeEditor, ResumeViewer
│   ├── email/                              # EmailSummaryBar, EmailGroup, EmailCard, AddEmailModal
│   ├── profile/                            # ProfileField, SkillEditor
│   └── study/                              # Study feature — composable pieces
│       ├── StudyHeader.tsx                 # Top status bar (avatar, skills, chat toggle)
│       ├── StudyPlanGenerator.tsx          # Prompt textarea + model picker + Generate
│       ├── TopicChipRow.tsx                # Toggleable topic chips (selected = required chapter)
│       ├── ChapterSections.tsx             # Cards grouped + collapsible by difficulty
│       ├── StudyChapterCard.tsx            # Single chapter card
│       ├── AddChapterCard.tsx              # "+ Add a topic" tile
│       ├── AddChapterDialog.tsx            # Topic prompt dialog + model picker
│       ├── StudyChapterModal.tsx           # Modal shell + view router
│       ├── ChapterView.tsx                 # Chapter table-of-contents view
│       ├── LessonView.tsx                  # Lesson detail view
│       ├── ResourceList.tsx                # Shared resource list (chapter + lesson)
│       ├── StudyEmptyState.tsx             # No-resume / no-plan placeholders
│       ├── StudyBanners.tsx                # Error / stale / hydrating / overview blocks
│       └── ModelSelector.tsx               # Reusable Gemini model dropdown (up/down direction)
├── lib/
│   ├── store.ts                            # Zustand state
│   ├── db.ts                               # Supabase CRUD
│   ├── gemini.ts                           # Gemini clients (flash + flash-lite)
│   ├── ai-generate.ts                      # generateJsonWithFallback, parseJsonObject, isTransientAIError
│   ├── study-utils.ts                      # Lesson normalize + difficulty/section/resource constants + model registry + topic presets
│   ├── ats-scorer.ts                       # Local ATS scoring engine
│   ├── autofill-classifier.ts              # Rule-based form-field classification
│   ├── ai-queue/                           # Bearer auth helpers + service-role client (for extension routes)
│   ├── supabase/
│   │   ├── client.ts                       # Browser client
│   │   ├── server.ts                       # Server-component cookie client
│   │   └── route-auth.ts                   # NextRequest cookie auth helper for route handlers
│   └── utils.ts                            # Shared formatters and helpers
├── sql/                                    # Supabase migrations
│   ├── create_resume_data.sql
│   └── create_study_plans.sql
└── types/
    ├── index.ts                            # Shared TypeScript types (incl. StudyChapter, StudyLesson)
    └── autofill.ts                         # Autofill field/answer types
```

## AI Models

| Feature | Model |
|---|---|
| Resume tailoring + cover letter | `gemini-2.5-flash` |
| ATS scoring, field extraction, email classification, autofill | `gemini-2.5-flash-lite` |
| Study plan + chapter + lesson | User-selectable per generation (Flash Lite / Flash / Pro) — see `lib/study-utils.ts:STUDY_MODELS` |

`lib/ai-generate.ts:generateJsonWithFallback` retries on 503/429 and falls
through the model list automatically. The model that actually produced output
is returned alongside the result and persisted on the lesson row so the UI can
display "Generated by X".

## Refactor playbook

When extending or cleaning up the codebase, follow
[`../REFACTORING.md`](../REFACTORING.md). Pages should stay as composition
only; pure helpers go in `lib/`; feature components go in
`components/<feature>/`; cross-feature primitives go in `components/ui/`.
