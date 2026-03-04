"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Application,
  ApplicationStatus,
  Email,
  Job,
  Resume,
} from "@/types";
import { generateId } from "./utils";

interface AppStore {
  // Resume
  baseResume: Resume | null;
  setBaseResume: (resume: Resume | null) => void;

  // Jobs
  jobs: Job[];
  addJob: (job: Omit<Job, "id" | "addedAt">) => Job;
  updateJob: (id: string, updates: Partial<Job>) => void;
  deleteJob: (id: string) => void;

  // Applications
  applications: Application[];
  addApplication: (application: Omit<Application, "id" | "appliedAt">) => Application;
  updateApplication: (id: string, updates: Partial<Application>) => void;
  updateApplicationStatus: (id: string, status: ApplicationStatus) => void;
  deleteApplication: (id: string) => void;

  // Emails
  emails: Email[];
  addEmail: (email: Omit<Email, "id" | "receivedAt">) => Email;
  updateEmail: (id: string, updates: Partial<Email>) => void;
  deleteEmail: (id: string) => void;
}

const SAMPLE_RESUME: Resume = {
  id: "resume-1",
  fileName: "John_Doe_Resume.pdf",
  content: `John Doe
Senior Software Engineer
john.doe@email.com | linkedin.com/in/johndoe | github.com/johndoe

SUMMARY
Experienced software engineer with 6 years of experience building scalable web applications.
Proficient in React, TypeScript, Node.js, and cloud infrastructure.

EXPERIENCE

Senior Software Engineer — TechCorp Inc. (2021 - Present)
- Led frontend development for a SaaS platform serving 50k+ users using React and TypeScript
- Implemented CI/CD pipelines with GitHub Actions, reducing deployment time by 60%
- Mentored 3 junior engineers and conducted technical interviews
- Architected microservices backend using Node.js, PostgreSQL, and Redis

Software Engineer — StartupXYZ (2019 - 2021)
- Built RESTful APIs using Node.js and Express serving 10M+ daily requests
- Migrated monolithic application to microservices architecture on AWS
- Implemented real-time features using WebSockets and Redis pub/sub

Junior Developer — WebAgency (2018 - 2019)
- Developed responsive web applications using React and JavaScript
- Collaborated with design team to implement pixel-perfect UIs using CSS/Tailwind

SKILLS
Languages: TypeScript, JavaScript, Python, SQL
Frontend: React, Next.js, Vue.js, Tailwind CSS, HTML/CSS
Backend: Node.js, NestJS, FastAPI, Express
Databases: PostgreSQL, MongoDB, Redis
Cloud & DevOps: AWS, Docker, Kubernetes, CI/CD, Terraform
Tools: Git, GitHub, Jira, Figma, Datadog

EDUCATION
B.S. Computer Science — State University (2018)`,
  skills: [
    "React", "TypeScript", "Node.js", "Next.js", "PostgreSQL",
    "AWS", "Docker", "Python", "Redis", "Kubernetes",
  ],
  uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
};

const SAMPLE_JOBS: Job[] = [
  {
    id: "job-1",
    title: "Senior Frontend Engineer",
    company: "Stripe",
    description: `Senior Frontend Engineer at Stripe

We are looking for a Senior Frontend Engineer to join our team.

Requirements:
- 5+ years of experience in frontend development
- Expert-level React and TypeScript skills
- Experience with Next.js and modern web technologies
- Knowledge of CSS/Tailwind and responsive design
- Experience with testing (Jest, Cypress)
- Strong communication and leadership skills
- Experience with CI/CD pipelines

Nice to have:
- Experience with GraphQL or tRPC
- Knowledge of payment systems
- AWS or cloud experience

About the role:
You will be building the next generation of payment interfaces used by millions of businesses worldwide.`,
    location: "San Francisco, CA (Remote)",
    url: "https://stripe.com/jobs",
    atsResult: {
      score: 88,
      keywordScore: 90,
      experienceScore: 100,
      titleScore: 70,
      matchedKeywords: ["react", "typescript", "next.js", "tailwind", "ci/cd", "testing", "leadership"],
      missingKeywords: ["graphql", "payment systems"],
    },
    addedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "job-2",
    title: "Full Stack Engineer",
    company: "Vercel",
    description: `Full Stack Engineer at Vercel

Join us to build the future of web development.

Requirements:
- 3+ years of full-stack development experience
- Proficiency in TypeScript and React
- Node.js and API development
- PostgreSQL or similar database experience
- Docker and Kubernetes knowledge
- Experience with cloud platforms (AWS, GCP)

Responsibilities:
- Build scalable backend services
- Develop responsive frontend applications
- Collaborate with cross-functional teams
- Write comprehensive tests`,
    location: "Remote",
    url: "https://vercel.com/careers",
    atsResult: {
      score: 92,
      keywordScore: 95,
      experienceScore: 100,
      titleScore: 75,
      matchedKeywords: ["typescript", "react", "node.js", "postgresql", "docker", "kubernetes", "aws"],
      missingKeywords: ["gcp"],
    },
    addedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "job-3",
    title: "ML Platform Engineer",
    company: "OpenAI",
    description: `ML Platform Engineer at OpenAI

Help build the infrastructure powering the most advanced AI systems.

Requirements:
- 4+ years of software engineering experience
- Strong Python skills
- Experience with machine learning frameworks (PyTorch, TensorFlow)
- Distributed systems experience
- Kubernetes and Docker
- Experience with LLM deployment and inference

Nice to have:
- Experience with CUDA programming
- Publications in ML conferences`,
    location: "San Francisco, CA",
    url: "https://openai.com/careers",
    atsResult: {
      score: 55,
      keywordScore: 50,
      experienceScore: 80,
      titleScore: 30,
      matchedKeywords: ["python", "docker", "kubernetes", "machine learning"],
      missingKeywords: ["pytorch", "tensorflow", "llm", "distributed systems", "cuda"],
    },
    addedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const SAMPLE_APPLICATIONS: Application[] = [
  {
    id: "app-1",
    jobId: "job-2",
    job: SAMPLE_JOBS[1],
    status: "interview",
    atsScore: 92,
    appliedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Technical interview scheduled for next week",
  },
  {
    id: "app-2",
    jobId: "job-1",
    job: SAMPLE_JOBS[0],
    status: "applied",
    atsScore: 88,
    appliedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "app-3",
    jobId: "job-3",
    job: SAMPLE_JOBS[2],
    status: "saved",
    atsScore: 55,
    appliedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Need to improve ML skills before applying",
  },
];

const SAMPLE_EMAILS: Email[] = [
  {
    id: "email-1",
    subject: "Interview Invitation - Full Stack Engineer at Vercel",
    sender: "recruiter@vercel.com",
    body: "Hi John, we'd like to schedule an interview for the Full Stack Engineer position. Please let us know your availability for next week.",
    classification: "interview",
    relatedJobId: "job-2",
    receivedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "email-2",
    subject: "Your application to Stripe",
    sender: "no-reply@stripe.com",
    body: "Thank you for applying to the Senior Frontend Engineer role at Stripe. We have received your application and will be in touch soon.",
    classification: "unknown",
    relatedJobId: "job-1",
    receivedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      baseResume: SAMPLE_RESUME,
      setBaseResume: (resume) => set({ baseResume: resume }),

      jobs: SAMPLE_JOBS,
      addJob: (jobData) => {
        const job: Job = {
          ...jobData,
          id: generateId(),
          addedAt: new Date().toISOString(),
        };
        set((state) => ({ jobs: [job, ...state.jobs] }));
        return job;
      },
      updateJob: (id, updates) =>
        set((state) => ({
          jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...updates } : j)),
        })),
      deleteJob: (id) =>
        set((state) => ({ jobs: state.jobs.filter((j) => j.id !== id) })),

      applications: SAMPLE_APPLICATIONS,
      addApplication: (appData) => {
        const application: Application = {
          ...appData,
          id: generateId(),
          appliedAt: new Date().toISOString(),
        };
        set((state) => ({
          applications: [application, ...state.applications],
        }));
        return application;
      },
      updateApplication: (id, updates) =>
        set((state) => ({
          applications: state.applications.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        })),
      updateApplicationStatus: (id, status) =>
        set((state) => ({
          applications: state.applications.map((a) =>
            a.id === id ? { ...a, status } : a
          ),
        })),
      deleteApplication: (id) =>
        set((state) => ({
          applications: state.applications.filter((a) => a.id !== id),
        })),

      emails: SAMPLE_EMAILS,
      addEmail: (emailData) => {
        const email: Email = {
          ...emailData,
          id: generateId(),
          receivedAt: new Date().toISOString(),
        };
        set((state) => ({ emails: [email, ...state.emails] }));
        return email;
      },
      updateEmail: (id, updates) =>
        set((state) => ({
          emails: state.emails.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        })),
      deleteEmail: (id) =>
        set((state) => ({ emails: state.emails.filter((e) => e.id !== id) })),
    }),
    {
      name: "resume-app-storage",
      version: 1,
    }
  )
);
