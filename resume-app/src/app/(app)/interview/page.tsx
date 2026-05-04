"use client";

import { Mic, MessageSquare, Brain, Target, Clock, Construction } from "lucide-react";
import { StatTile } from "@/components/ui/StatTile";

const mockSessions = [
  {
    id: "1",
    type: "Behavioral",
    company: "Stripe",
    role: "Senior Software Engineer",
    duration: "30 min",
    questions: 8,
    status: "ready",
    icon: MessageSquare,
    color: "from-blue-500/30 to-cyan-500/20",
  },
  {
    id: "2",
    type: "System Design",
    company: "Airbnb",
    role: "Staff Engineer",
    duration: "45 min",
    questions: 1,
    status: "ready",
    icon: Brain,
    color: "from-violet-500/30 to-fuchsia-500/20",
  },
  {
    id: "3",
    type: "Technical",
    company: "Vercel",
    role: "Frontend Engineer",
    duration: "60 min",
    questions: 5,
    status: "ready",
    icon: Target,
    color: "from-emerald-500/30 to-teal-500/20",
  },
  {
    id: "4",
    type: "Recruiter Screen",
    company: "Linear",
    role: "Product Engineer",
    duration: "20 min",
    questions: 6,
    status: "ready",
    icon: Mic,
    color: "from-orange-500/30 to-pink-500/20",
  },
];

export default function InterviewPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Mic size={14} className="text-indigo-400" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">
              Interview Prep
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-white">Mock Interview</h1>
          <p className="mt-1 text-sm text-gray-400">
            Practice with AI-led interview sessions tailored to the roles you're targeting.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-1.5 text-xs font-medium text-amber-300">
          <Construction size={13} />
          Coming soon
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Sessions completed" value="0" />
        <StatTile label="Questions answered" value="0" />
        <StatTile label="Avg. confidence" value="—" />
      </div>

      {/* Mock session cards */}
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-gray-200">Suggested sessions</h2>
        <p className="text-xs text-gray-500">{mockSessions.length} mock interviews ready</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {mockSessions.map((session) => {
          const Icon = session.icon;
          return (
            <div
              key={session.id}
              className="group relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 p-5 transition-all hover:border-indigo-600/50"
            >
              <div
                className={`pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${session.color} opacity-60 blur-2xl`}
              />
              <div className="relative flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-700 bg-gray-800/80 text-indigo-400">
                  <Icon size={16} />
                </div>
                <span className="rounded-md border border-gray-700/70 bg-gray-800/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  {session.type}
                </span>
              </div>
              <div className="relative mt-4">
                <h3 className="text-base font-semibold leading-snug text-gray-100">
                  {session.role}
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">{session.company}</p>
              </div>
              <div className="relative mt-4 flex items-center justify-between text-[11px] text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <Clock size={11} />
                  {session.duration}
                </span>
                <span>{session.questions} questions</span>
              </div>
              <button
                disabled
                className="relative mt-4 w-full cursor-not-allowed rounded-lg border border-gray-800 bg-gray-800/50 px-3 py-2 text-xs font-medium text-gray-500"
              >
                Start session
              </button>
            </div>
          );
        })}
      </div>

      {/* Placeholder note */}
      <div className="mt-8 rounded-2xl border border-dashed border-gray-800 bg-gray-900/30 p-6 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/15 text-indigo-400">
          <Mic size={18} />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-gray-200">Live mock interviews are on the way</h3>
        <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-gray-500">
          We're wiring up voice + AI feedback so you can practice answering real interview questions and get
          structured critique on clarity, structure, and depth.
        </p>
      </div>
    </div>
  );
}

