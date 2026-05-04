"use client";

import { create } from "zustand";
import {
  AIOperationStatus,
  AIOperationType,
  Application,
  ApplicationStatus,
  Email,
  Job,
  Resume,
} from "@/types";

interface AppStore {
  hydrated: boolean;

  // Resume
  baseResume: Resume | null;
  setBaseResume: (resume: Resume | null) => void;

  // Jobs
  jobs: Job[];
  addJob: (job: Job) => void;
  updateJob: (id: string, updates: Partial<Job>) => void;
  deleteJob: (id: string) => void;

  // Applications
  applications: Application[];
  addApplication: (application: Application) => void;
  updateApplication: (id: string, updates: Partial<Application>) => void;
  updateApplicationStatus: (id: string, status: ApplicationStatus) => void;
  deleteApplication: (id: string) => void;

  // Emails
  emails: Email[];
  addEmail: (email: Email) => void;
  updateEmail: (id: string, updates: Partial<Email>) => void;
  deleteEmail: (id: string) => void;

  // AI Queue operations
  activeOperations: Record<string, { type: AIOperationType; status: AIOperationStatus; error?: string }>;
  setOperationStatus: (id: string, type: AIOperationType, status: AIOperationStatus, error?: string) => void;
  clearOperation: (id: string) => void;

  // Hydrate from Supabase
  hydrate: (data: {
    resume: Resume | null;
    jobs: Job[];
    applications: Application[];
    emails: Email[];
  }) => void;
}

export const useAppStore = create<AppStore>()((set) => ({
  hydrated: false,
  baseResume: null,

  activeOperations: {},
  setOperationStatus: (id, type, status, error) =>
    set((s) => ({ activeOperations: { ...s.activeOperations, [id]: { type, status, error } } })),
  clearOperation: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.activeOperations;
      return { activeOperations: rest };
    }),

  setBaseResume: (resume) => set({ baseResume: resume }),

  jobs: [],
  addJob: (job) => set((s) => ({ jobs: [job, ...s.jobs] })),
  updateJob: (id, updates) =>
    set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...updates } : j)) })),
  deleteJob: (id) => set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) })),

  applications: [],
  addApplication: (application) =>
    set((s) => ({ applications: [application, ...s.applications] })),
  updateApplication: (id, updates) =>
    set((s) => ({
      applications: s.applications.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),
  updateApplicationStatus: (id, status) =>
    set((s) => ({
      applications: s.applications.map((a) => (a.id === id ? { ...a, status } : a)),
    })),
  deleteApplication: (id) =>
    set((s) => ({ applications: s.applications.filter((a) => a.id !== id) })),

  emails: [],
  addEmail: (email) => set((s) => ({ emails: [email, ...s.emails] })),
  updateEmail: (id, updates) =>
    set((s) => ({ emails: s.emails.map((e) => (e.id === id ? { ...e, ...updates } : e)) })),
  deleteEmail: (id) => set((s) => ({ emails: s.emails.filter((e) => e.id !== id) })),

  hydrate: ({ resume, jobs, applications, emails }) =>
    set({ hydrated: true, baseResume: resume, jobs, applications, emails }),
}));
